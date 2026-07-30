---
name: align-task-agent-payload
overview: "Make operator task creation and rerun flows follow the same version-scoping rule already used by the rest of the app: when agent versioning is off, do not send version-bound agent payloads; when it is on, send the selected version consistently from one shared place."
todos:
  - id: add-shared-task-agent-payload
    content: Create one shared operator helper/hook that returns a version-aware task agent payload or null based on the existing agent versioning state.
    status: pending
  - id: replace-operator-task-callsites
    content: Update all operator create/rerun task flows to consume the shared payload helper instead of building agent payloads inline.
    status: pending
  - id: verify-scope-and-regression
    content: Confirm the fix is limited to operator task flows, preserves widget behavior, and leaves the existing version-scoped read implementation unchanged.
    status: pending
isProject: false
---

# Align Task Agent Payload

## Goal

Bring operator task flows in line with the existing app pattern:

- list/read endpoints already become non-versioned when `AGENT_VERSIONING` is off
- task create/rerun flows should stop sending `agent_id` in that mode
- widget flow stays unchanged, since it already does not send `agent_id` on task creation

## Current Pattern To Follow

The app already centralizes version-aware behavior through:

- `[apps/operator/src/hooks/useEffectiveAgentVersion.ts](apps/operator/src/hooks/useEffectiveAgentVersion.ts)`
- `[apps/operator/src/hooks/useVersionScopedEditLock.ts](apps/operator/src/hooks/useVersionScopedEditLock.ts)`
- `[apps/operator/src/hooks/useVersionedListParams.ts](apps/operator/src/hooks/useVersionedListParams.ts)`

That pattern is:

- if versioning is enabled, use the selected version id
- if versioning is disabled, omit version-scoped fields and fall back to the normal live/default read path

## Implementation

1. Add one shared operator helper or hook for task agent payload construction.
   Use the same version-resolution source as the rest of the app and return:

- `null` when versioning is off
- `{ agent_id, version_id }` when versioning is on and the current operator flow should remain version-bound

Recommended placement:

- new hook near the existing version helpers, such as `[apps/operator/src/hooks/useTaskAgentPayload.ts](apps/operator/src/hooks/useTaskAgentPayload.ts)`

Recommended behavior:

- read `currentAgent?.id`
- read `isAgentVersioningEnabled` and `selectedVersionId` from the existing version helpers
- return `null` when `isAgentVersioningEnabled === false`
- otherwise return the agent payload expected by `[apps/operator/src/api/request.ts](apps/operator/src/api/request.ts)`

1. Replace repeated inline payload construction with the shared helper.
   Update the operator call sites that currently build this inline object:

- `[apps/operator/src/contexts/MainContext.tsx](apps/operator/src/contexts/MainContext.tsx)`
- `[apps/operator/src/widgets/TaskGeneration/useTaskGeneration.ts](apps/operator/src/widgets/TaskGeneration/useTaskGeneration.ts)`
- `[apps/operator/src/widgets/ConversationMessages/useConversationMessages.ts](apps/operator/src/widgets/ConversationMessages/useConversationMessages.ts)`
- `[apps/operator/src/components/RightSide/useRightSide.ts](apps/operator/src/components/RightSide/useRightSide.ts)`
- `[apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)`

The repeated code being replaced is the current inconsistent pattern:
`agent: { agent_id: currentAgent?.id, version_id: versionIdForQuery }`

1. Keep request typing aligned with the intended contract.
   `[apps/operator/src/api/request.ts](apps/operator/src/api/request.ts)` already supports `agent: TCreateTaskAgentPayload | null`, so this fix should reuse that existing contract instead of inventing a new one.
2. Do not broaden this change into config/agent-settings reads.
   There are other non-versioned read paths in operator, such as config-hub and some agent-context APIs. Those are a separate consistency problem. This fix should stay targeted to task creation and rerun/regenerate payloads so behavior matches the implementation that already exists elsewhere in the app.

## Validation

After implementation, verify these outcomes:

- with `AGENT_VERSIONING` on, operator task create/rerun payloads still include the selected version-bound `agent` payload
- with `AGENT_VERSIONING` off, operator task create/rerun payloads send `agent: null` or omit `agent` entirely according to the endpoint contract, but do not send `agent_id`
- widget task creation remains unchanged
- no operator call site still constructs the inline `agent_id` + `version_id` object directly

## Why This Fix

This fixes the cause, not the symptom:

- today the app disables version-scoped reads when the flag is off
- but task flows still identify the agent, which can bind backend behavior differently from the rest of the UI
- centralizing task agent payload construction removes that drift and keeps future task flows from reintroducing the same bug
