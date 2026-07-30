---
name: Persist Session with Zustand
overview: Create a Zustand persisted store for the agent builder session (mirroring the pattern from the aui-agent-builder-chat diff), then refactor `useAgentBuilderSession.ts` to use it -- enabling session restore across page reloads.
todos:
  - id: create-session-store
    content: Create useSessionStore.ts with Zustand persist middleware, persisting only the session object
    status: completed
  - id: rewire-session-hook
    content: Refactor useAgentBuilderSession.ts to read/write from useSessionStore, add expiry check on mount
    status: completed
isProject: false
---

# Persist Agent Builder Session with Zustand

## Context

The diff provided shows how the standalone `aui-agent-builder-chat` app moved session state into a Zustand `persist` store (`src/stores/session-store.ts`) so the user can reload the page and reconnect to their existing sandbox. The operator app's agent builder calls that same backend via `[chat-api.ts](apps/operator/src/pages/agent-builder/chat-api.ts)`, but currently holds session state in ephemeral `useState` inside `[useAgentBuilderSession.ts](apps/operator/src/pages/agent-builder/useAgentBuilderSession.ts)`. On reload, the session is lost even though the sandbox is still alive.

## What Changes

### 1. NEW: `apps/operator/src/pages/agent-builder/useSessionStore.ts`

Zustand persisted store modelled directly after the diff's `session-store.ts`, adapted for the operator app patterns (tabs indentation, operator `.cursorrules`).

**State** (persisted to `localStorage['agent-builder-session']`):

- `session: Session | null`

**State** (transient, not persisted -- excluded via `partialize`):

- `creating: boolean`
- `creatingSteps: string[]`
- `error: string | null`
- `connected: boolean`
- `exporting: boolean`

**Actions**:

- `setSession(session)` -- stores session, clears error
- `clearSession()` -- nulls session
- `updateOpencodeSessionId(id)` -- patches `session.opencodeSessionId`
- `updateEndAt(endAt)` -- patches `session.endAt`
- `setConnected(v)`, `setCreating(v)`, `addCreatingStep(step)`, `resetCreatingSteps()`, `setError(e)`, `setExporting(v)`
- `isExpired()` -- returns `true` if `Date.now() >= session.endAt`

Only `session` is persisted (via `partialize`); transient UI flags reset on reload.

### 2. MODIFY: `apps/operator/src/pages/agent-builder/useAgentBuilderSession.ts`

Gut the local `useState` calls and replace them with reads/writes to `useSessionStore`. The hook retains:

- The keep-alive `useEffect` (calls `keepAlive()` from `chat-api.ts`, writes `updateEndAt` / `clearSession` to the store)
- `handleCreateSession` (calls `createSession()` from `chat-api.ts`, writes `setSession` / `addCreatingStep` / `setError` to the store)
- `handleExport` (calls `exportProject()` from `chat-api.ts`)
- `handleOpencodeSessionId` (delegates to `store.updateOpencodeSessionId`)
- `fileRefreshTrigger` / `selectedFile` local state (these are UI-only, no persistence needed)
- **New**: on mount, check `isExpired()` -- if the restored session is expired, call `clearSession()`. If it's valid, trigger a keep-alive ping immediately to verify the sandbox is still reachable.

The return shape stays identical so `useAgentBuilder.ts` and `AgentBuilder.tsx` need zero changes.

### 3. NO CHANGES to these files

- `[chat-api.ts](apps/operator/src/pages/agent-builder/chat-api.ts)` -- already sends `X-Sandbox-Id` header, `opencodeSessionId`, and `systemPrompt` (the backend changes from the diff are already deployed)
- `[types.ts](apps/operator/src/pages/agent-builder/types.ts)` -- `Session` already has `endAt: number`
- `[useAgentBuilder.ts](apps/operator/src/pages/agent-builder/useAgentBuilder.ts)` -- same composition
- `[AgentBuilder.tsx](apps/operator/src/pages/agent-builder/AgentBuilder.tsx)` -- same interface
- `[ChatPanel.tsx](apps/operator/src/pages/agent-builder/components/ChatPanel.tsx)` -- already passes `session.opencodeSessionId` to `sendMessage` and calls `onOpencodeSessionId` on `opencodeSession` events
- `[usePanelStore.ts](apps/operator/src/pages/agent-builder/usePanelStore.ts)` -- unrelated

## Persistence Behavior

- On first visit: no session, user creates one
- On reload while sandbox is alive: session is restored from localStorage, keep-alive ping confirms connectivity, user continues where they left off
- On reload after sandbox expired: `isExpired()` returns true, `clearSession()` is called, user sees the empty state
- `opencodeSessionId` is persisted as part of the `Session` object, so the chat stream resumes to the same OpenCode session
