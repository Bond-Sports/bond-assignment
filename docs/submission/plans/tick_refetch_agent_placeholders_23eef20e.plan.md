---
name: Tick Refetch Agent Placeholders
overview: Integrate `schemaSyncTick` with Agent Settings so `/v1/agent-placeholders` is explicitly refetched when agent-driven updates finish, alongside existing workflow refetches.
todos:
  - id: wire-tick-into-useAgentIdentity
    content: Read schemaSyncTick from store inside useAgentIdentity
    status: completed
  - id: stabilize-fetch-agent-placeholders
    content: Wrap fetchAgentPlaceholders in useCallback with proper dependencies
    status: completed
  - id: add-tick-driven-refetch-effect
    content: Add effect to call fetchAgentPlaceholders when schemaSyncTick changes
    status: completed
  - id: keep-existing-load-paths-safe
    content: Preserve current network/category/modal load behavior and avoid double-fetch regressions
    status: completed
  - id: validate-refetch-and-lints
    content: Verify both endpoints refetch and check diagnostics on touched files
    status: completed
isProject: false
---

# Integrate `schemaSyncTick` With Agent Placeholders Refetch

## Goal

When agent file/schema updates complete, refresh both:

- `/v1/simplified-workflows` (already wired)
- `/v1/agent-placeholders` (missing today)

## Root Cause

- `BaseModel` already reacts to `schemaSyncTick` in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/useBaseModel.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/useBaseModel.tsx)`.
- `AgentSettings` data comes from `useAgentIdentity` in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/agent-settings/useAgentIdentity.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/agent-settings/useAgentIdentity.ts)`.
- `useAgentIdentity` loads placeholders through `useGetAgentPlaceholders` (`useMutate` + `mutateAsync`), not through a query subscription. So `queryClient.invalidateQueries(...)` is not the primary trigger for that fetch path.

## Changes

- In `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/agent-settings/useAgentIdentity.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/agent-settings/useAgentIdentity.ts)`:
  - Read `schemaSyncTick` from `useAgentBuilderStore`.
  - Convert `fetchAgentPlaceholders` to `useCallback` so it is safe in effects.
  - Add a dedicated effect that runs on `schemaSyncTick` change and calls `fetchAgentPlaceholders()` with existing scope guards.
  - Keep existing initial-load effect (network/category/create-modal) intact to avoid behavior regressions.
- Keep `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/AgentSettings/AgentSettings.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/AgentSettings/AgentSettings.tsx)` unchanged; the hook-level integration is sufficient.

## Optional Cleanup (same pass)

- In `onSave` success path, prefer explicit `fetchAgentPlaceholders()` call (already in `finally`) over relying on `invalidateQueries` for placeholders, since current list load uses mutation semantics.

## Validation

- Trigger an Agent Builder run that mutates files and completes.
- Confirm network panel shows both requests after completion:
  - `/v1/simplified-workflows`
  - `/v1/agent-placeholders`
- Confirm Agent Settings UI reflects updated prompt placeholders without manual refresh.
- Run diagnostics for touched files and fix only issues introduced by this change.
