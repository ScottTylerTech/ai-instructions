# Backend Skills

Use backend skills for API behavior, transactions, persistence, and backend feature-flag implementation.

Keep data-layer entities internal to service persistence; expose DTO/client contracts across BBF and frontend boundaries.

## Skills
- unit-testing/SKILL.md: xUnit, Testcontainers, EF Core transactional test patterns.
- compensating-transactions/SKILL.md: distributed transaction rollback design and testing.
- feature-flags/SKILL.md: Harness-backed feature-flag integration with BFF mediation.
- api-contract-changes/SKILL.md: starter checklist for safe API contract evolution.
- migrations/SKILL.md: EF Core migration authoring, review, rollout, and rollback safety.

## Typical Trigger Prompts
- Write tests for this manager query using EF Core and PostgreSQL.
- Review this orchestrator flow for compensating transaction risk.
- Add a new API field without breaking existing clients.
- Create a safe EF Core migration for this DbContext change.
