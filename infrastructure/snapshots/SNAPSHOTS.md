# Snapshots

## Purpose

Snapshots are the Budget mechanism for capturing and restoring tenant (workspace) data across participating domain services. At a high level:

- A snapshot captures each participating service's tenant-scoped data into service-specific archives.
- A restoration rehydrates that archived data into a target workspace.
- A cross-workspace refresh is a restoration where the source snapshot workspace differs from the target workspace.

This document covers snapshot and restoration only. Provisioning is intentionally out of scope.

## Core Concepts

- Workspace: Tenant context for Budget data.
- Snapshot: A logical snapshot record with per-domain components and completion status.
- Restoration: A logical restore record with per-domain restore components and completion status.
- Data domain service: A participating backend service registered with tenant-management for snapshot/restore operations.
- Snapshottable entity: A table/entity implementing `ISnapshottable` and metadata used by snapshot engines.

## Topology and Ownership

Snapshots are orchestrated by TIN tenant-management and consumed by a separate frontend.

Execution layers:

- API orchestration layer: TIN snapshot endpoints and service-level orchestration.
- Domain component layer: Budget backend services registered as `IDataDomainService` clients.
- Data snapshot layer: Per-service snapshot managers that read/write tenant archives.
- Storage and progress layer: Snapshot stores/archives and event-based progress completion.

## Public API Surface (TIN)

The TIN snapshot controller exposes operations for the current tenant context:

- List snapshots
- Get snapshot
- Create snapshot
- Delete one/all snapshots
- Create restoration from snapshot
- Get one/all restorations for a snapshot

Service-level contracts require:

- Snapshot creation: `Name`, `Creator`
- Snapshot restoration: `SnapshotId`, `Creator`

Both snapshot and restore are asynchronous from the API perspective (`202 Accepted` style flow), with completion tracked via progress events per domain component.

## Orchestration Flow

### 1) Create Snapshot

1. Request hits TIN snapshot API for the current target workspace.
2. Tenant-manager validates tenant context and request payload.
3. Tenant-manager creates a snapshot record in snapshot store with all participating data domain services.
4. Tenant-manager fans out `CreateSnapshot` calls to each registered `IDataDomainService`.
5. Each domain service performs local snapshot creation through its snapshot manager(s).
6. Domain services emit snapshot component completion events.
7. Event handlers aggregate component progress; when complete, overall snapshot status is finalized and notification is emitted.

### 2) Restore Snapshot

1. Request hits TIN snapshot restore API in the target workspace context.
2. Tenant-manager validates tenant context, request payload, snapshot existence, and snapshot restorable state (`IsComplete && Succeeded`).
3. Tenant-manager runs restoration validators.
4. Tenant-manager creates a restoration record and fans out `RestoreSnapshot` to each registered `IDataDomainService`.
5. Each domain service restore action:
   - Deletes existing tenant data for that domain first.
   - Restores archived data for the requested snapshot into the target tenant.
6. Domain services emit restore component completion events.
7. Event handlers aggregate restore progress; when complete, overall restoration status is finalized and notification is emitted.

## Cross-Workspace Refresh

Cross-workspace refresh works by restoring a source `SnapshotId` while operating in a different target workspace context.

High-level behavior:

- The target workspace is determined by request route/context.
- The source snapshot is determined by `SnapshotId` in restoration payload.
- TIN default restoration validator allows cross-workspace restore only when:
  - Source and target workspaces belong to the same organization.
  - Target workspace is non-production.

This is the core safety gate for cross-workspace refreshes.

## Currently Registered Budget Snapshot Domain Services

`budget-tenant-management-svc` currently wires these domain services into tenant-management snapshot orchestration:

- `budget-business-configuration-svc`
- `budget-coa-svc`
- `budget-api`
- `budget-scorecard-svc`
- `budget-config-api`
- `budget-document-svc`
- `budget-cip-svc`

Notes:

- Integration config domain service wiring is present as a TODO and not currently enabled.
- Additional budget services can still participate indirectly by consuming data from these domains.

## Backend Participation Pattern

Each participating backend generally follows this pattern:

- Implements a tenant-management abstraction client (`IDataDomainService`) in its Abstractions project.
- Exposes service-local tenant-management endpoints used by that abstraction.
- Registers snapshot operations and data source snapshot management in startup/service-collection wiring.
- Marks snapshot-managed entities with `ISnapshottable` and associated metadata.

## Entity-Level Snapshot Metadata

For DB-backed services, snapshot behavior is controlled on entities via `ISnapshottable` and related metadata:

### ISnapshottable Interface Requirements

Whenever a new table or foreign key is added or removed, you must mark the entity as `ISnapshottable`. The interface enforces two key properties:

- **Sequence** (required): Integer determining the order in which tables must be restored. Ordering is critical because snapshots are taken and restored **on a table-by-table basis**—foreign key constraints mean restore order matters (parent tables before dependent/child tables).
- **MigrationPointsInTime** (required): A list of migration markers to map snapshot table schemas to a specific DB point-in-time (added post-.NET 10 upgrade; metadata changes don't require migration runs).

### MigrationPointsInTime Structure

Use these points based on table history:

- **Default path (most tables):** Use `StandardPointInTime` and point it to the migration that introduced the table.
- **Schema-break path (when needed):** If a later migration changes the table's core definition (example: primary key shape change), then include both:
  - `InitialPointInTime` -> migration that originally introduced the table
  - `StandardPointInTime` -> migration where the core schema change occurred

Decision rule:

- For a brand new snapshottable entity/table, use only one `StandardPointInTime` tied to the migration that creates the table.
- Do not add `InitialPointInTime` for brand new tables.
- Add `InitialPointInTime` only when the table already existed and later underwent a core schema change that requires historical point-in-time mapping.

Implementation order for EF Core migrations:

- If you introduce a new `DatabasePointInTimeConstants` entry that references the new migration class (for example `EntityFrameworkMigrationDatabasePointInTime.For<AddCapitalPlanDetails>()`), that migration class does not exist yet during `dotnet ef migrations add`.
- To avoid a build-time cycle, first generate the migration, then add/update the constant to reference that generated migration type, and finally point `MigrationPointsInTime` at the new constant.
- Rebuild after this swap to confirm the entity metadata and constants resolve cleanly.

Both point values must reference existing migrations in the service.

Example for a core-schema-change case:

```csharp
public List<ISnapshotTablePointInTime> MigrationPointsInTime => new()
{
    new InitialPointInTime()
    {
        PointInTime = DatabasePointInTimeConstants.PlanningWorkspaceEntities
    },
    new StandardPointInTime()
    {
        PointInTime = DatabasePointInTimeConstants.AddTenantIdToPrimaryKey
    }
};
```

**Example Context** (budget-cip-svc)

- `PlanningWorkspaceEntities` = existing migration name
- `AddTenantIdToPrimaryKey` = existing migration name
- Use migration names from your repo's migration history
- For tables without a core schema break, you should only use `StandardPointInTime`

Required/typical metadata:

- `Sequence`: Integer used for deterministic table export/import ordering.
- `MigrationPointsInTime`: A list of migration point markers used to map snapshot table schemas to a specific DB point-in-time.

Representative usage patterns:

- `budget-api` entities (e.g., `BudgetPlan`) implement `ISnapshottable` with `Sequence` and migration points.
- `budget-coa-svc` entities use sequence values to maintain dependency-safe ordering (for example parent tables before dependent join tables).
- `budget-business-configuration-svc` and `budget-config-api` entities similarly declare migration points tied to service-specific schema milestones.

## Why `MigrationPointsInTime` Matters

`MigrationPointsInTime` is special logic that helps snapshot/restore survive schema evolution.

Conceptually:

- Snapshot archives carry a DB point-in-time marker.
- Restore stages data according to that point-in-time.
- Migration-aware operations reconcile staged data with current schema expectations before transfer into target DB tables.

This is what allows snapshots taken on older migration states to remain restorable after schema changes, assuming point-in-time mappings remain valid.

## Determining Restore Sequence

Why sequence matters: Tenant-specific snapshots are taken and restored **on a table-by-table basis**, not on the whole database. Foreign key constraints mean order matters during restore—child tables must be restored after parent tables.

### Using the SQL Script

**Location:** `budget-dev-env-compose/scripts/DetermineTableRestoreSequence.sql` (in the `budget-dev-env-compose` repo)

**Purpose:** Analyzes foreign key relationships to compute the correct restore order for all tables in your database.

**Steps:**

1. Run the SQL script against your database
2. The script outputs all tables with their assigned **sequence number** (lowest = fewest dependencies, restore first)
3. Set your table's `Sequence` property to the value from the output
4. **Validate all other tables** against the output—new foreign keys you add may shift sequence values for existing tables (important!)

**Running the script via Docker (local dev):**

The budget dev compose exposes a single PostgreSQL instance (service name: `postgres`, host port: `5432`, user: `postgres`, password: `password`). Run the script with `docker compose exec` from the `budget-dev-env-compose` directory. Replace `<db_name>` with the target service database (e.g. `budget`, `budget_coa`, `budget_config`, etc.):

```bash
cd <path-to-budget-dev-env-compose>
docker compose exec -T postgres psql -U postgres -d <db_name> \
  < scripts/DetermineTableRestoreSequence.sql
```

Alternatively, connect directly from the host if `psql` is installed locally:

```bash
psql -h localhost -U postgres -d <db_name> \
  < <path-to-budget-dev-env-compose>/scripts/DetermineTableRestoreSequence.sql
```

`<path-to-budget-dev-env-compose>` is wherever you have cloned the `budget-dev-env-compose` repository locally.

The output lists each table with its computed level/sequence number (lowest level = fewest FK dependencies = restore first).

**Script Logic:**

- Recursively analyzes foreign key relationships to determine dependencies
- Computes dependency level for each table
- Flags circular dependencies
- Output is ordered by level then table name

## Restore Ordering and Data Movement Details

The PostgreSQL snapshot engine:

- Exports and imports tables ordered by table `Sequence`.
- Writes/reads table bulk files using snapshot format markers.
- Uses staging DB flow during restore:
  - Prepare staging DB to snapshot point-in-time.
  - Stage snapshot table data.
  - Apply tenant-id modifier operations.
  - Transfer staged data into target tenant DB.

Ordering guarantees come from metadata (`Sequence`) and table registration.

## Non-Database Snapshot Components

Not all snapshot components are pure DB table copies.

`budget-document-svc` includes object-storage snapshot behavior:

- Captures document objects and metadata from storage.
- Writes document payload and metadata files into snapshot archive working directory.
- Restores documents into target tenant object storage during restore.

This is orchestrated through a custom snapshot manager extending the same base snapshot manager contract.

## Snapshot Coverage in Budget Backends

Based on current source usage of `ISnapshottable`, major DB-backed snapshot entity coverage is in:

- `budget-api`
- `budget-cip-svc`
- `budget-coa-svc`
- `budget-config-api`
- `budget-business-configuration-svc`
- `budget-scorecard-svc`

Several services also include explicit `SnapshotTests` that require maintainers to verify snapshot functionality whenever new snapshottable tables are added.

## Operational Guardrails

- Tenant mismatch checks are enforced in tenant-manager APIs.
- Snapshot restoration is blocked for invalid snapshot state.
- Cross-workspace restore is blocked across organizations and blocked into production targets by default validator logic.
- Snapshot/restore progress is tracked per domain component and then aggregated.

## Testing Snapshots

### When to Test

Whenever you add a new table, you **must** test that snapshots work correctly. A unit test enforces this by requiring your table to be added to the snapshot tables list.

### Environments & URLs

- **Local**: `http://dev.localdev.tcpci.com:5281/tenant-management-svc`
- **CI**: `https://test-budgetdevsandbox.ci.budget.tylerapi.com/tenant-management-svc`

### Testing Procedure

#### 1. Create Initial Data

Add records/data to your new table.

#### 2. Create a Snapshot

**Endpoint:** `{{baseUrl}}/api/v2/Snapshots`

**Request Body:**

```json
{
  "name": "{any string}",
  "creator": "{any string}"
}
```

**Verify:**

- ✅ No errors in tenant management service debug console
- ✅ No errors in your service debug console
- ✅ Save the returned `SnapshotId`

#### 3. Add More Data

Add additional records/data to the table. This data should **NOT** be included in the snapshot.

#### 4. Restore the Snapshot

**Endpoint:** `{{baseUrl}}/api/v2/Snapshots/{SnapshotId}/restorations`

**Request Body:**

```json
{
  "snapshotId": "{SnapshotId}",
  "creator": "{any string}"
}
```

**Verify all of the following:**

- ✅ NO errors in tenant management service debug console
- ✅ NO errors in your service debug console
- ✅ Data created BEFORE the snapshot still exists
- ✅ Data created AFTER the snapshot is gone

#### 5. Delete the Snapshot

**Endpoint:** `{{baseUrl}}/api/v2/Snapshots/{SnapshotId}`

**Request Body:**

```json
{
  "snapshotId": "{SnapshotId}",
  "creator": "{any string}"
}
```

**Verify:**

- ✅ NO errors in tenant management service debug console
- ✅ NO errors in your service debug console

### Quick Testing Reference

| Step | Endpoint                                      | Method | Purpose               |
| ---- | --------------------------------------------- | ------ | --------------------- |
| 1    | Add test data manually                        | —      | Setup                 |
| 2    | `/api/v2/Snapshots`                           | POST   | Create snapshot       |
| 3    | Add more data manually                        | —      | Test boundary         |
| 4    | `/api/v2/Snapshots/{SnapshotId}/restorations` | POST   | Restore from snapshot |
| 5    | `/api/v2/Snapshots/{SnapshotId}`              | DELETE | Clean up              |

## Adding a New Snapshottable Table: Checklist

- [ ] Entity implements `ISnapshottable` interface
- [ ] `Sequence` value determined using SQL script
- [ ] `MigrationPointsInTime` includes both `InitialPointInTime` and `StandardPointInTime`
- [ ] Migration point constants reference existing migrations in your repo
- [ ] Re-run SQL script to validate all other tables' sequence values haven't changed
- [ ] Unit test updated with new table in snapshot tables list
- [ ] Tested snapshot creation locally
- [ ] Tested snapshot restoration (before-data exists, after-data gone)
- [ ] Tested snapshot deletion
- [ ] No errors in any debug consoles during all operations

## Known Boundaries and TODOs

- Provisioning details intentionally omitted here.
- Integration config snapshot/configuration domain wiring is present but currently disabled in budget tenant-management startup wiring.
- Some snapshot behavior is provided by TipeCore/TIN framework packages; Budget services primarily configure and supply metadata/contracts.

## Suggested Follow-Up Refinements

When refining this document, useful additions would be:

- A concrete request/response payload example for create/restore.
- A sequence diagram for cross-workspace refresh.
- A service-by-service table of snapshottable entities and sequence values.
- Environment-specific runtime/store details (for example snapshot repository backing per environment).
