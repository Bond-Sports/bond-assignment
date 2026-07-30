---
name: minimize agent output
overview: Stop exposing internal agent chatter to end users by filtering the main chat stream and keeping only compact status plus final outcomes, while preserving enough failure detail to debug test runs.
todos:
  - id: filter-live-chat-events
    content: Add a visibility filter to the live chat route so internal thinking and most intermediate text are not sent to end users
    status: pending
  - id: sync-poll-event-visibility
    content: Apply the same visibility policy to the poll/events route so background jobs stay consistent with live streaming
    status: pending
  - id: tighten-final-summary
    content: If needed after filtering, add a small prompt-side guardrail to keep the final visible summary terse and professional
    status: pending
  - id: verify-fail-path
    content: Validate that success stays compact and failure remains short but debuggable in both streaming modes
    status: pending
isProject: false
---

# Minimize Main-Agent Output

## Goal

Make the main agent look professional to end users by hiding internal narration during validate/push/test flows. Keep the visible output **minimal but debuggable**:

- no streamed reasoning
- no "I'll help you... / now I'll..." progress chatter
- compact status during test execution
- details only when something fails

## Root Cause

The current backend forwards raw model deltas to the client:

- [`src/app/api/sessions/[id]/chat/route.ts`](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/app/api/sessions/[id]/chat/route.ts) emits `thinking` directly from reasoning deltas and emits every incremental `text` block as user-visible stream output.
- [`src/lib/types.ts`](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/types.ts) already has structured event types like `validation`, `test_progress`, and `test_result`, which are a better surface for customer-visible progress than raw assistant chatter.
- The smoke-test contract itself is already compact: worker ack is one line in [`sandbox-templates/agent-builder-subagents/.opencode/agents/evaluator.md`](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/agents/evaluator.md), and PASS reporting is intentionally short in [`sandbox-templates/agent-builder-subagents/.opencode/skills/validate-and-push/SKILL.md`](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/skills/validate-and-push/SKILL.md).

Essential current behavior to change:

```381:397:src/app/api/sessions/[id]/chat/route.ts
if (event.type === "message.part.updated") {
  const part = props.part;
  if (part?.type === "reasoning" || part?.reasoning) {
    ...
    sendEvent({ type: "thinking", content });
  } else if (part?.type === "text") {
    ...
    sendEvent({ type: "text", content });
  }
}
```

## Plan

### 1. Introduce a visibility filter for chat events

Add a small shared policy/helper that decides which events are customer-visible during agent execution:

- always suppress `thinking`
- suppress most intermediate `text` deltas while the agent is working
- keep structured events like `validation` and any explicit test/progress events
- allow a final assistant summary through at the end
- preserve failure details, but keep them compact and structured

Most likely implementation point:

- [`src/app/api/sessions/[id]/chat/route.ts`](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/app/api/sessions/[id]/chat/route.ts)

If the logic starts to sprawl, extract it into a small shared utility under `src/lib/` so the live and polled paths use the same rules.

### 2. Keep the output style compact and debuggable

For visible execution progress, rely on structured status instead of model prose:

- validation phases -> `validation`
- test execution phases -> compact `test_progress`
- success -> one short final summary
- failure -> one short header plus only the needed failure facts

This aligns with the existing stream model in [`src/lib/types.ts`](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/types.ts) rather than inventing a new transport shape.

### 3. Mirror the same filtering in the poll/events path

Make sure the background/polling path does not still leak raw narration after the live route is fixed:

- [`src/app/api/sessions/poll/[id]/chat/[jobId]/events/route.ts`](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/app/api/sessions/poll/[id]/chat/[jobId]/events/route.ts)
- any shared event parser/helper it relies on

The goal is one visibility policy across both streaming modes.

### 4. Tighten the final user-facing summary format

After filtering, check whether the remaining final assistant text is still too wordy. If it is, add a small prompt-side guardrail in the main chat prompt builders so the final visible answer stays concise without relying on the model to self-regulate during execution:

- [`src/lib/v2-chat-prompt.ts`](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/v2-chat-prompt.ts)
- [`src/lib/v3-chat-prompt.ts`](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/v3-chat-prompt.ts)
- [`src/lib/voa-system-prompt.ts`](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/voa-system-prompt.ts)

This is secondary reinforcement, not the primary fix.

## Validation

After implementation:

1. Reproduce a validate/push/test run and confirm customers no longer see `thinking` or incremental work chatter.
2. Verify they still see compact status and a clear final result.
3. Force a failing validation/test path and confirm the visible failure output is short but still includes the facts needed to debug.
4. Check both the direct chat stream and the poll/events route for consistency.

## Expected Outcome

The agent stops narrating its internal work to customers. Users see only concise progress and a professional final outcome, while operators still retain enough failure detail to diagnose broken runs.
