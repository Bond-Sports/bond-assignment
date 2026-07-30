---
name: reasoning timer
overview: Add a Cursor-style visible thinking duration to Agent Builder reasoning blocks using client-observed stream timing, without changing the backend event contract.
todos:
  - id: model-reasoning-segment
    content: Split reasoning segments into a dedicated typed shape with startedAt and endedAt metadata.
    status: completed
  - id: stream-lifecycle-timing
    content: Capture reasoning start/end times in streamSegments and close reasoning when text resumes or the message finalizes.
    status: completed
  - id: ui-duration-label
    content: Render live and completed duration labels in AgentReasoningBlock using local ticking only while streaming.
    status: completed
  - id: tests-duration-behavior
    content: Add reducer and component tests for timing metadata and displayed duration labels.
    status: completed
isProject: false
---

# Add Reasoning Duration Display

## Goal

Show a user-facing label like `Thinking for 3s` while a reasoning block is streaming, then freeze it as `Thought for 3s` when that reasoning block ends.

## Implementation

- Extend the reasoning segment shape in [apps/operator/src/stores/useAgentBuilderStore.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/stores/useAgentBuilderStore.ts) so reasoning segments carry timing metadata:
  - Add a dedicated reasoning segment type with `startedAt` and optional `endedAt`.
  - Keep text segments unchanged so the timer is attached only where it belongs.
- Update stream segmentation in [apps/operator/src/widgets/AgentBuilder/streamSegments.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/streamSegments.ts):
  - Set `startedAt` when a reasoning segment is first created.
  - Preserve `startedAt` while additional `thinking` chunks append to the same segment.
  - When a `text` event arrives after a reasoning segment, close the open reasoning segment immediately by setting `status: 'done'` and `endedAt: now`.
  - In `finalizeAgentMessageSegments()`, close any still-open reasoning segment so unfinished streams still get a final duration.
- Update [apps/operator/src/widgets/AgentBuilder/partials/AgentReasoningBlock.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/partials/AgentReasoningBlock.tsx) to render duration text from segment timestamps:
  - While `status === 'streaming'`, tick locally once per second and show `Thinking for Xs`.
  - When done, show `Thought for Xs` using `endedAt - startedAt`.
  - Keep the existing collapse/expand behavior and chevron animation intact.
- Add focused test coverage:
  - [apps/operator/src/widgets/AgentBuilder/streamSegments.test.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/streamSegments.test.ts): verify `startedAt`, verify reasoning closes when text begins, and verify finalization fills `endedAt` for still-streaming reasoning.
  - [apps/operator/src/widgets/AgentBuilder/partials/AgentReasoningBlock.test.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/partials/AgentReasoningBlock.test.tsx): verify streaming label, done label, and frozen duration after rerender.

## Notes

- This plan uses client-observed timing because [libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts) does not currently expose reasoning start/end timestamps in `ICLISendMessageEvent`.
- No backend/API contract changes are required for the first version.
