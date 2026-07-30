---
name: hide subagent tool noise
overview: Remove subagent/scenario tool-event noise from the user-visible chat stream, while keeping failure output short and debuggable. This targets the stream layer rather than prompt wording.
todos:
  - id: filter-live-task-events
    content: Hide or sanitize subagent/task tool-event metadata in the live chat stream
    status: pending
  - id: filter-poll-task-events
    content: Apply the same suppression policy to the poll/events path
    status: pending
  - id: compress-visible-failures
    content: Keep customer-visible failures short and debuggable without exposing scenario ids or run ids
    status: pending
  - id: verify-subagent-stream
    content: Validate a `useSubagents=true` smoke-test flow and confirm internal scenario noise is gone
    status: pending
isProject: false
---

# Hide Subagent Tool Noise

## Goal

Stop showing users the internal subagent/task lines such as `agents/... run_id=... scenario=...` while keeping the final failure output short and still useful.

## Root Cause

The remaining noisy output is not normal assistant text.

- `[src/app/api/sessions/[id]/chat/route.ts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/app/api/sessions/[id]/chat/route.ts)` forwards `Task` tool metadata into the stream, including subagent description, prompt header, run id, and scenario id.
- `[src/lib/types.ts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/types.ts)` explicitly supports these fields in `ToolSegment` / `StreamEvent`, so the UI can render them.
- Prompt-only changes cannot suppress these values because they are emitted by the backend, not generated as user-facing prose.

## What I will change

### 1. Filter user-visible `Task` tool metadata in the live chat route

Update `[src/app/api/sessions/[id]/chat/route.ts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/app/api/sessions/[id]/chat/route.ts)` so that when a `Task` tool is used for smoke-test subagents, the stream no longer exposes:

- `subagentPromptHeader`
- `subagentRunId`
- `subagentScenarioId`
- noisy `toolArgs` / prompt-header-derived labels that surface scenario text

Keep only the minimum safe status needed for the UI, or suppress those `Task` tool events entirely if they are purely internal.

### 2. Apply the same visibility rule to the poll/events path

Mirror the same suppression in the async/polling flow so background jobs do not still leak the same subagent/scenario metadata:

- `[src/app/api/sessions/poll/[id]/chat/[jobId]/events/route.ts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/app/api/sessions/poll/[id]/chat/[jobId]/events/route.ts)`
- any parser/helper path it depends on if the filtering belongs there instead of the route layer

The goal is one consistent user-visible policy across both live and polled chat.

### 3. Keep failure output short but debuggable

Do not preserve the current very technical failure surface if it is being shown raw to users. The visible failure should be compressed to:

- one short failure header
- one short reason summary
- no scenario ids or run ids in the customer-facing stream

If detailed scenario data must still exist for operators, keep it in backend artifacts/logs rather than the user stream.

### 4. Verify prompt changes still help, but are no longer the primary control

Leave the existing prompt-side brevity guidance in place, but rely on stream filtering as the real enforcement layer for task/subagent noise.

## Validation

1. Run a `useSubagents=true` flow that triggers the smoke test.
2. Confirm users no longer see:

- `agents/... run_id=... scenario=...`
- scenario payload blocks
- subagent-specific task metadata

1. Confirm a failure still shows a short understandable summary.
2. Confirm both direct chat and poll/events behave the same way.

## Expected Outcome

Users see a clean assistant response instead of internal subagent orchestration details. Failures remain understandable, but the chat no longer exposes scenario plumbing or test runner metadata.
