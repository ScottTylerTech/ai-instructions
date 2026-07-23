---
name: forge-components
description: 'Prefer Forge components and Forge Angular services for UI work in Angular. Use when building or refactoring templates, dialogs, menus, forms, loading states, tab navigation, or toolbar layouts so new UI aligns with existing Forge patterns in this codebase.'
argument-hint: 'Describe the UI change and where Forge components should be applied'
---

# Forge Components First (Angular)

Use this skill when implementing or reviewing frontend UI in this repository.

## Core Rule
- Prefer Forge web components and Forge Angular services before introducing custom HTML patterns or new UI libraries.
- If a Forge component exists for the use case, use it.
- Keep UI behavior consistent with existing patterns across the app.

## Existing Project Baseline
- Forge is already a primary UI system in this app (`@tylertech/forge`, `@tylertech/forge-angular`, and `@tylertech/forge-extended-angular`).
- Shared Angular modules already expose Forge (`SharedModule` imports and exports `ForgeModule`).
- The app bootstraps Forge web components in `main.ts` via `define*Component` functions and registers common icons with `IconRegistry`.

## Component Selection Guide
When adding UI, map intent to Forge primitives first:

- Page shell and structure:
  - `forge-scaffold`, `forge-toolbar`, `forge-card`, `forge-divider`
- Primary actions and icon actions:
  - `forge-button`, `forge-icon-button`, `forge-button-toggle-group`, `forge-button-toggle`
- Navigation and pagination:
  - `forge-tab-bar`, `forge-tab`, `forge-paginator`
- Forms:
  - `forge-text-field`, `forge-select`, `forge-option`, `forge-checkbox`, `forge-switch`
- Feedback and state:
  - `forge-inline-message`, `forge-badge`, `forge-skeleton`, `forge-page-state`, Forge toast service
- Menus and popovers:
  - `forge-menu`, `forge-popover`, `forge-tooltip`
- Lists:
  - `forge-list`, `forge-list-item`

## Interaction Patterns To Reuse
- Dialogs:
  - Use `DialogService` and `DialogRef` from `@tylertech/forge-angular` for modal workflows.
  - Configure accessibility attributes (`aria-labelledby`, `aria-describedby`) in dialog options.
- Toasts:
  - Use `ToastService` for user-visible success/failure feedback.
- Menus:
  - Use typed Forge menu models (`IMenuOption`, `IMenuOptionGroup`) and `MenuOptionBuilder` for conditional tooltips/labels.
- Loading:
  - Use skeletons or page-state components driven by observable loading state.

## Accessibility Requirements
- Add clear `aria-label` values to icon-only actions.
- Use Forge tooltip and inline message components to provide contextual guidance.
- Keep keyboard behavior intact with standard Forge controls instead of custom click-only wrappers.
- For modal and dialog UIs, preserve focus behavior and semantic heading/content ids.

## Styling Conventions
- Prefer Forge theme tokens and CSS variables (for example `--forge-theme-*`) over hard-coded colors.
- Style Forge elements through component-scoped styles; avoid global overrides unless required.
- Keep sizing and spacing consistent with existing Forge toolbar/card/page-state patterns.

## Do / Avoid
- Do:
  - Reuse existing Forge-based layout and action patterns from nearby features.
  - Keep Angular templates observable-first and pair Forge UI with existing NgRx/RxJS state flows.
  - Use Forge components before introducing custom equivalents.
- Avoid:
  - Introducing Angular Material, PrimeNG, Bootstrap UI widgets, or ad hoc custom controls for problems Forge already solves.
  - Building custom dialogs/menus/tooltips when Forge services/components already cover the scenario.
  - Mixing competing UI systems in a single workflow unless there is a documented exception.

## Exception Rule
Only skip Forge when all are true:
- Forge does not support the required behavior,
- the fallback is minimal and accessible,
- and the PR explains why Forge could not be used.

Prompt the user first before skipping Forge.  If the user is unsure, ask a teammate or the frontend lead for guidance.

## Authoring Checklist
1. Confirm whether an equivalent Forge component/service exists in the Forge docs.
2. Reuse existing Forge patterns from adjacent modules in this app.
3. Add/keep accessibility attributes, labels, and tooltip/message content.
4. Validate loading, empty, and error states with Forge feedback components.
5. Keep new styles token-based and consistent with current Forge theme usage.

## Reference
- Forge docs: https://forge.tylerdev.io/forge/v3/
