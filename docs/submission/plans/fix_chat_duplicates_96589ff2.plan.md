---
name: fix chat duplicates
overview: Investigate and fix the v2 frontend message duplication by stopping repeated history replay, stabilizing callback dependencies, and deduplicating messages at state-ingest time instead of only in the render layer.
todos:
  - id: trace-v2-ingest
    content: Confirm the v2 duplicate path and keep the fix scoped to optimistic send, websocket, and restore ingestion.
    status: completed
  - id: make-state-idempotent
    content: Implement message upsert/dedup in `src/v2/useQuackChat.ts` and make restore replay idempotent per session.
    status: completed
  - id: stabilize-callbacks
    content: Stabilize `handleMessageAdded` and related callbacks so restore effects do not rerun from dependency churn.
    status: completed
  - id: tighten-rendering
    content: Update message list rendering to use stable keys and retain render-level dedupe only as a safeguard.
    status: completed
  - id: verify-chat-scenarios
    content: Validate welcome, user send, escalation, close-chat, and refetch/focus scenarios against the duplicate symptom.
    status: completed
isProject: false
---

# Fix duplicated chat messages

## What I found

The screenshots match the v2 widget, not the legacy chat path, because the rendered strings come from [src/v2/core/parts/StartNewChat.tsx](src/v2/core/parts/StartNewChat.tsx) and [src/v2/core/parts/CSAT.tsx](src/v2/core/parts/CSAT.tsx).

The strongest frontend cause is in the v2 ingest flow:

- [src/v2/hooks/useRestoreChatMessages.ts](src/v2/hooks/useRestoreChatMessages.ts) replays the full `chatMessages` history through `messageHandler` every time its effect runs.
- [src/v2/api/useGetChatMessages.ts](src/v2/api/useGetChatMessages.ts) refetches that history every 10 seconds and on window focus.
- [src/v2/QuackWidget.tsx](src/v2/QuackWidget.tsx) recreates `handleMessageAdded` whenever `notificationCount` changes, which propagates into a new `addMessage` and a new `messageHandler`, retriggering the restore effect even without new history.
- [src/v2/useQuackChat.ts](src/v2/useQuackChat.ts) appends optimistic user messages, websocket messages, and restored messages into the same `messages` array with no upsert/dedup at state level.
- [src/v2/core/parts/message/Messages.tsx](src/v2/core/parts/message/Messages.tsx) only deduplicates at render time by `deduplicationKey`, so if the same logical message arrives with different keys from different sources, duplicate bubbles are rendered.

This matches your observation that the DB is not showing duplicate rows: the frontend can duplicate messages by replaying or merging multiple sources before render.

## Implementation approach

1. Move deduplication to the source of truth in [src/v2/useQuackChat.ts](src/v2/useQuackChat.ts).

Create a single message upsert/merge helper that ingests optimistic, restored, and websocket messages into state by canonical key instead of always appending. The render layer should receive an already-clean message list.

1. Make restore idempotent in [src/v2/hooks/useRestoreChatMessages.ts](src/v2/hooks/useRestoreChatMessages.ts).

Restore history once per session or replay only unseen message keys, instead of replaying the full history array whenever query data or callback identities change.

1. Stabilize callback identities in [src/v2/QuackWidget.tsx](src/v2/QuackWidget.tsx) and [src/v2/useQuackChat.ts](src/v2/useQuackChat.ts).

Remove `notificationCount` from the `handleMessageAdded` closure by using a functional state update, so `onAddMessage` stays stable and does not cause downstream `messageHandler` churn.

1. Reduce render-layer fragility in [src/v2/core/parts/message/Messages.tsx](src/v2/core/parts/message/Messages.tsx).

Use a stable React key such as `message.deduplicationKey` instead of `index`, and keep the render-layer dedupe only as a defensive fallback rather than the primary protection.

## Validation

Verify these cases after the fix:

- initial welcome message renders once
- optimistic user send remains a single message after server acknowledgement
- restore plus websocket does not duplicate existing messages
- refetch on focus or 10 second polling does not add repeated messages
- chat close / CSAT / start-new-chat flow still renders correctly

## Files I expect to change

- [src/v2/useQuackChat.ts](src/v2/useQuackChat.ts)
- [src/v2/hooks/useRestoreChatMessages.ts](src/v2/hooks/useRestoreChatMessages.ts)
- [src/v2/QuackWidget.tsx](src/v2/QuackWidget.tsx)
- [src/v2/core/parts/message/Messages.tsx](src/v2/core/parts/message/Messages.tsx)
