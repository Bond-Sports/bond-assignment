---
name: Refresh caches on version switch
overview: When the selected agent version changes (user pick or new draft), invalidate React Query caches for agent-settings GETs that are keyed by `version_id`, so tools, workflows, placeholders, scope entities, and related views refetch with the new version. Use a post-commit effect so refetches see updated params.
todos:
  - id: add-invalidate-helper
    content: Add invalidateVersionScopedAgentSettingsCaches(queryClient) with URL-prefix predicate (exclude /v1/agents)
    status: completed
  - id: wire-effect-useVersionDropdown
    content: In useVersionDropdown, useEffect on selected_version_id + AGENT_VERSIONING; ref-guard agent id / initial sync
    status: completed
  - id: verify-behavior
    content: "Manual: switch versions, create draft, switch agent; confirm refetches and no spurious initial burst"
    status: completed
isProject: false
---

# Refresh version-scoped data when the version dropdown changes

## Problem

`[handleSelectChange](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)` only updates Jotai via `setSelectedVersionId`. With `[staleTime: Infinity](apps/operator/src/index.tsx)`, revisiting a version reuses cached list data. Even when the query key changes, you want an explicit **invalidate/refetch** so all active version-scoped views align with the new selection.

**Important implementation detail:** Calling `invalidateQueries` in the same synchronous stack as `setSelectedVersionId` can refetch **before** consumers re-render with the new `version_id` in `params`. Invalidation should run **after commit** (e.g. `useEffect` on `selected_version_id`).

## Approach

### 1. Central helper: predicate-based invalidation

Add a small exported function in operator, e.g. `[apps/operator/src/helpers/invalidateVersionScopedAgentSettingsCaches.ts](apps/operator/src/helpers/invalidateVersionScopedAgentSettingsCaches.ts)` (name can match repo naming), that calls:

`queryClient.invalidateQueries({ predicate: (query) => ... })`

The predicate should treat `query.queryKey[0]` as a string URL (matches `[useDataFetch](libs/api/src/api/react-query.ts)` default keys: `[url, params, ...]`) and return true when it **starts with** any of these agent-settings prefixes (covering subpaths like `/v1/agent-tools/schema`):

- `/v1/agent-tools`
- `/v1/agent-placeholders`
- `/v1/scope-entities`
- `/v1/parameters`
- `/v1/policies`
- `/v1/workflows`
- `/v1/simplified-workflows`
- `/v1/integrations/view`
- `/v1/interaction-state`
- `/v1/interaction-selected-flows`
- `/v1/card-components`
- `/v1/card-templates`

**Exclude** `/v1/agents` and other non–version-scoped agent list endpoints so switching versions does not unnecessarily refetch the agent roster.

Document in a short comment that the list should stay aligned with resources that use `[mergeVersionedListParams](apps/operator/src/helpers/mergeVersionedListParams.ts)` / `[useVersionedListParams](apps/operator/src/hooks/useVersionedListParams.ts)`.

### 2. Trigger invalidation from `[useVersionDropdown.ts](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)`

- Import `useConfigCatFlag` with key `**AGENT_VERSIONING` (same as `[useEffectiveAgentVersion](apps/operator/src/hooks/useEffectiveAgentVersion.ts)`) and skip work when versioning is off.
- Add a `useEffect` that depends on `currentAgent?.selected_version_id` and `queryClient`:
  - Use refs to track **previous** `selected_version_id` and **current agent id**.
  - When `**currentAgent.id` changes**, reset the “previous version” ref so the first resolved version after load does **not trigger a global invalidate (avoids extra burst on initial dashboard load).
  - When versioning is enabled, `selected_version_id` **changes** from a defined previous value to a new non-empty value (or from one id to another), call `invalidateVersionScopedAgentSettingsCaches(queryClient)`.
  - If selection is cleared to empty, optionally skip (nothing to scope); if you later support “no version”, revisit.

This single effect covers:

- User picking a version in the popover (`[handlePickVersion](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)`).
- Programmatic selection changes that are still intentional (e.g. `[handleCreateSubmit](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)` after `setSelectedVersionId(createdVersion.id)`).
- Sync effect moving from an invalid id to a fallback **after** data has stabilized (still desirable to refresh).

### 3. Optional cleanup

If `[VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)` still has a debug `console.log` for `selected_version_id`, remove it while touching the area.

## Verification

- With agent versioning on: switch between two drafts / live; confirm Network tab shows refetches for `/v1/agent-tools` (and other open views) with the new `version_id`.
- Create a new draft: after success, lists reflect the new version without stale data from the prior cache entry.
- Agent switch: first paint for the new agent should not trigger a huge invalidate until the user actually changes version (per ref reset above).

## Relation to earlier selection-sync bug

If the atom’s `selected_version_id` is still sometimes overwritten by the versions sync effect (`[useVersionDropdown.ts` lines 156–181](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)), fix that separately; this plan only ensures **when the version truly changes**, caches refresh.
