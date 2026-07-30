---
name: Lock Operator Versioning
overview: Disable operator agent versioning behavior behind the existing `AGENT_VERSIONING` ConfigCat flag so users see the current pre-versioning experience when the flag is off. The plan avoids broad state rewrites and instead gates the central version-scoping layer plus the few remaining direct bypasses.
todos:
  - id: gate-version-hook
    content: Gate `useVersionScopedEditLock` with `AGENT_VERSIONING` and disable effective version-scoped state when the flag is off.
    status: completed
  - id: patch-bypass-consumers
    content: Update raw `selected_version_id` consumers and creation flows to stop sending or creating versioned data when the flag is off, including task creation payloads.
    status: completed
  - id: validate-lockdown
    content: Re-scan operator for remaining version-ID leaks and validate that flag-off behavior matches the current non-versioned experience.
    status: completed
isProject: false
---

# Lock Operator Versioning

## Goal

Make `AGENT_VERSIONING` the effective kill switch for both the UI and the network behavior in `apps/operator`, so hiding the header dropdown also prevents version-scoped reads, writes, and task creation payloads from carrying version IDs.

## What I found

- The header already hides the dropdown via `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/Header/Header.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/Header/Header.tsx)`.
- The shared version-scoping hook still derives `versionIdForQuery` and `agentVersionIdForMutations` directly from `currentAgent.selected_version_id` in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useVersionScopedEditLock.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useVersionScopedEditLock.ts)`.
- A few places bypass that hook and still send version IDs directly from `currentAgent.selected_version_id`, most notably:
  - `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/workflows.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/workflows.ts)`
  - `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useAgentToolOptions.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useAgentToolOptions.ts)`
  - `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useGetCombinedWorkflows.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useGetCombinedWorkflows.ts)`
  - `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx)`
  - `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/TaskGeneration/useTaskGeneration.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/TaskGeneration/useTaskGeneration.ts)`
- The project/agent creation flow also bootstraps versioning directly by calling `createAgentVersion(...)` immediately after `createAgent(...)` in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CreateProjectAndAgentModal/useCreateProjectAndAgentModal.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CreateProjectAndAgentModal/useCreateProjectAndAgentModal.ts)`.

## Implementation approach

### 1. Gate the shared version-scoping contract

Update `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useVersionScopedEditLock.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useVersionScopedEditLock.ts)` to read `useConfigCatFlag('AGENT_VERSIONING')` and make it the source of truth for effective versioning state.

When the flag is off:

- return `versionIdForQuery` as `undefined`
- return `agentVersionIdForMutations` as `undefined`
- return `selectedVersion` as `null`
- return `isSelectedAgentVersionReadOnly` as `false`
- disable `useGetAgentVersions` so the app does not fetch version metadata unnecessarily

This is the highest-leverage fix because many pages already depend on this hook for version-aware requests.

### 2. Patch the raw bypasses

Align the remaining direct consumers with the same flag so they stop sending version identifiers when `AGENT_VERSIONING` is off.

Files to update:

- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/workflows.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/workflows.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useAgentToolOptions.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useAgentToolOptions.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useGetCombinedWorkflows.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useGetCombinedWorkflows.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/TaskGeneration/useTaskGeneration.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/TaskGeneration/useTaskGeneration.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CreateProjectAndAgentModal/useCreateProjectAndAgentModal.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CreateProjectAndAgentModal/useCreateProjectAndAgentModal.ts)`

Behavior target:

- GET and mutation helpers should omit `version_id` / `agent_version_id` entirely when the flag is off.
- Task creation should keep the existing payload shape from `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/request.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/request.ts)`, but pass `agent.version_id: null` when versioning is off instead of forwarding `currentAgent.selected_version_id`.
- New project/agent creation should not call the agent-version creation endpoint when `AGENT_VERSIONING` is off, so newly created agents are not silently bootstrapped into versioned mode while the feature is meant to be hidden.

### 3. Avoid state-layer rewrites unless validation shows they are needed

Do not start by stripping `selected_version_id` from the current-agent atom or changing `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useCurrentAgent.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useCurrentAgent.ts)`.

Reason:

- that would change shared agent state semantics more broadly
- the current issue is behavioral leakage into requests, which can be fixed closer to the request-building layer
- this keeps the change surgical and lowers regression risk

If validation later shows any remaining version-dependent behavior still leaks through state-only reads, then a second pass can normalize the atom; it should not be the first move.

## Validation

After implementation:

- search again for remaining ungated `selected_version_id`, `version_id`, and `agent_version_id` usage in `apps/operator/src`
- verify the header still hides `VersionDropdown` when the flag is off
- verify version-aware pages now behave as unversioned pages when the flag is off
- verify task creation from both `MainContext` and `TaskGeneration` no longer carries a real version ID when the flag is off
- verify project/agent creation no longer auto-creates an initial version when the flag is off
- run narrow validation on touched operator files, then check lints for those files

## Notes

This approach fixes the cause, not the symptom: the app currently treats the header as the only gate, but the actual feature contract leaks through shared hooks and raw request builders. The plan closes those real version-ID emission paths without changing unrelated agent-loading behavior.
