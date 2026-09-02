---
name: frontend-feature-flags
description: 'Frontend feature flag usage patterns for Angular and TypeScript. Use when wiring NGRX-backed flag loading, consuming flags in components/services, handling maintenance-mode exceptions, and managing temporary flag conditionals with cleanup TODO comments.'
argument-hint: 'Describe the Angular feature flag flow or component usage to implement or review'
---

# Frontend Feature Flags (Angular + TypeScript)

This skill is frontend-focused. Backend and BFF implementation details are in `skills/backend-feature-flags/SKILL.md`.

## Core rule
- All feature flag evaluations flow through the BFF and shared framework.
- Do not add direct frontend SDK evaluation paths unless explicitly approved.

## App initialization pattern
Feature flags should be loaded at application startup and placed into shared NGRX state.

```typescript
export function initializeAppFactory(
  ...,
  featureFlagsStoreService: FeatureFlagsStoreService
): () => Promise<void> {
  return () => {
    return new Promise((resolve, reject) => {
      ...
      featureFlagsStoreService.loadAllFeatureFlags();
      ...
    });
  };
}

@NgModule({
  imports: [
    ...,
    FeatureFlagsStoreModule,
  ],
  providers: [
    provideAppInitializer(() => {
      const initializerFn = initializeAppFactory(
        ...,
        inject(FeatureFlagsStoreService)
      );
      ...
    }),
  ],
})
export class AppModule {}
```

## Consuming flags in components/services
Prefer store-backed flag streams for standard feature flags. Use direct flag service calls only for approved exceptions (for example, maintenance mode).

```typescript
import { FeatureFlagsStoreService, FeatureFlagService, FeatureFlags } from 'budget-shared-components';

public cmIntegrationFeatureFlag$ = this._featureFlagsStoreService.selectFlag(FeatureFlags.CM_Integration);

public chartManagerMaintenanceModeFlag$ = this._featureFlagService
  .getFlagValue(FeatureFlags.Capital_CompleteCapitalPlan)
  .pipe(shareReplay({ bufferSize: 1, refCount: true }));
```

## Required TODO comments for temporary flags
Every feature-flagged branch must include a removal TODO with ticket reference.

Rules:
- Add TODO on the `if` line for the flag-on path.
- Add TODO on the `else` line (or immediately above it) for the old path.
- Format: `// TODO: <ticket> remove <what to remove>`

```typescript
// TODO: TPB-12345 remove flag conditional and keep flag-on path only
if (featureFlag) {
  // new behavior
} else { // TODO: TPB-12345 remove this else branch
  // old behavior
}
```

## Component-level usage example
```typescript
// TODO: TPB-9336 remove this conditional and keep new menu behavior
if (featureFlag) {
  return new BudgetPlanMenuBuilder(plan.budgetStatus, this.permissionService)
    .withApplyAdjustments()
    ...;
}

// TODO: TPB-9336 remove this legacy branch
return new BudgetPlanMenuBuilder(plan.budgetStatus, this.permissionService)
  .withApplyPositionImport()
  ...;
```

## Review checklist
- Are flags loaded at startup and consumed from shared store where expected?
- Are maintenance-mode exceptions explicit and limited?
- Are temporary branches marked with cleanup TODOs and ticket IDs?
- Does the feature behave correctly in both flag-on and flag-off states?
