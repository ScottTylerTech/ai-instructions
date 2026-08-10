---
name: backend-migrations
description: 'Create and review EF Core database migrations for backend services using DbContext and PostgreSQL. Use when adding/changing entities, generating migration files, writing safe Up/Down SQL, planning data backfills, or validating rollout/rollback behavior.'
argument-hint: 'Describe the schema change and service/repository context'
---

# Backend Migrations

Use this skill when implementing database schema changes in backend services with EF Core.

## When to Use
- Adding, renaming, or removing entity properties that map to database columns
- Creating or modifying tables, indexes, constraints, or foreign keys
- Writing data migrations and backfills during schema evolution
- Reviewing migration safety for production rollout and rollback
- Verifying migration naming, ordering, and generated SQL

## Core Principles

### Keep app and schema changes coordinated
- Add migration(s) in the same change set as the code that uses the new schema
- Prefer additive changes first (new nullable column, dual-write/read, then cleanup)
- Avoid breaking deployed code paths in mixed-version rollout windows

### Make migrations explicit and reviewable
- Do not trust generated migration code blindly
- Review `Up` and `Down` methods line-by-line before committing
- Ensure `Down` meaningfully reverses `Up` unless intentionally irreversible (document why)

### DbContext is the source of truth
- For most changes, run migrations in the context of `ApplicationDbContext`
- Update entity mappings and `DbContext` configuration first
- Generate migrations from the correct startup project and target project
- Ensure design-time DbContext creation is deterministic (factory/config)

### Keep data-layer entities behind DTO boundaries
- Treat EF/data entities as internal persistence models, not API contracts.
- If schema/entity changes affect payload shape, coordinate DTO/client-entity updates in BBF/API layers explicitly.
- Keep service-side relationship changes (`DbContext`, navigation properties, projection shape) synchronized with mapping profiles and contract tests.
- Prefer layered adaptation: schema/entity -> service DTO -> BBF/client entity -> frontend models.

## Standard Workflow

1. Update model/entity and `DbContext` mapping.
2. Generate migration with a clear, action-oriented name.
3. Review generated migration code and SQL.
4. Apply migration locally and validate app behavior.
5. If boundary-facing behavior changed, update DTO/client-entity mappings and API contract coverage.
6. Add or update tests that cover schema-dependent and contract-dependent behavior.
7. Confirm rollback path (or document irreversible changes).

## Command Patterns

Run commands from the repository/service root that owns the `DbContext`.

If `dotnet ef` is unavailable in the repo, restore local tools first:

```bash
dotnet tool restore
```

```bash
# Create migration
dotnet ef migrations add AddBudgetPeriodTable --context ApplicationDbContext --project <DataProject> --startup-project <ApiProject>

# Preview SQL for review (recommended)
dotnet ef migrations script --context ApplicationDbContext --project <DataProject> --startup-project <ApiProject>

# Apply locally
dotnet ef database update --context ApplicationDbContext --project <DataProject> --startup-project <ApiProject>

# Roll back one migration (example)
dotnet ef database update <PreviousMigrationName> --context ApplicationDbContext --project <DataProject> --startup-project <ApiProject>
```

## Snapshot-Aware Migration Note

- When adding a new snapshottable table that also needs a new `DatabasePointInTimeConstants` entry, avoid referencing the not-yet-generated migration type too early.
- Safe sequence:
1. Add entity/DbContext mapping.
2. Generate migration.
3. Add/update `DatabasePointInTimeConstants` to reference the generated migration type.
4. Point entity `MigrationPointsInTime` to that new constant.
5. Rebuild and validate.

## Naming Guidelines
- Use verb-first names: `AddX`, `RenameXToY`, `DropX`, `CreateXIndex`
- Keep one intent per migration where practical
- Split risky data movement from structural changes when safer

## Safe Change Patterns

### Add required column safely
1. Add nullable column
2. Backfill data
3. Deploy code that writes the field
4. Enforce non-null constraint in a follow-up migration

### Rename without downtime risk
1. Add new column
2. Dual-write/read in code
3. Backfill old -> new
4. Switch reads to new column
5. Remove old column in later migration

### Large table/index operations
- Prefer online/low-lock strategies where available
- Avoid long-running blocking operations in peak windows
- Coordinate with deployment and operations timing

## Data Migration Guidance
- Keep backfills idempotent when possible
- Use bounded batches for large updates
- Prefer SQL that can be safely retried
- Log assumptions in migration comments for future reviewers

## Review Checklist
- [ ] Migration name clearly describes intent
- [ ] `Up` and `Down` are reviewed and valid
- [ ] Generated SQL inspected for lock/risk profile
- [ ] Backfill logic is deterministic and retry-safe
- [ ] Mixed-version deployment behavior is safe
- [ ] DTO/client-entity boundaries remain intact (no persistence entity leakage)
- [ ] Rollback strategy is defined
- [ ] Tests cover schema-dependent behavior

## What Not to Do
- Do not combine unrelated schema changes into one migration
- Do not ship migrations that were never applied locally
- Do not leave `Down` broken without documenting rationale
- Do not rely on implicit conventions when explicit mapping is clearer
- Do not perform destructive drops in the same release as feature launch unless required
