---
name: Chunk Refetch Per Event
overview: Update Agent Builder streaming behavior so each incoming AI stream event triggers file refetch, with strict per-event calls and no throttling/queueing.
todos:
  - id: inspect-stream-handler
    content: Locate the onEvent flow and insert strict per-event refetchFiles() call
    status: pending
  - id: remove-done-only-refetch
    content: Delete done-only refetch branch usage to prevent duplicate behavior
    status: pending
  - id: validate-no-regression
    content: Verify stream behavior and lint status for useAgentBuilder.ts
    status: pending
isProject: false
---

# Trigger File Refetch On Every Stream Event

## Goal

Ensure the Agent Builder file list is refetched on every incoming AI stream event (strict per-event behavior), instead of only at stream completion.

## Target Code

- [apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)

## Implementation Steps

- Update the `sendCLIMessage(... onEvent)` handler so `refetchFiles()` is called for every incoming stream event before existing event-specific branching (`session`, `opencodeSession`, `tool`, `text`, `thinking`, `error`, `done`).
- Remove the current `refetchFiles()` call limited to the `done` event to avoid duplicate end-of-stream refetch logic.
- Keep existing message-stream behavior unchanged (assistant chunk append, question handling, error/done finalization, session updates).

## Validation

- Send a message in Agent Builder and verify files refetch continuously while events are streaming (not only after `done`).
- Confirm no regressions in:
  - streaming text render
  - question tool flow
  - session/opencode session updates
  - done/error completion behavior
- Run lint diagnostics on the edited file and fix any introduced issues.
