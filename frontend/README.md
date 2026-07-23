# Frontend Skills

Use frontend skills for Angular component behavior, NgRx patterns, RxJS practices, and resilient UI state handling.

## Skills
- forge-components/SKILL.md: prefer Forge components/services for Angular UI implementation and refactors.
- feature-flags/SKILL.md: Angular/TypeScript feature-flag loading and consumption patterns.
- state-management/SKILL.md: NgRx global store and facade conventions.
- observables/SKILL.md: RxJS patterns for selectors, shareReplay, and subscription safety.
- ui-state-resilience/SKILL.md: starter checklist for loading/error/empty/retry states.

## Typical Trigger Prompts
- Build this Angular page with Forge components first; only use custom controls when Forge cannot support the requirement.
- Add a frontend feature flag using the shared BFF-backed pattern and show cleanup TODO comments.
- Build a new NgRx feature slice with actions, effects, reducer, selectors.
- Review this component for RxJS memory leaks.
- Add robust loading and error UX to this async page.
