---
name: simplify stream reducer
overview: Refactor `streamSegments.ts` to make the segment transition logic easier to follow without changing behavior, especially around reasoning timing and finalization.
todos:
  - id: clarify-dispatch-flow
    content: Refactor event dispatch in `streamSegments.ts` to normalize inputs once and use explicit control flow.
    status: completed
  - id: extract-transition-helpers
    content: Centralize reasoning/text segment transition and finalization logic into smaller helpers with narrower parameters.
    status: completed
  - id: preserve-and-verify-behavior
    content: Run the focused Agent Builder tests to confirm the refactor keeps timing and rendering behavior unchanged.
    status: completed
isProject: false
---

# Simplify `streamSegments.ts`

## Goal

Make [apps/operator/src/widgets/AgentBuilder/streamSegments.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/streamSegments.ts) easier to read by reducing branching, narrowing helper responsibilities, and centralizing segment transition logic while preserving the current reasoning timer behavior.

## Refactor Steps

- Normalize event data once in [apps/operator/src/widgets/AgentBuilder/streamSegments.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/streamSegments.ts) inside `applyAgentStreamEventToMessage()`:
  - Resolve `createId` and `now` into a small reducer context object.
  - Normalize `event.content` to a string once before dispatch.
  - Replace the nested ternary dispatch with a `switch` so the control flow is explicit.
- Narrow helper inputs so each function receives only what it actually uses:
  - Change the reasoning helper to accept `content: string` instead of the full event.
  - Keep text and reasoning reducers symmetric so both read like `applyXChunk(segments, content, ctx)`.
- Centralize segment transition logic into small helpers in [apps/operator/src/widgets/AgentBuilder/streamSegments.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/streamSegments.ts):
  - Extract a helper for finalizing a single segment, including `endedAt` handling for reasoning segments.
  - Reuse that helper for both trailing reasoning closure and full-message finalization.
  - Optionally add tiny last-segment utilities only if they reduce repeated array replacement logic without obscuring the flow.
- Keep the public behavior stable:
  - Preserve `mergeStreamingContent()` behavior.
  - Preserve `startedAt` creation timing and `endedAt` assignment semantics.
  - Preserve `ensureMessageFallbackText()` behavior and message `updatedAt` handling.
- Revalidate behavior with the existing focused tests in:
  - [apps/operator/src/widgets/AgentBuilder/streamSegments.test.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/streamSegments.test.ts)
  - [apps/operator/src/widgets/AgentBuilder/partials/AgentReasoningBlock.test.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/partials/AgentReasoningBlock.test.tsx)

## Key Target

The main readability hotspot is the current dispatch and helper mismatch:

```125:139:apps/operator/src/widgets/AgentBuilder/streamSegments.ts
export const applyAgentStreamEventToMessage = (
  message: IAgentBuilderMessage,
  event: TStreamableEvent,
  options: IApplyAgentStreamEventOptions = {}
): IAgentBuilderMessage => {
  const createId = options.createId ?? defaultCreateId;
  const now = options.now ?? Date.now();
  const currentSegments = message.segments ?? [];

  const segments =
    event.type === 'text'
      ? updateTextSegments(currentSegments, typeof event.content === 'string' ? event.content : '', createId, now)
      : event.type === 'thinking'
      ? updateReasoningSegments(currentSegments, event, createId, now)
      : currentSegments;
```

That section should become the clearest part of the file, because it defines the entire reducer flow.

## Guardrails

- Do not change the external API exported by `streamSegments.ts` unless simplification truly requires it.
- Prefer fewer, clearer helpers over a generic abstraction layer.
- Avoid moving logic out of this file unless there is a strong reason; the goal is simpler local reasoning, not broader architecture changes.
