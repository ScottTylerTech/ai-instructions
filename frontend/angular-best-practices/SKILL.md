---
name: angular-best-practices
description: 'Angular template and control-flow best practices for this frontend codebase. Use when migrating deprecated structural directives, applying @if/@for/@switch/@let/@defer, or reviewing Angular 20 template patterns.'
argument-hint: 'Describe the Angular template pattern or migration you want to implement or review'
---

# Angular Best Practices

## When to Use

Activate this skill when the developer:

- Writes or pastes template code using `*ngIf`, `*ngFor`, or `*ngSwitch`
- Asks how to convert structural directives to the new block syntax
- Asks about `@if`, `@for`, `@switch`, `@let`, or `@defer`
- Mentions Angular 20 deprecations or migration
- Requests a review of template code for deprecated patterns
- Asks about `@let` for template-level variable declarations
- Asks how to replace the `*ngIf ... as state` pattern

---

## Background

Angular 20 has **deprecated** the structural directives `*ngIf`, `*ngSwitch`, and `*ngFor` ([angular/angular#60492](https://github.com/angular/angular/pull/60492)). No removal version has been announced yet, but all new template code should use the replacement **control flow blocks**. These blocks read more like native JavaScript control structures and remove the need for `<ng-container>` wrappers in most cases.

---

## Migration Reference

### 1. `*ngFor` → `@for`

**Key change:** `@for` requires a `track` expression (similar to `trackBy` but mandatory and inline).

| Before (deprecated) | After |
|---|---|
| `*ngFor="let item of items; trackBy: trackByFn"` | `@for (item of items; track item.id) { … }` |

#### Example

```html
<!-- OLD -->
<ng-container *ngFor="let role of state.selectedOptions">
  <div>{{ role.name + ' (' + role.id + ')' }}</div>
</ng-container>

<!-- NEW -->
@for (role of selectedOptions; track role.id) {
  <div>{{ role.name + ' (' + role.id + ')' }}</div>
}
```

#### Rules

- Always provide a `track` expression. Prefer a unique identifier (`track item.id`). Use `track $index` only when items have no stable identity.
- `@empty` can follow the `@for` block to handle zero-length collections:

```html
@for (role of selectedOptions; track role.id) {
  <div>{{ role.name }}</div>
} @empty {
  <div>No roles selected.</div>
}
```

> **Docs:** [@for • Angular](https://angular.dev/api/core/@for)

---

### 2. `*ngIf` → `@if`

**Key change:** Looks like a traditional `if` statement. Supports `@else if` and `@else` without needing `<ng-template>` refs.

#### Example

```html
<!-- OLD -->
<div *ngIf="!selectedUser.isActive">
  <forge-inline-message theme="warning" slot="body-header">
    <forge-icon slot="icon" name="info"></forge-icon>
    <p>User is not active in Content Manager.</p>
  </forge-inline-message>
</div>

<!-- NEW -->
@if (!selectedUser.isActive) {
  <forge-inline-message theme="warning" slot="body-header">
    <forge-icon slot="icon" name="info"></forge-icon>
    <p>User is not active in Content Manager.</p>
  </forge-inline-message>
}
```

#### `@else if` / `@else`

```html
@if (status === 'active') {
  <span>Active</span>
} @else if (status === 'pending') {
  <span>Pending</span>
} @else {
  <span>Inactive</span>
}
```

#### Aliasing with `as` (small components)

For subscribing to an observable inline and aliasing the result:

```html
@if (users$ | async; as users) {
  {{ users.length }}
}
```

> **Docs:** [@if • Angular](https://angular.dev/api/core/@if)

---

### 3. `*ngSwitch` → `@switch`

```html
<!-- OLD -->
<div [ngSwitch]="status">
  <span *ngSwitchCase="'active'">Active</span>
  <span *ngSwitchCase="'inactive'">Inactive</span>
  <span *ngSwitchDefault>Unknown</span>
</div>

<!-- NEW -->
@switch (status) {
  @case ('active') { <span>Active</span> }
  @case ('inactive') { <span>Inactive</span> }
  @default { <span>Unknown</span> }
}
```

> **Docs:** [@switch • Angular](https://angular.dev/api/core/@switch)

---

### 4. `*ngIf … as state` (multi-variable hack) → `@let`

The old pattern of faking local template variables via a `*ngIf` object literal is replaced by `@let` declarations.

#### Example

```html
<!-- OLD — object-literal *ngIf hack -->
<ng-container *ngIf="{
    selectedOptions : selectedOptions$ | async,
    hasSelection : (selectedOptions$ | async)?.length > 0,
    editPermissions: permissionService.checkPermission('Permissions.CapitalBudget.Projects.Projects.Edit'),
    selectedUser: contentManagerStore.selectedUser$ | async
} as state">
  <!-- access state.selectedOptions, state.hasSelection, etc. -->
</ng-container>

<!-- NEW — explicit @let declarations -->
@let selectedUser = contentManagerStore.selectedUser$ | async;
@let hasSelection = (selectedOptions$ | async)?.length > 0;
@let editPermissions = permissionService.checkPermission('Permissions.CapitalBudget.Projects.Projects.Edit');
@let selectedOptions = selectedOptions$ | async;
```

#### Benefits

- Each variable is independently typed — no more `state.` prefix.
- No truthiness gotcha: the old `*ngIf` hack hid the template when the object was falsy (it never was, but the intent was unclear). `@let` does not conditionally render.
- Cleaner diffs and easier code review.

> **Docs:** [@let • Angular](https://angular.dev/api/core/@let)

---

### 5. `@defer` (lazy loading blocks)

`@defer` is a new block (no old-syntax equivalent) that enables declarative lazy loading of template sections.

```html
@defer (on viewport) {
  <heavy-component />
} @placeholder {
  <span>Loading…</span>
} @loading (minimum 500ms) {
  <spinner />
} @error {
  <span>Failed to load.</span>
}
```

Use `@defer` when a section of the template is expensive and can be loaded on demand (viewport entry, interaction, idle, timer, etc.).

> **Docs:** [@defer • Angular](https://angular.dev/api/core/@defer)

---

## Conversion Checklist

When migrating a template file, work through this checklist:

1. **`*ngFor`** → `@for` — add a `track` expression to every loop.
2. **`*ngIf`** → `@if` — convert simple conditionals; collapse `*ngIf; else` into `@if / @else`.
3. **`*ngIf="{ … } as state"`** → `@let` declarations — break the object literal into individual `@let` lines.
4. **`*ngSwitch`** → `@switch / @case / @default`.
5. **Remove wrapper `<ng-container>`** elements that only existed to host a structural directive.
6. **Run `ng build` and unit tests** — the compiler will flag any remaining deprecated usages.
7. **Optional:** Add `@empty` blocks to `@for` loops where an empty-state message improves UX.

---

## Team Conventions (Budget & Planning)

| Decision | Convention |
|---|---|
| New code | Must use block syntax (`@if`, `@for`, etc.). Do not introduce new `*ngIf` / `*ngFor`. |
| Existing code | Migrate opportunistically — when you touch a template file for feature work, convert its directives. |
| `track` expression | Prefer `track item.id` (or the entity's natural key). Use `track $index` only when no stable key exists. |
| `@let` vs `@if … as` | Use `@let` for variable declarations. Reserve `@if (obs$ \| async; as value)` for small, single-observable components where the conditional rendering is intentional. |
| `@defer` | Evaluate for large, below-the-fold sections (e.g., audit-log panels, report previews). Discuss in PR review before adding. |

---

## Quick Reference Card

```
@if (cond) { … } @else if (cond2) { … } @else { … }

@for (item of list; track item.id) { … } @empty { … }

@switch (expr) { @case (val) { … } @default { … } }

@let varName = expression;

@defer (on viewport) { … } @placeholder { … } @loading { … } @error { … }
```

---

## Source

[Angular 20 — Budget & Planning Confluence page](https://tylertech.atlassian.net/wiki/spaces/TBP/pages/531899794/Angular+20.)
