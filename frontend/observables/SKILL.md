---
name: rxjs-best-practices
description: 'RxJS best practices for Angular frontends using NgRx. Use when: writing or reviewing component observables, using shareReplay, subscribing to store selectors, managing feature flags, adding takeUntil cleanup, using BehaviorSubject, or deciding between async pipe and manual subscriptions.'
argument-hint: 'Describe the observable pattern or component code to review or write'
---

# RxJS Best Practices — Angular Frontend

---

## 1. Do Not Use `shareReplay` on NgRx Store Selectors

`Store.select()` returns an observable backed by a `BehaviorSubject`. It is already:
- **Hot** — one source, shared across all subscribers
- **Multicasting** — no duplicate work per subscriber
- **Replaying** — new subscribers immediately receive the current state value

Adding `shareReplay(1)` creates a redundant buffer layer on top of something that already provides all of those guarantees.

```typescript
// ❌ BAD — redundant and wasteful
this.capitalPlan$ = this._appStore
  .select(capitalPlanSelectors.selectCapitalPlan)
  .pipe(shareReplay(1));

// ✅ GOOD — store is already hot, multicast, and replays current state
this.capitalPlan$ = this._appStore.select(capitalPlanSelectors.selectCapitalPlan);
```

This applies to every selector-backed property in service facades.

---

## 2. Always Use `refCount: true` When `shareReplay` IS Needed

The default `shareReplay(1)` uses `refCount: false`, which means the internal subscription to the source observable is **never released** — even after all consumers unsubscribe. This causes memory leaks in components.

```typescript
// ❌ BAD — memory leak; source subscription never released
public myFlag$ = this._featureFlagService
  .getFlagValue(FeatureFlags.SomeFlag)
  .pipe(shareReplay(1));

// ✅ GOOD — subscription released when all consumers unsubscribe
public myFlag$ = this._featureFlagService
  .getFlagValue(FeatureFlags.SomeFlag)
  .pipe(shareReplay({ bufferSize: 1, refCount: true }));
```

`shareReplay` is appropriate on cold HTTP observables subscribed to by multiple consumers (e.g., multiple `combineLatest` participants) to avoid duplicate HTTP requests. Always use `refCount: true`.

---

## 3. Centralize Feature Flag Observables — Do Not Recreate Per Component

Do not create individual feature flag observables in each component. Each instantiation triggers a separate HTTP call.

```typescript
// ❌ BAD — recreated in every component; triggers a separate HTTP call each time
public completeCapitalPlanFeatureFlag$: Observable<object> = this._featureFlagService
  .getFlagValue(FeatureFlags.Capital_CompleteCapitalPlan)
  .pipe(shareReplay({ bufferSize: 1, refCount: true }));

// ✅ GOOD — single source of truth, store-backed, no HTTP per component
public completeCapitalPlanFlag$ = this._featureFlagsStoreService
  .selectFlag(FeatureFlags.Capital_CompleteCapitalPlan);
```

Use `FeatureFlagsStoreService.selectFlag()` — it is backed by the NgRx store, fetched once, and shared everywhere.

**Exception:** Permanent maintenance-mode feature flags used to disable parts of the app for clients during maintenance may be handled differently.

---

## 4. `takeUntil` Must Come Before `shareReplay`

Operator order in a `pipe` matters for cleanup. Placing `shareReplay` before `takeUntil` means `shareReplay`'s internal subscription outlives the `takeUntil` signal.

```typescript
// ❌ BAD — shareReplay holds its subscription open after takeUntil fires
this.activeItem$ = this._activeItem.pipe(
  shareReplay(1),
  takeUntil(this._unsubscribe$)
);

// ✅ GOOD — takeUntil terminates the chain; shareReplay is cleaned up with it
this.activeItem$ = this._activeItem.pipe(
  takeUntil(this._unsubscribe$),
  shareReplay({ bufferSize: 1, refCount: true })
);
```

General rule: cleanup operators (`takeUntil`, `take`) should appear **after** operators that hold subscriptions open.

---

## 5. Do Not Use `shareReplay` on `BehaviorSubject`

`BehaviorSubject` already replays its current value to every new subscriber synchronously. Adding `shareReplay` is redundant. Expose it as a plain observable via `.asObservable()`.

```typescript
// ❌ BAD — BehaviorSubject already does this
private _activeItem = new BehaviorSubject<IScoringCriteria>({ id: 0, name: '' });
public activeItem$ = this._activeItem.pipe(shareReplay(1));

// ✅ GOOD — expose as observable directly
public activeItem$ = this._activeItem.asObservable();
```

---

## 6. All Long-Lived Subscriptions Must Have a Termination Strategy

Every `.subscribe()` that is not naturally self-terminating (`take(1)`, `takeWhile`, etc.) must be cleaned up in `ngOnDestroy`.

```typescript
// ❌ BAD — leaks on destroy; debug logging committed to production code
constructor() {
  this.someStream$.pipe(tap(val => console.log(val))).subscribe();
}

// ✅ GOOD — terminates when component is destroyed
public ngOnInit(): void {
  this.someStream$.pipe(
    takeUntil(this._unsubscribe$),
    tap(val => doSomething(val))
  ).subscribe();
}

public ngOnDestroy(): void {
  this._unsubscribe$.next();
  this._unsubscribe$.complete();
}
```

- Use `take(1)` for one-shot reads (e.g., reading current state before dispatching an action, dialog close handlers).
- Use `takeUntil(this._unsubscribe$)` for ongoing subscriptions tied to the component lifecycle.

---

## 7. Prefer the `async` Pipe in Templates Over Manual Subscriptions

When an observable is used purely for display in the HTML template, bind it with the `async` pipe instead of copying its value into component state. Angular subscribes and unsubscribes automatically.

```typescript
// ❌ More code, manual lifecycle management
public ngOnInit(): void {
  this.capitalPlan$.pipe(takeUntil(this._unsubscribe$)).subscribe(plan => {
    this.currentPlan = plan;
  });
}
```

```html
<!-- ✅ Angular handles subscription and cleanup automatically -->
@let plan = capitalPlan$ | async
<div>{{ plan.name }}</div>
```

**Exception:** If the value is transformed or used within `component.ts` (not just displayed), a manual subscription is appropriate.
