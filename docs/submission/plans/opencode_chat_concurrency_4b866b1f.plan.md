---
name: Opencode Chat Concurrency
overview: OpenCode can target a stored session id for prompts, but its documented event stream is not session-scoped. The fix is to keep using per-conversation OpenCode session ids, filter every event by session id in the BFF, and prevent same-agent filesystem races unless we add workspace isolation later.
todos:
  - id: event-session-extractor
    content: Add shared OpenCode event session-id extraction and filtering for SSE chat events.
    status: completed
  - id: poll-parser-filter
    content: Apply the same filtering to poll-mode OpenCode event parsing.
    status: completed
  - id: same-agent-guard
    content: Add a per-sandbox/per-agent active chat guard for write-capable same-agent chats.
    status: completed
  - id: concurrency-validation
    content: Validate interleaved event filtering and same-agent conflict behavior.
    status: completed
isProject: false
---

# OpenCode Chat Concurrency Plan

## Docs Conclusion

OpenCode supports creating a session with `POST /session` and sending later prompts to that exact session with `POST /session/:id/prompt_async`. So yes, the client can store an OpenCode session id and pass it back.

The missing piece is streaming: official docs list only `GET /event` as the SSE stream, and the open OpenCode issues confirm it broadcasts all events. Issue evidence shows OpenCode itself filters message parts with `event.properties.part.sessionID !== session.id`. There is no documented `GET /session/:id/events` or `/event?sessionID=...` endpoint today.

## Implementation Shape

- Keep creating/reusing `opencodeSessionId` in [`src/app/api/sessions/[id]/chat/route.ts`](src/app/api/sessions/[id]/chat/route.ts), because this is the right way to target the OpenCode conversation.
- Add a small `getOpencodeEventSessionId(event)` helper that checks known OpenCode locations: `properties.sessionID`, `properties.sessionId`, `properties.part.sessionID`, `properties.part.sessionId`, `properties.message.sessionID`, `properties.message.sessionId`, and `properties.info.sessionID`.
- Before forwarding `message.part.updated`, `message.updated`, `session.error`, and any completion/status event, drop the event unless its extracted session id equals `activeSessionId`.
- Apply the same extractor/filter in [`src/lib/v2-chat-events.ts`](src/lib/v2-chat-events.ts), because the poll route has the same global event-stream issue.
- Keep `session.idle` handling as-is structurally, but route it through the same helper so casing/field variations are handled consistently.
- Do not change the frontend state in this repo. The active frontend lives in a separate repo and should own per-tab/per-conversation `opencodeSessionId` storage there.

## Same-Agent Safety

- Event filtering makes two streams stop leaking into each other.
- It does not make two agents safely edit the same files. Same `agentId` still shares `/home/user/project/agents/${agentId}`, `aui diff`, `aui validate`, and eval artifacts.
- For now, add a backend per-`sandboxId:agentId` active-chat guard: allow one write-capable chat at a time for the same agent and return a clear conflict response for the second. True same-agent parallel editing should be a separate workspace-isolation project.

## Validation

- Add focused tests or a small parser-level fixture for two synthetic OpenCode sessions whose `message.part.updated` events are interleaved; assert only matching events are emitted.
- Manually test two tabs with two different app sessions/agents in the same sandbox and confirm text/tool events no longer cross streams.
- Manually test two tabs targeting the same `agentId` and confirm the second chat receives the intended lock/conflict behavior instead of a corrupted mixed stream.
