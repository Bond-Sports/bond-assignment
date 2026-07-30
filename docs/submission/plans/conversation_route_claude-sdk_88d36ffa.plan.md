---
name: Conversation route claude-sdk
overview: Implement POST /api/sessions/[id]/conversation to create a new conversation for claude-sdk (return a new conversationId) and return "unsupported" for the opencode provider, based on current Claude Agent SDK session semantics.
todos: []
isProject: false
---

# New conversation in existing session (claude-sdk only)

## Current state

- `**[src/app/api/sessions/[id]/conversation/route.ts](src/app/api/sessions/[id]/conversation/route.ts)**`  
  Stub: requires `X-Sandbox-Id`, parses `messages` from body, echoes `{ messages }`. No provider check, no real “new conversation” behavior.
- **Chat flow**
  - **opencode**: Uses OpenCode sessions (`opencodeSessionId`). Creating a “new conversation” would mean a new OpenCode session; you want that to be **unsupported** here.
  - **claude-sdk**: Chat is handled in `[src/app/api/sessions/[id]/chat/route.ts](src/app/api/sessions/[id]/chat/route.ts)` by proxying to the sandbox at `https://${host}/api/constructor/${agentId}/chat/stream` with `agentId`, `message`, `systemPrompt`. The sandbox uses `[@anthropic-ai/claude-agent-sdk](sandbox-templates/agent-builder-claude-sdk/agent/src/agent.ts)` and calls `query({ prompt, options: { cwd, model, ... } })` with **no** `resume` or `forkSession`. So every chat is already a new SDK session (new conversation). There is no server-side notion of “conversation” or “thread” today; the frontend does not yet call the conversation route or use `conversationId`.
- **Claude Agent SDK (docs)**
  - Each `query()` creates a new session unless you pass `options.resume` (session ID).
  - First message can carry `session_id` (e.g. in system init); you can use that for later `resume` or `resume` + `forkSession: true` (new branch).
  - “New conversation” in product terms = either a new `query()` (no resume) or a fork; in both cases the next turn is independent of previous context unless you implement resume.

## Intended behavior

1. **Provider = opencode**
   Return **unsupported**: e.g. `501` or `400` with a clear JSON body such as `{ error: "unsupported", message: "New conversation is not supported for the opencode provider." }`.
2. **Provider = claude-sdk**
   “Create a new conversation” = allocate a new conversation/thread id for the client.

- No need to call the sandbox or the SDK for this: the next `/chat` call is already a new SDK session.
- Return a new id so the client can track threads (e.g. clear messages and associate the next chat with this id).
- Response: e.g. `201` with `{ conversationId: "<uuid>" }` (generate with `crypto.randomUUID()`).

1. **Missing/invalid provider**
   Return `400` with a clear error (e.g. missing or invalid `provider`).

## Request contract

- **Headers**: `X-Sandbox-Id` (required; already used in the stub).
- **Body**:
  - `provider`: `"opencode" | "claude-sdk"` (required for this route).
  - Optional: keep `messages` in the body for future use (e.g. “create conversation with initial messages”); for the minimal implementation they can be ignored.

Session is not stored server-side; the client holds it (Zustand). So the route must receive `provider` in the body (same pattern as the [chat route](src/app/api/sessions/[id]/chat/route.ts), which reads `provider` from the body).

## Implementation summary

| Step | Action                                                                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Require `X-Sandbox-Id` (already present). Parse body: `provider`, optionally `messages`.                                                                               |
| 2    | If `provider === "opencode"`: return unsupported (e.g. `501` and `{ error: "unsupported", message: "New conversation is not supported for the opencode provider." }`). |
| 3    | If `provider !== "claude-sdk"` or missing: return `400` with error indicating invalid/missing `provider`.                                                              |
| 4    | For `provider === "claude-sdk"`: generate `conversationId = crypto.randomUUID()`, return `201` with `{ conversationId }`. No sandbox or SDK call.                      |

No changes to the sandbox or to the chat route are required for this minimal behavior. The frontend can later call this endpoint when the user starts a “new conversation”, store `conversationId`, and optionally send it with the next `/chat` request if you add conversation-scoped behavior later (e.g. resume/fork in the sandbox).

## Optional later enhancement (not in scope)

To get true multi-turn continuity per conversation with the Claude SDK, the sandbox would need to:

- Capture `session_id` from the first system init message in the stream.
- Persist a mapping (conversationId → session_id) in the sandbox.
- Accept optional `conversationId` and `forkSession` on `/api/constructor/:agentId/chat/stream`, and call `query({ prompt, options: { resume: sessionId, forkSession } })` when continuing or forking. The conversation route could then optionally call the sandbox to “create” a conversation (e.g. reserve an id and optionally run an empty or init query to get a session_id). That would be a separate change to the sandbox and chat route.

## Files to change

- `**[src/app/api/sessions/[id]/conversation/route.ts](src/app/api/sessions/[id]/conversation/route.ts)**`  
  Implement the logic above: validate header and body, branch on `provider`, return unsupported for opencode, return `{ conversationId }` for claude-sdk.
