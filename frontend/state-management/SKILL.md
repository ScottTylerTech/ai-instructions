---
name: state-management
description: 'NgRx global store and component store patterns for this project. Use when writing or reviewing actions, effects, reducers, selectors, state, facade services, or component stores (ComponentStore). Covers operator selection, entity adapter usage, routing effects, pagination actions, and selector testing conventions.'
argument-hint: 'Describe the NgRx feature, reducer/effect behavior, or selector pattern to implement'
---

# NgRx Patterns

This skill covers the conventions for writing NgRx global store slices and `ComponentStore`-based local stores in this project.

---

## File Structure

Every global store feature lives in `src/app/store/<domain>/<feature>/` and contains:

```
actions.ts
effects.ts
reducer.ts
selectors.ts
state.ts
index.ts                    ← re-exports all of the above
<feature>.service.ts        ← facade service (selectors + dispatch)
<feature>-api.service.ts    ← HTTP calls only, no store knowledge
<feature>-store.module.ts   ← StoreModule.forFeature + EffectsModule.forFeature
tests/
  effects.spec.ts
  reducer.spec.ts
  selectors.spec.ts         ← required for complex selectors
  <feature>.service.spec.ts
  test-data.ts
```

Routing actions/effects always live in `src/app/store/shared/routing/`.

ComponentStore-based local stores are named `<feature>.store.ts` and provided at the component level.

---

## Actions (`actions.ts`)

Use `createActionGroup` to group related actions by source. Separate groups by actor:

```typescript
// Page / UI actions
export const capitalProposalActions = createActionGroup({
  source: 'Capital Proposals',
  events: {
    'Load Capital Proposals By Plan Id': props<{ capitalPlanId: number; pageIndex: number; pageSize: number }>(),
    'Load Capital Proposals By Plan Id Success': props<{ capitalProposals: ICapitalProposalRowData[]; ... }>(),
    'Load Capital Proposals By Plan Id Failure': props<{ failureResponse: IFailureResponse }>(),
    'Delete Capital Proposal': props<{ capitalProposalId: number }>(),
    'Delete Capital Proposal Success': props<{ capitalProposalId: number }>(),
    'Delete Capital Proposal Failure': props<{ failureResponse: IFailureResponse }>(),
  },
});

// API response actions (separate group)
export const capitalProposalAPIActions = createActionGroup({
  source: 'Capital Proposals API',
  events: {
    'Is Proposal Scored Success': props<{ isScored: boolean; documentId: number }>(),
    'Is Proposal Scored Failure': props<{ failureResponse: IFailureResponse }>(),
  },
});

// Page/context actions from another page that affect this slice
export const capitalProposalPlanActions = createActionGroup({
  source: 'Capital Plan Page',
  events: {
    'Delete Capital Proposal From Plan': props<{ capitalProposalId: number }>(),
  },
});
```

**Rules:**
- Use `emptyProps()` for actions with no payload.
- Always include `Success` and `Failure` variants for async operations.
- **Create separate actions for each pagination operation** (sort, page change). Do not combine them into a single generic action. This improves Redux DevTools debuggability.

```typescript
// Good — distinct pagination actions
'Update Sort': props<{ sortColumn: string; sortDirection: string }>(),
'Update Page': props<{ pageIndex: number; pageSize: number }>(),

// Avoid — one generic action
'Update Table Options': props<{ sortColumn?: string; pageIndex?: number }>(),
```

---

## State (`state.ts`)

Define the feature key, interface, entity adapter (if CRUD), and initial state here.

```typescript
import { EntityAdapter, EntityState, createEntityAdapter } from '@ngrx/entity';

export const capitalProposalFeatureKey = 'capital-proposal';

export interface ICapitalProposalState extends EntityState<ICapitalProposalRowData> {
  busyState: BusyState;
  pageIndex: number;
  pageSize: number;
  totalCapitalProposals: number;
}

export const capitalProposalAdapter: EntityAdapter<ICapitalProposalRowData> =
  createEntityAdapter<ICapitalProposalRowData>({
    selectId: (proposal) => proposal.id,
  });

export const initialState: ICapitalProposalState = capitalProposalAdapter.getInitialState({
  busyState: BusyState.UNINITIALIZED,
  pageIndex: 0,
  pageSize: 25,
  totalCapitalProposals: 0,
});
```

---

## Reducer (`reducer.ts`)

Use the entity adapter methods for all CRUD operations. Do not manually splice arrays.

| Operation | Adapter method |
|-----------|---------------|
| Replace all | `adapter.setAll(items, state)` |
| Add one | `adapter.addOne(item, state)` |
| Update one | `adapter.updateOne({ id, changes }, state)` |
| Remove one | `adapter.removeOne(id, state)` |
| Upsert one | `adapter.upsertOne(item, state)` |

```typescript
const capitalProposalReducer = createReducer(
  initialState,

  on(capitalProposalActions.loadCapitalProposalsByPlanIdSuccess,
    (state, { capitalProposals, pageIndex, pageSize, totalCapitalProposals }): ICapitalProposalState =>
      capitalProposalAdapter.setAll(capitalProposals, {
        ...state,
        busyState: BusyState.NONE,
        pageIndex,
        pageSize,
        totalCapitalProposals,
      })
  ),

  on(capitalProposalActions.deleteCapitalProposalSuccess,
    (state, { capitalProposalId }) =>
      capitalProposalAdapter.removeOne(capitalProposalId, {
        ...state,
        totalCapitalProposals: state.totalCapitalProposals - 1,
      })
  ),

  on(capitalProposalFundingSourcesGridActions.addFundingSourcesLine,
    (state): ICapitalProposalFundingSourcesState => {
      const existingLine = capitalProposalFundingSourcesAdapter.getSelectors().selectAll(state)
        .find((line) => line.accountId === state.inputRow.accountId);

      return existingLine
        ? capitalProposalFundingSourcesAdapter.updateOne({ id: existingLine.id, changes: updatedLine }, state)
        : capitalProposalFundingSourcesAdapter.addOne(state.inputRow, state);
    }
  ),
);
```

Set `busyState: BusyState.LOADING` or `BusyState.SAVING` on the initiating action and reset to `BusyState.NONE` on both success and failure.

---

## Selectors (`selectors.ts`)

Expose the entity adapter's selectors through the feature selector:

```typescript
export const selectCapitalProposalState =
  createFeatureSelector<ICapitalProposalState>(capitalProposalFeatureKey);

// Adapter-derived selectors
export const { selectAll: selectCapitalProposals } =
  capitalProposalAdapter.getSelectors(selectCapitalProposalState);

// Scalar state selectors
export const selectPageIndex = createSelector(
  selectCapitalProposalState,
  (state) => state.pageIndex
);

// Derived / complex selectors
export const selectIncludedProposals = createSelector(
  selectCapitalProposals,
  (proposals) => proposals.filter((p) => p.isIncluded)
);
```

**Rule: write a unit test for every complex selector** (one that combines multiple inputs or applies non-trivial logic). Use `.projector(...)` to test selector logic in isolation:

```typescript
// selectors.spec.ts
it('returns sorted and paginated project types', () => {
  const result = selectSortedPagedProjectTypes.projector(
    PROJECT_TYPES, pageSize, pageIndex, sortColumn, sortDirection
  );
  expect(result).toEqual(SORTED_PROJECT_TYPES);
});
```

---

## Effects (`effects.ts`)

### RxJS operator selection guide

| Scenario | Operator | Reason |
|----------|----------|--------|
| Non-parameterized queries (load all) | `exhaustMap` | Ignores subsequent triggers while a request is in flight |
| Parameterized queries (load by ID) | `switchMap` | Cancels in-flight request when a new one arrives |
| Create / update operations | `concatMap` | Queues operations to preserve order |
| Delete operations | `mergeMap` | Allows concurrent deletes |

### Core effect pattern

```typescript
public loadCapitalProposalsByPlanId$ = createEffect(() => {
  return this._actions$.pipe(
    ofType(capitalProposalActions.loadCapitalProposalsByPlanId),
    switchMap(({ capitalPlanId, pageIndex, pageSize }) =>
      this._capitalProposalApiService.getCapitalProposalsByPlanId(capitalPlanId).pipe(
        map((capitalProposals) =>
          capitalProposalActions.loadCapitalProposalsByPlanIdSuccess({
            capitalProposals,
            pageIndex,
            pageSize,
            totalCapitalProposals: capitalProposals.length,
          })
        ),
        catchError(({ error }) =>
          of(capitalProposalActions.loadCapitalProposalsByPlanIdFailure({ failureResponse: { message: error } }))
        )
      )
    )
  );
});
```

### Reading state inside an effect — use `concatLatestFrom`

Import from `@ngrx/operators`. Do **not** inject the `Store` and call `.getValue()` or subscribe inside an effect.

```typescript
import { concatLatestFrom } from '@ngrx/operators';

public loadCapitalPlanOnPageInit$ = createEffect(() => {
  return this._actions$.pipe(
    ofType(capitalPlansActions.capitalPlanPageInit),
    concatLatestFrom(() => [
      this._appStore.select(routingSelectors.selectRoutedCapitalPlanId),
      this._appStore.select(appStateSelectors.selectDoCapitalPlansExist),
    ]),
    filter(([, routedCapitalPlanId, areCapitalPlansLoaded]) => areCapitalPlansLoaded && !!routedCapitalPlanId),
    map(([, routedCapitalPlanId]) =>
      capitalPlansActions.loadCapitalPlan({ capitalPlanId: routedCapitalPlanId })
    )
  );
});
```

### Do NOT dispatch inside an effect to chain actions

Return the next action from the `map` / `switchMap`. Calling `this._appStore.dispatch(...)` inside an effect creates hard-to-trace side chains.

```typescript
// Correct — return action from map
map(() => someOtherActions.doSomething())

// Avoid — dispatch inside effect
tap(() => this._appStore.dispatch(someOtherActions.doSomething()))
```

### One side effect per effect property

Split busy-indicator, toast, and navigation into separate named effects even when they all react to the same action:

```typescript
// Separate effect for the toast
public showToastForDeleteSuccess$ = createEffect(
  () => {
    return this._actions$.pipe(
      ofType(capitalProposalActions.deleteCapitalProposalSuccess),
      tap(() => this._toastService.show('Delete successful.'))
    );
  },
  { dispatch: false }
);

// Separate effect for the navigation
public deleteCapitalProposalSuccess$ = createEffect(() => {
  return this._actions$.pipe(
    ofType(capitalProposalActions.deleteCapitalProposalSuccess),
    map(() => {
      this._dialogService.closeAllDialogs();
      return routingActions.navigateToCapitalPlanFromRoute();
    })
  );
});
```

### Listening for two sequential actions (complex chains)

Use a nested `switchMap` / `take(1)` to wait for a second action after the first fires:

```typescript
public loadProposalsAfterInitAndPlanLoaded$ = createEffect(() => {
  return this._actions$.pipe(
    ofType(
      capitalPlansActions.capitalPlanPageInit,
      capitalPlansAPIActions.completeCapitalPlanSuccess
    ),
    switchMap(() =>
      this._actions$.pipe(
        ofType(capitalPlansAPIActions.loadCapitalPlanSuccess),
        concatLatestFrom(() => [
          this._appStore.select(capitalProposalSelectors.selectPageIndex),
          this._appStore.select(capitalProposalSelectors.selectPageSize),
        ]),
        map(([{ capitalPlan }, pageIndex, pageSize]) =>
          capitalProposalActions.loadCapitalProposalsByPlanId({
            capitalPlanId: capitalPlan.id,
            pageIndex,
            pageSize,
          })
        )
      )
    )
  );
});
```

> Note: `take(1)` or `takeUntil` may be needed inside the inner pipe to prevent the inner observable from accumulating subscriptions across repeated outer emissions.

### Routing effects belong in the global routing slice

All navigation lives in `src/app/store/shared/routing/`:

```typescript
// routing/actions.ts
export const navigateToCapitalPlan = createAction(
  '[Navigation] Navigate to Capital Plan Page',
  props<{ capitalPlanId: number }>()
);

// routing/effects.ts
public navigateToCapitalPlanPageByCapitalPlanId$ = createEffect(
  () => {
    return this._actions$.pipe(
      ofType(routingActions.navigateToCapitalPlan),
      tap(({ capitalPlanId }) => this._router.navigate(['plans', capitalPlanId]))
    );
  },
  { dispatch: false }
);
```

Feature effects dispatch a routing action; the routing effects file performs the actual navigation.

### `After____ActionSuccess` / `After____ActionFailure` observables in facade services

Exposing raw `Actions` observables (`afterLoadSuccess$`, `afterDeleteFailure$`) in facade services or components is discouraged. Prefer creating an effect that performs the behavior (show toast, navigate, close dialog) instead. This keeps side effects predictable and traceable in DevTools.

---

## Facade Service (`<feature>.service.ts`)

The facade wraps store selectors and dispatch calls for consumption by components. It should **not** contain business logic.

```typescript
@Injectable({ providedIn: 'root' })
export class CapitalProposalService {
  public readonly busyState$ = this._appStore
    .select(capitalProposalSelectors.selectBusyState);

  public readonly capitalProposals$ = this._appStore
    .select(capitalProposalSelectors.selectCapitalProposals);

  constructor(private _appStore: Store<ICapitalProposalState>) {}

  public loadCapitalProposals(capitalPlanId: number, pageIndex: number, pageSize: number): void {
    this._appStore.dispatch(
      capitalProposalActions.loadCapitalProposalsByPlanId({ capitalPlanId, pageIndex, pageSize })
    );
  }

  public deleteCapitalProposal(capitalProposalId: number): void {
    this._appStore.dispatch(capitalProposalActions.deleteCapitalProposal({ capitalProposalId }));
  }
}
```

---

## ComponentStore — local / component-scoped state

Use `ComponentStore` when state is purely scoped to a single component tree and does not need to be shared globally. Provide the store at the component level (`providers: [MyStore]`).

```typescript
@Injectable()
export class CompleteCapitalPlanStore extends ComponentStore<ICompleteCapitalPlanState> {
  // Selectors
  public readonly activeProposalTab$ = this.select(({ activeProposalTab }) => activeProposalTab);
  public readonly includedPagination$ = this.select(({ includedPageIndex, includedPageSize }) => ({
    pageIndex: includedPageIndex,
    pageSize: includedPageSize,
  }));

  constructor(private _capitalProposalService: CapitalProposalService) {
    super(initialState);
  }

  // Updaters — synchronous state mutations
  public readonly setActiveTab = this.updater(
    (state, activeProposalTab: number): ICompleteCapitalPlanState => ({ ...state, activeProposalTab })
  );

  // Effects — async operations, use tapResponse for error handling
  private readonly _loadData = this.effect<{ documentId: string; documentType: DocumentType }>(
    pipe(
      switchMap(({ documentId, documentType }) => {
        this.patchState({ busyState: BusyState.LOADING });
        return this._apiService.getData(documentId, documentType).pipe(
          tapResponse(
            (result) => this.patchState({ result, busyState: BusyState.NONE }),
            () => this.patchState({ busyState: BusyState.NONE })
          )
        );
      })
    )
  );

  public loadData(documentId: string, documentType: DocumentType): void {
    this._loadData({ documentId, documentType });
  }
}
```

- Use `tapResponse` (from `@ngrx/operators`) instead of `catchError` inside `ComponentStore` effects.
- Use `patchState` for partial updates; use `setState` only when replacing the full state.
- Private effects (not intended to be called from outside) use the `_` prefix.
- Expose a public method that calls the private effect, keeping the effect invocation internal.

---

## `index.ts`

Re-export everything so consumers import from the folder path, not individual files:

```typescript
export * from './actions';
export * from './effects';
export * from './reducer';
export * from './selectors';
export * from './state';
```

---

## Quick-reference checklist

When adding a new store feature:

- [ ] `actions.ts` — `createActionGroup` per actor (Page, API, etc.); separate pagination sort/page actions
- [ ] `state.ts` — feature key, interface, adapter (if CRUD), `initialState`
- [ ] `reducer.ts` — use adapter CRUD methods; track `busyState`
- [ ] `selectors.ts` — feature selector + adapter selectors + derived selectors
- [ ] `effects.ts` — correct RxJS operator per operation type; `concatLatestFrom` for state reads; routing actions dispatched not navigated directly; one side-effect per `createEffect`; no `dispatch` inside effects
- [ ] `<feature>.service.ts` — dispatch wrappers; no `After___Success$` observables
- [ ] `tests/selectors.spec.ts` — `.projector(...)` tests for every complex selector
- [ ] Routing navigation → `store/shared/routing/`
