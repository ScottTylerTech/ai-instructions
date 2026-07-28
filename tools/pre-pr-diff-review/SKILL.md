---
name: pre-pr-diff-review
description: 'Aggressive pre-PR branch diff review checklist for finding flaws, regressions, anti-patterns, and risky changes before opening a pull request. Use when reviewing current branch changes against base branch.'
argument-hint: 'Describe branch context, base branch, and any areas requiring extra scrutiny'
---

# Pre-PR Branch Diff Review

Use this skill to aggressively review the current branch diff before creating a pull request.

## When To Use
- Before opening a PR from a feature branch.
- After large refactors or cross-cutting changes.
- When replacing entity/DTO boundaries or changing API contracts.
- When touching migrations, state management, or authorization logic.

## Review Stance
- Assume changes are unsafe until proven safe by evidence in code.
- Prioritize finding flaws over summarizing what is good.
- Be direct and specific; avoid vague feedback.
- Escalate uncertain areas as explicit risks.

## Required Inputs
- Base branch for comparison (usually `main`, `master`, or `develop`).
- Full current branch diff (`git diff <base>...HEAD`).
- Changed file list (`git diff --name-status <base>...HEAD`).
- If available: related tickets, acceptance criteria, and known constraints.

## Aggressive Diff Checklist

### Correctness And Regressions
- Identify behavior changes that are not covered by tests.
- Flag silent behavior drift (default values, nullability, enum mapping changes, ordering assumptions).
- Check for missing validation and error handling in new paths.
- Verify feature flags preserve existing behavior when disabled.

### Anti-Patterns
- Large methods with mixed responsibilities.
- Hidden side effects in mappers, reducers, and effects.
- Logic duplicated across layers instead of centralized.
- Temporary hacks without cleanup owner or ticket.
- Overly broad exception catches that swallow useful context.

### API And Contract Safety
- Detect contract breaks: renamed/removed fields, changed status codes, incompatible payloads.
- Ensure persistence/data entities are not leaking across API boundaries.
- Verify DTO/client model changes include mapper and contract test updates.

### Data And Persistence Risk
- Unsafe migration steps (destructive changes, irreversible operations, lock-heavy operations).
- Missing rollback plan and mixed-version rollout safety.
- Query shape regressions (N+1, missing filters, unbounded reads, no pagination where needed).

### Frontend State And UX Risk
- State mutation anti-patterns or reducer impurity.
- Effects dispatching imperatively instead of returning actions.
- Missing loading/error/empty state handling.
- Contract-type changes not normalized at API/facade boundary.

### Security And Operational Risk
- Authorization gaps on newly added endpoints.
- Logging sensitive values or introducing insecure defaults.
- Missing idempotency or retry safety for write operations.
- Concurrency hazards and race conditions in async flows.

## Required Output Format
Return findings first, ordered by severity, with concrete evidence.

1. Critical Findings
- Include file path and why it is high risk.
- Explain expected impact if merged.
- Suggest a minimal fix direction.

2. Major Findings
- Same structure as critical findings.

3. Minor Findings
- Style, maintainability, and cleanup issues.

4. Missing Tests
- List specific scenarios that should be added before PR.

5. Open Questions / Assumptions
- List unresolved uncertainty that blocks confidence.

6. Merge Readiness Verdict
- `Not Ready`, `Ready With Fixes`, or `Ready` with brief rationale.

## Quality Bar Before PR
- No unresolved critical findings.
- Contract changes are explicit and tested.
- Data-layer and DTO boundaries are respected.
- Rollback/recovery path exists for risky changes.
- Tests cover new logic and regression paths.
