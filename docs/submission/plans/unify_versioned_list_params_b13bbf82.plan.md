---
name: Unify versioned list params
overview: Replace every direct `mergeVersionedListParams(...)` call with `useVersionedListParams().mergeListParams(scope, extra)` so list/query versioning uses one hook; align `version_id` / query keys with `versionIdForQuery` from that hook where they currently use `useEffectiveAgentVersion` only for merging.
todos:
  - id: entities-workflows
    content: Refactor entities.ts (useGetScopeEntitiesView, useGetScopeEntities) and workflows.ts useGetWorkflowsByScope to use useVersionedListParams.mergeListParams
    status: completed
  - id: agent-identity-workflow-list-onsite
    content: "Refactor useAgentIdentity.ts, useWorkflowList.ts, use-onsite-widget.ts to use mergeListParams; onsite: replace lock with hook if only versionIdForQuery was needed"
    status: completed
  - id: maincontext-taskgeneration
    content: "Refactor MainContext.tsx and useTaskGeneration.ts: mergeListParams + align queryKey/createTask version_id with versionIdForQuery; remove useEffectiveAgentVersion if unused"
    status: completed
  - id: verify-grep-lint
    content: Grep for stray mergeVersionedListParams( and run lint on touched operator files
    status: completed
isProject: false
---

# Unify direct `mergeVersionedListParams` via `useVersionedListParams`

## Goal

All places that today call `[mergeVersionedListParams](apps/operator/src/helpers/mergeVersionedListParams.ts)` directly should instead call `[useVersionedListParams](apps/operator/src/hooks/useVersionedListParams.ts)` once and use `mergeListParams(scopeParams, extra?)`. The pure helper stays as the implementation detail inside `useVersionedListParams` (no need to delete or change it unless you want a lint rule later).

## Behavioral note (intentional)

`mergeListParams` always uses `versionIdForQuery` from `[useVersionScopedEditLock](apps/operator/src/hooks/useVersionScopedEditLock.ts)` (gated by agent versioning), **not** raw `selectedVersionId || undefined` from `[useEffectiveAgentVersion](apps/operator/src/hooks/useEffectiveAgentVersion.ts)`. That removes the small `''` vs `null` edge case and matches the rest of the app that already goes through the hook.

## Files to change (8 call sites in 7 modules)

| File                                                                                                                             | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `[apps/operator/src/api/entities.ts](apps/operator/src/api/entities.ts)`                                                         | In `useGetScopeEntitiesView` and `useGetScopeEntities`: remove `mergeVersionedListParams` + `useVersionScopedEditLock` **only where used for list `versionIdForQuery`**; add `useVersionedListParams`, build params with `mergeListParams(...)`; update `useMemo` deps to depend on `mergeListParams` (or `versionIdForQuery` from the hook). **Leave** `useScopeEntitiesViewMutations` on `useVersionScopedEditLock` for `agent_version_id` mutations. |
| `[apps/operator/src/api/workflows.ts](apps/operator/src/api/workflows.ts)`                                                       | In `useGetWorkflowsByScope`: remove `useEffectiveAgentVersion` / `mergeVersionedListParams`; add `useVersionedListParams`, `params = useMemo(() => mergeListParams(scopeParams), [..., mergeListParams])`.                                                                                                                                                                                                                                              |
| `[apps/operator/src/pages/agent-settings/useAgentIdentity.ts](apps/operator/src/pages/agent-settings/useAgentIdentity.ts)`       | Add `useVersionedListParams`; replace `mergeVersionedListParams(versionIdForQuery, ...)` with `mergeListParams(scopeParams, { page, size, ... })`. Prefer taking `**versionIdForQuery` from `useVersionedListParams`** for query keys / `include_global_scope` branch and **drop `versionIdForQuery` from `useVersionScopedEditLock` destructuring (keep lock for `isSelectedAgentVersionReadOnly` and `agentVersionIdForMutations`).                   |
| `[apps/operator/src/pages/base-model/hooks/useWorkflowList.ts](apps/operator/src/pages/base-model/hooks/useWorkflowList.ts)`     | Add `useVersionedListParams`; replace direct merge in `getPolicyData` with `mergeListParams(livePolicyScope, { names, model_type })`; update `useCallback` deps from `versionIdForQuery` to `mergeListParams` (or `versionIdForQuery` from hook). Remove unused `mergeVersionedListParams` import; optionally stop destructuring `versionIdForQuery` from lock if only used for this merge.                                                             |
| `[apps/operator/src/pages/onsite-widget/use-onsite-widget.ts](apps/operator/src/pages/onsite-widget/use-onsite-widget.ts)`       | Replace `useVersionScopedEditLock` (only used for `versionIdForQuery`) with `useVersionedListParams`; use `mergeListParams` at both policy list sites (~~343 and ~831); use returned `versionIdForQuery` everywhere that hook currently references it (~~374, ~1079).                                                                                                                                                                                   |
| `[apps/operator/src/contexts/MainContext.tsx](apps/operator/src/contexts/MainContext.tsx)`                                       | Add `useVersionedListParams`; replace `mergeVersionedListParams(selectedVersionId                                                                                                                                                                                                                                                                                                                                                                       |     | undefined, ...)`with`mergeListParams(...)`. If `useEffectiveAgentVersion`is only used for this merge + the same`selectedVersionId`in`queryKey`/`createTask` `version_id`, switch those to `**versionIdForQuery`from`useVersionedListParams`** and remove `useEffectiveAgentVersion`. Verify no other `selectedVersionId` usages remain before removing the import. |
| `[apps/operator/src/widgets/TaskGeneration/useTaskGeneration.ts](apps/operator/src/widgets/TaskGeneration/useTaskGeneration.ts)` | Same pattern as `MainContext`: `mergeListParams` for scope-tool params; align `queryKey` and `createTask` `agent.version_id` with `versionIdForQuery` from `useVersionedListParams`; remove `useEffectiveAgentVersion` if redundant.                                                                                                                                                                                                                    |

## Hook / import paths

- From `apps/operator/src/api/*`: import hook as `../hooks/useVersionedListParams` (or existing `@operator/hooks` alias if already used in that file).
- From pages/widgets/contexts: use the same relative or `@operator/hooks/useVersionedListParams` pattern as neighboring files.

## Verification

- Grep: `mergeVersionedListParams(` should only appear in `[mergeVersionedListParams.ts](apps/operator/src/helpers/mergeVersionedListParams.ts)` and `[useVersionedListParams.ts](apps/operator/src/hooks/useVersionedListParams.ts)`.
- Run `nx lint operator` (or the narrowest file list your setup supports) on touched files.
- Smoke: agent settings placeholders list, scope entities dropdowns, workflows/tools list, onsite widget followup policies, main context / task generation parameter list and task creation with a version selected.

## Optional follow-up (out of scope unless you want it)

- Refactor `useVersionedListParams` to call a lighter source than full `useVersionScopedEditLock` if duplicate lock subscriptions in a few components become a concern (React Query usually dedupes the versions request, but hook work runs twice).
