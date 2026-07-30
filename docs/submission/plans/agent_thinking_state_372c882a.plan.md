---
name: Agent Thinking State
overview: Introduce an explicit agent state signal in the chat SSE pipeline so the frontend can reliably distinguish thinking vs answering vs idle, and wire the UI to consume it without breaking existing text/tool/validation behavior.
todos:
  - id: add-sse-agent-state
    content: Add idempotent agent_state emitter in chat route and hook OpenCode transitions.
    status: completed
  - id: align-claude-state
    content: Emit the same thinking/answering/idle state contract in Claude SDK stream path.
    status: completed
  - id: update-types-consumer
    content: Extend stream typings and parse agent_state in app-shell stream handler.
    status: completed
  - id: ui-indicator-wire
    content: Drive UI thinking indicator from explicit agent_state and reset on terminal paths.
    status: completed
  - id: verify-stream-regressions
    content: Run targeted manual checks for state transitions, validation retry flow, and stream completion.
    status: completed
isProject: false
---

# Implement Explicit Agent State Streaming

## Goal

Add a deterministic `agent_state` event (`thinking` | `answering` | `idle`) to the chat stream so the UI no longer infers state from timing or segment presence.

## Files In Scope

- Backend stream producer: `[/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/app/api/sessions/[id]/chat/route.ts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/app/api/sessions/[id]/chat/route.ts)`
- Frontend stream consumer and chat UI state: `[/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/components/app-shell.tsx](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/components/app-shell.tsx)`
- Shared stream typing: `[/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/types.ts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/types.ts)`

## Implementation Plan

1. Add backend state machine in chat SSE route.

- In `start(controller)` scope of the OpenCode branch, introduce local state tracking (`idle` default) and an `emitAgentState(next)` helper.
- Make helper idempotent (emit only on transitions) to prevent event spam.
- Keep existing `thinking` and `text` segment events unchanged; `agent_state` is additive.

1. Wire OpenCode transitions to real stream events.

- On reasoning deltas (`message.part.updated` where part is reasoning): emit `agent_state=thinking` before sending `thinking` segment delta.
- On text deltas: emit `agent_state=answering` before sending `text` segment delta.
- On terminal paths (`done`, timeout-driven done, `session.error`): emit `agent_state=idle` before final event.
- Preserve existing validation retry loop behavior (`session.idle` + `aui dvalidate`) and do not alter retry semantics.

1. Normalize Claude SDK branch to same state contract.

- Emit `agent_state=thinking` at stream start (request accepted, response pending).
- Transition once to `agent_state=answering` on first user-visible content event.
- Emit `agent_state=idle` on `done` or error/stream end.
- Continue forwarding existing Claude events as today; only add state signals.

1. Update stream event typings and frontend parser.

- Extend stream event type union in `[types.ts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/types.ts)` to include `agent_state` payload shape.
- In chat stream parsing in `[app-shell.tsx](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/components/app-shell.tsx)`, handle `agent_state` separately from message segments.
- Store current agent state in local React state (per active stream), reset to `idle` on stream completion/error/abort.

1. Surface state in UI with minimal coupling.

- Use the explicit state to drive the "thinking" indicator/spinner in the assistant area.
- Keep segment rendering (`thinking` text blocks, tool rows, text output) unchanged to avoid regressions in transcript content.

## Validation Plan

- Manual stream lifecycle checks:
  - Send prompt with noticeable reasoning delay: observe `thinking -> answering -> idle` sequence.
  - Prompt that produces only tools or minimal text: ensure state still reaches `idle` and UI unblocks.
  - Validation retry scenario: ensure state remains coherent across retry turn and final completion.
- Regression checks:
  - Existing `done` handling still sets usage metadata.
  - No duplicate/rapid flicker of state when many reasoning deltas arrive.
  - Stream closes cleanly and no request remains pending.

## Risk Controls

- Keep state events additive and backward-compatible (existing `thinking`/`text`/`tool` rendering path remains intact).
- Emit only on transition to prevent noisy SSE and UI flicker.
- Avoid introducing inference from missing events; rely only on explicit stream signals.
