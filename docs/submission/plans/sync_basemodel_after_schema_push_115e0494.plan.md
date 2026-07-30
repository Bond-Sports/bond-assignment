---
name: Sync BaseModel After Schema Push
overview: Extend the existing chunk-refetch plan so BaseModel also refreshes its workflow/system-prompt state after schema push events emitted by Agent Builder streaming.
todos:
  - id: add-global-sync-signal
    content: Add schema-sync tick state/action to AgentBuilder store
    status: completed
  - id: emit-sync-on-push-success
    content: Trigger sync tick from AgentBuilder stream when pipeline push succeeds
    status: completed
  - id: refresh-basemodel-queries
    content: Refetch BaseModel workflow queries when schema-sync tick changes
    status: completed
  - id: type-stream-pipeline-fields
    content: Update CLI stream event typing for pipeline payload fields
    status: completed
  - id: verify-and-lint
    content: Validate end-to-end behavior and check lints on modified files
    status: completed
isProject: false
---

# Sync BaseModel After Schema Push

## Goal

Make `BaseModel` refresh when Agent Builder pushes schema changes, so updated system prompt/workflow data becomes visible without manual page refresh.

## Root Cause (Fact-based)

- `AgentBuilder` updates its own local stream/message state and file tree, but does not trigger workflow query refresh used by `BaseModel`.
- `BaseModel` derives data from React Query-backed hooks (`useGetWorkflowsByScope`, `useWorkflowConfigs`) and currently refreshes only when its own local actions call refetch.
- Stream payload includes `pipeline` push events, which is the correct synchronization point for schema publish completion.

## Files To Update

- [/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/stores/useAgentBuilderStore.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/stores/useAgentBuilderStore.ts)
- [/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)
- [/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/useBaseModel.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/useBaseModel.tsx)
- [/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts)

## Implementation Plan

- Keep the existing chunk-level file refetch behavior in `AgentBuilder` stream handling.
- Add a small global “schema sync tick” signal in `useAgentBuilderStore` (counter + increment action) to broadcast successful schema push completion.
- In `useAgentBuilder` stream `onEvent`, detect successful publish event (`event.type === 'pipeline'`, `event.step === 'push'`, success signal true) and increment the global schema sync tick.
- Extend `ICLISendMessageEvent` typing with optional pipeline fields (`step`, `success`, and related payload fields) used by runtime events.
- In `useBaseModel`, subscribe to schema sync tick; on change, call both:
  - `refetch` from `useGetWorkflowsByScope` (simplified workflows/system prompt sources)
  - `refetch` from `useWorkflowConfigs` (BE workflow config source)
- Ensure this refresh effect is guarded by mounted/valid network context to avoid unnecessary calls.

## Validation

- Trigger an Agent Builder run that emits successful `pipeline push`.
- Verify `BaseModel` workflow/system prompt UI reflects pushed schema without manual reload.
- Verify no regressions in:
  - Agent Builder stream rendering
  - chunk-level file tree refresh
  - BaseModel dev mode file viewer behavior
- Run lints on touched files and fix introduced issues.
