---
name: api-contract-changes
description: 'Checklist for safe backend API contract evolution. Use when adding or changing request/response fields, status codes, enum values, or endpoint behavior that clients depend on.'
argument-hint: 'Describe the endpoint change and compatibility risk'
---

# API Contract Changes

## When To Use
- Adding new request or response properties.
- Changing enum values or defaults.
- Modifying status codes or error payloads.
- Deprecating or replacing endpoint behavior.

## Safe Change Checklist
- Preserve backward compatibility for existing clients unless a versioned break is approved.
- Prefer additive changes over breaking changes.
- Keep existing status codes stable unless there is a documented migration plan.
- Ensure validation errors remain structured and predictable.
- Update API docs and consumer examples in the same change.
- Add unit and integration tests for both old and new client expectations.

## DTO Boundary Checklist (BBF And Frontend Safety)
- Do not expose service data-layer/EF entities directly to BBF consumers or frontend clients.
- Use DTO/client-entity contracts at the API boundary and map internal entities explicitly.
- When replacing response types (for example, `Period` -> `PeriodDTO`, `Department` -> `DepartmentDTO`), keep field semantics stable or publish a versioned endpoint.
- Update mapping profiles and endpoint/controller wiring in the same change as type swaps.
- Update contract coverage in the same PR: consumer contract tests, pact builders/fixtures, and API response examples.
- For aggregate endpoints that compose data from multiple services, keep join/mapping logic in BBF/controller/application layer, not in frontend state code.

## Review Questions
- Can current clients continue working without code changes?
- Are nullability, defaults, and enum expansion explicitly handled?
- Is there a rollback plan if downstream consumers fail?
- Are any internal persistence/entity types leaking across service boundaries?

## Output Expectation
Return a compatibility assessment, required tests, and a migration plan if a break is unavoidable.
