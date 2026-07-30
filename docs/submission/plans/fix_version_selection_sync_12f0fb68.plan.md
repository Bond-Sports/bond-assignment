---
name: Fix version selection sync
overview: Version picks do update the atom via `setSelectedVersionId`, but a sync `useEffect` in `useVersionDropdown` can immediately overwrite `selected_version_id` when the new id is not yet present in the React Query versions list (common right after creating a draft) or during refetch/empty-list edge cases. Optionally harden `useCurrentAgent` so API-driven agent replacements preserve UI-only `selected_version_id` for the same agent id.
todos:
  - id: sync-effect-guards
    content: "Update useVersionDropdown sync effect: use isFetching, skip fallthrough/empty-list reset while fetch pending when selected id not yet in list"
    status: pending
  - id: merge-agent-selection
    content: In useCurrentAgent, merge selected_version_id from previous atom when applying API agent for same id
    status: pending
  - id: manual-verify
    content: "Manually verify: pick draft, create version then tool save, publish path"
    status: pending
isProject: false
---

# Fix selected version reverting (tools/workflows use wrong version)

## What is actually happening

- `[handlePickVersion](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)` and `[handleSelectChange](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)` correctly call `[useSetSelectedVersionIdAtom](apps/operator/src/atoms/current-agent-atom.ts)`, which patches `currentAgent.selected_version_id` on the Jotai atom.
- Global consumers (`[useEffectiveAgentVersion](apps/operator/src/hooks/useEffectiveAgentVersion.ts)`, `[useVersionScopedEditLock](apps/operator/src/hooks/useVersionScopedEditLock.ts)`, `[useAgentToolOptions](apps/operator/src/hooks/useAgentToolOptions.ts)`, workflow hooks, etc.) all read that same field. There is no separate “dropdown-only” state.

So the symptom (“UI or flow implies one version, mutations/queries use another”) is almost certainly **the atom being reset after a valid user selection**, not `handlePickVersion` failing to run.

## Primary root cause: sync effect vs stale versions list

In `[useVersionDropdown.ts](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)`, the effect at **lines 156–181** runs whenever `sortedVersions` or `currentAgent.selected_version_id` (among other deps) changes. Logic:

1. If `sortedVersions` is empty → `**setSelectedVersionId('')` (clears selection).
2. Else if `currentAgent.selected_version_id` is in the list → keep it (redundant `setSelectedVersionId`).
3. Else → fall through to `**active_version_id`**, then **live published**, then **first version.

**Failure mode (matches “create new version → edit tool still uses old version”):**

- After create, `[handleCreateSubmit](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)` calls `setSelectedVersionId(createdVersion.id)` (line 564).
- The versions query may still expose the **previous** cached list for a render or two (refetch in flight, or invalidate/refetch ordering).
- On that run, `createdVersion.id` is **not** in `availableIds` yet → the effect **falls through** and sets selection to **published/live** (the “old” version for mutations).

**Failure mode (matches “even for existing agents”):**

- Same pattern whenever `selected_version_id` is temporarily missing from the cached list during refetch, or when the list is briefly empty.

`handlePickVersion` is not the bug; the effect **undoes** a valid `setSelectedVersionId` when the list lags.

## Secondary cause: full agent replace drops UI selection

`[useCurrentAgent.ts](apps/operator/src/hooks/useCurrentAgent.ts)` calls `setCurrentAgent(defaultAgent)` / `setCurrentAgent(refreshedAgent)` when `[isSameAgent](apps/operator/src/hooks/useCurrentAgent.ts)` is false. That comparison uses only `id`, `active_version_id`, and `scope.network_id` — **not** `selected_version_id`.

`[IAgentItem](libs/api/src/api/AgentSettings/AgentsApi/types.ts)` marks `selected_version_id` as optional; API payloads may omit it. Replacing the atom object then loses the client-only selection whenever the server object is considered “different” enough to trigger an update.

## Recommended fix (targeted, causal)

### 1. Harden the versions sync effect (main fix)

File: `[apps/operator/src/components/VersionDropdown/useVersionDropdown.ts](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)`

- Destructure `**isFetching` (not only `isLoading`) from `useGetAgentVersions` so we can distinguish “refetching with stale list” from “settled empty”.
- **Guard the fall-through path**: if `currentAgent?.selected_version_id` is truthy and **not** in `availableIds`, **return early while `isFetching`** so the atom keeps the user’s choice until the list catches up. After fetch completes, if the id is still missing (e.g. version removed), keep existing fall-through to `active_version_id` / live / first.
- **Avoid clearing selection on empty list during fetch**: if `!sortedVersions.length` but `isFetching` and we already have a non-empty `selected_version_id`, **return** instead of `setSelectedVersionId('')`. Only clear when the query has settled and there are truly no versions.

This preserves correct behavior for invalid/deleted version ids once data is stable.

### 2. Preserve `selected_version_id` when merging agent from API (defense in depth)

File: `[apps/operator/src/hooks/useCurrentAgent.ts](apps/operator/src/hooks/useCurrentAgent.ts)`

- When assigning `defaultAgent` or `refreshedAgent` for the **same** `id` as `currentAgentRef.current`, merge:  
  `selected_version_id: next.selected_version_id ?? prev?.selected_version_id`  
  so a refresh does not wipe UI selection when the API omits the field.

Skip or simplify for `null` agent / network switch paths where `prev` is already cleared.

## Verification

- Enable agent versioning flag; open an agent with multiple versions.
- Pick a **draft** in the dropdown → confirm network tab or logging shows `version_id` / `agent_version_id` on the next tool/workflow request matches the draft.
- **Create version** → immediately open a tool/workflow editor and save → requests should use the **new** draft id, not live.
- Publish (invalidates `current-agent`) → confirm selection behavior still sane (effect + merge).

No change required to [`VersionDropdown.tsx` lines 87–92`](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx) unless you want a comment pointing to the hook effect (optional).
