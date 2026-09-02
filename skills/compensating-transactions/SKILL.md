--- 
name: compensating-transactions
description: 'Guides developers through designing, implementing, and testing compensating transactions in a distributed microservice architecture (BFF / Orchestrator pattern). Use when: a developer asks how to handle rollback across multiple backend services, is adding a non-read operation to an existing BFF or Orchestrator endpoint that already performs other non-read operations, asks whether a compensating transaction is needed, needs help implementing or unit-testing a compensating transaction, or a PR review surfaces a distributed transaction without rollback logic.'
argument-hint: 'Describe the distributed transaction scenario to review or implement'
---

# Compensating Transactions Skill

## Description
Guide developers through designing, implementing, and testing compensating transactions in a distributed microservice architecture (BFF / Orchestrator pattern). This skill encodes team-agreed patterns, the TipeCore compensating transaction framework, and decision heuristics so the assistant can give accurate, context-aware advice.

## When to Use
- A developer asks how to handle rollback across multiple backend services.
- A developer is adding a non-read operation to an existing BFF or Orchestrator endpoint that already performs other non-read operations.
- A developer asks whether a compensating transaction is needed.
- A developer needs help implementing or unit-testing a compensating transaction.
- A PR review surfaces a distributed transaction without rollback logic.

---

## Key Concepts

### What Are Compensating Transactions?
Compensating transactions are transactions that **revert previous transactions**. If the original transaction created records, the compensating transaction deletes them. If it updated records, the compensating transaction restores the prior state.

### When Are They Needed?
They are required when **multiple non-read operations span two or more different databases** (a distributed transaction) and a partial failure would cause:
- **Data corruption or sync issues** — e.g., parent record updated but child records in another service left stale.
- **Orphaned records** — e.g., records created in Service B that reference a record in Service A that was never committed.

### When Are They NOT Needed?
If partial success does **not** cause data loss, corruption, or orphaned records, a compensating transaction may be unnecessary — or even harmful. 

> **Example:** When a budget plan completes, the plan is updated in `budget-api` and a notification is created in `budget-config-api`. If notification creation fails, rolling back the successful plan update is worse than simply missing the notification, because the plan does not reference the notification.

---

## Decision Workflow

When you encounter a distributed transaction, walk through these steps in order:

### Step 1 — Audit the Endpoint First
Before anything else, when modifying an existing BFF/Orchestrator endpoint:
- Inspect helper methods, services, and classes for existing non-read operations.
- Identify whether those operations touch different databases/services.
- Use that full transaction surface to drive design decisions in the next steps.

### Step 2 — Can You Avoid It?
1. **Same backend?** If multiple calls target the **same** backend service, combine them into a single endpoint. The backend can wrap everything in one DB transaction (all-or-nothing).
2. **No data harm?** If partial success causes no corruption, sync issues, or orphaned records, skip the compensating transaction. Document the rationale.
3. **Event-driven eventually consistent flow?** If the non-read operation publishes an event to a message bus rather than calling a backend directly, this compensating transaction pattern does not apply. Escalate to the team architect to decide on saga/event-sourcing patterns.

### Step 3 — Simplify the Transaction
1. **No loops** — Never perform non-read operations inside a loop from the BFF/Orchestrator. Push batch logic into a single backend endpoint.
2. **Order matters** — Place the most complex or failure-prone operation **last**. Because it runs after all prior writes, its own backend transaction handles its own rollback, and only prior operations need compensating transactions. This assumes the last operation is atomic within its own backend.

### Step 4 — Capture Pre-Transaction State
Before performing any non-read operation, **retrieve the current state** of the data. This ensures you have an accurate snapshot to revert to.

### Step 5 — Implement the Compensating Transaction
1. Use the **TipeCore Compensating Transaction Framework** (see below).
2. If an existing backend endpoint doesn't support the exact revert operation you need, **create a new endpoint**. Don't force-fit an existing one.
3. New revert endpoints should be **idempotent**. Calling them multiple times with the same pre-transaction snapshot must produce the same result without additional data changes. Document this requirement when creating the endpoint.
4. Account for **child entities**:
   - Most relationships use `CascadeDelete`.
   - EF Core crawls reachable entities on `Add()`, `Remove()`, and `Update()` — understand what cascades.
   - For child entities where a single operation may create, update, and delete records (e.g., `AccountSegmentCodes`), the compensating transaction must separately: (1) delete newly created records, (2) restore updated records to pre-transaction values, and (3) re-create deleted records.

---

## TipeCore Compensating Transaction Framework

### Purpose
Provides a structured base for implementing compensating transactions — handles execution flow, error catching, and logging so you focus only on the revert logic.

### Reference
- **Framework README:** https://github.com/tyler-technologies/tipe-core/blob/main/TipeCore.CompensatingTransaction/README.md
- **Shared log messages:** https://github.com/tyler-technologies/tipe-core/blob/main/TipeCore.CompensatingTransaction/CompensatingTransactionLogMessages.cs
- **Framework unit tests:** https://github.com/tyler-technologies/tipe-core/blob/main/TipeCore.Tests/CompensatingTransaction/CompensatingTransactionBaseTests.cs

### How It Works
1. Wrap the distributed transaction steps in the framework.
2. If a downstream call fails, the framework invokes `ExecuteCompensatingTransaction()`.
3. Your implementation of `ExecuteCompensatingTransaction()` calls the appropriate backend endpoints to revert data to its pre-transaction state.
4. The framework handles logging and surfaces `ProblemDetails` with standardized messaging.

If the compensating transaction itself fails, the framework logs the failure and returns `ProblemDetails`. At that point data may be partially reverted. Team decision: surface a clear error response to the caller, trigger alerting/log review, and require manual remediation. Do not attempt to compensate the compensating transaction.

---

## Testing Guide

### Local Dev Testing
1. Run the backend services **outside** their containers (direct process).
2. In the target backend endpoint, add `throw new Exception()` **before** `SaveChangesAsync()` or `transaction.Commit()` to simulate failure.
3. In the BFF/Orchestrator, set a breakpoint on `ExecuteCompensatingTransaction()`.
4. Trigger the flow, inspect the database state **before** the rollback, let it proceed, then verify the database state **after** the rollback matches expectations.

> **Video walkthrough:** https://tylertech-my.sharepoint.com/:v:/p/lindsay_duncan/EWnIBzimlmNJshMUTy_ml_IB52Ix2xApL2zm65BubNYbew

### Unit Testing
Unit tests should verify two things:
1. **The compensating transaction process fires** when an error occurs during the distributed transaction.
2. **Data-massaging logic** inside the compensating transaction is correct.

How to write the tests:
- Return an error status code (e.g., `HttpStatusCode.InternalServerError`) in the `ObjectForResponse` for the failing transaction.
- Assert against the **sent request objects** for the compensating transaction call.
- Verify the returned result contains `ProblemDetails` with the expected message (use shared messages from `CompensatingTransactionLogMessages.cs`).
- Verify the log message unique to the compensating transaction is present. See the test helper: https://github.com/tyler-technologies/tipe-core/blob/47a75523c0cc98d4536228c00e29a4269037e28b/TipeCore.Tests/CompensatingTransaction/CompensatingTransactionTestHelper.cs#L87

> **Note:** The framework itself has comprehensive unit tests, so you only need to test logic unique to your specific compensating transaction implementation.

### Unit Test Examples
- https://github.com/tyler-technologies/budget-cip-orchestrator-svc/pull/70/files
- https://github.com/tyler-technologies/budget-cip-orchestrator-svc/pull/68/files

---

## Real-World Examples

### SaveSuccessfulDataSetImport
**PR:** https://github.com/tyler-technologies/budget-business-api/pull/197

Key takeaways:
- Three backend calls (`SaveProcessLog`, `SaveBudgetaryAmounts`, `UpdateDataSetFileVersion`) were **combined into one endpoint** to reduce the distributed transaction surface.
- Account rollback required both **reverting existing accounts** and **deleting newly created accounts**.
- `AccountSegmentCodes` needed special data massaging — records could be updated, created, or deleted.
- Runs in a background task, so the user doesn't see the rollback directly (a follow-up task updates the process log).

### Two-Transaction Rollback Example
**Branch diff:** https://github.com/tyler-technologies/budget-business-api/compare/main...CompensatingTransaction-Ex

### Additional Implementation Examples
- https://github.com/tyler-technologies/budget-plans/commit/a1827ce0f6939323c822920a6c5bf8c9daafe243
- https://github.com/tyler-technologies/budget-cip-orchestrator-svc/commit/760ca10230d638d9d0a5c0cb0e1363c2128aa443

---

## Team Decisions

| Scenario | Decision |
|---|---|
| Notification creation fails after a main process completes successfully (e.g., budget plan created, proposal submitted/returned/deleted) | **Do NOT roll back** the main process. Instead, show a toast telling the user the notification failed and to refresh the page. This scenario is extremely rare. |

---

## Quick-Reference Checklist

Use this checklist when reviewing or implementing a distributed transaction:

- [ ] Are all non-read calls targeting the **same** backend? → Combine into one endpoint.
- [ ] Does partial failure cause data corruption, sync issues, or orphaned records? → If no, skip rollback.
- [ ] Is the most complex/failure-prone operation ordered **last**?
- [ ] Is pre-transaction state captured **before** any writes?
- [ ] Are **child entities** and cascade behaviors accounted for?
- [ ] Does the compensating transaction restore data to its **exact prior state**?
- [ ] Are there **existing non-read operations** in the endpoint you're modifying?
- [ ] Are unit tests written for the compensating transaction logic?
- [ ] Is the rollback behavior documented for the team?
