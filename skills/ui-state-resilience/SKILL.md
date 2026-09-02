---
name: ui-state-resilience
description: 'Checklist for resilient Angular UI state handling with NgRx and RxJS. Use when implementing async screens, forms, and lists that need loading, error, empty, and retry behavior.'
argument-hint: 'Describe the component or page async flow'
---

# UI State Resilience

## When To Use
- Building new async pages or data grids.
- Refactoring component state management.
- Improving error handling and retry behavior.
- Standardizing loading and empty-state UX.

## Resilience Checklist
- Represent loading, success, error, and empty states explicitly.
- Keep API calls in effects or services, not in presentational components.
- Ensure errors are user-visible and actionable.
- Provide retry paths for transient failures.
- Prevent duplicate in-flight requests where appropriate.
- Keep template bindings observable-first and prefer async pipe.

## Accessibility And UX
- Loading indicators should not block keyboard navigation longer than needed.
- Error messages should be specific and avoid internal-only wording.
- Empty states should tell users what to do next.

## Output Expectation
Return a state diagram summary, required selectors/actions, and concrete UI behaviors for each state.
