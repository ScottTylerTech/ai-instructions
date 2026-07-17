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

## Review Questions
- Can current clients continue working without code changes?
- Are nullability, defaults, and enum expansion explicitly handled?
- Is there a rollback plan if downstream consumers fail?

## Output Expectation
Return a compatibility assessment, required tests, and a migration plan if a break is unavoidable.
