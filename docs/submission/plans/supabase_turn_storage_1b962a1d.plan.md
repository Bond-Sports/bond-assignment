---
name: Supabase turn storage
overview: Fix "Timed out waiting for turn completion" by persisting AUI turn state in Supabase so any serverless instance can read/write turns. Optionally use Supabase Realtime so the client gets completion instantly without relying on polling.
todos: []
isProject: false
---

# Supabase-backed turn storage for AUI agent

## Problem (recap)

Turn state lives in process memory ([lib/aui-turns.ts](lib/aui-turns.ts)). In serverless, the instance that runs `sendRuntimeMessage` and calls `markTurnCompleted` is often different from the instance serving `GET /api/agent/turn/:turnId` and the SSE connection. So the client never sees completion and times out after 120s.

## Approach

- **Persist turns in Supabase** so every instance reads/write the same state.
- **Keep API contracts unchanged**: [app/api/agent/turn/[turnId]/route.ts](app/api/agent/turn/[turnId]/route.ts) still returns the same JSON shape; [hooks/use-aui-builder.ts](hooks/use-aui-builder.ts) polling logic stays as-is.
- **Optional**: Use Supabase Realtime so the client subscribes to turn row updates and can stop polling or use it as fallback.

## 1. Supabase table and server client

**Table `aui_turns**` (create via Supabase SQL Editor or migration):

- `turn_id` (text, PK)
- `runtime_id` (text, not null)
- `mode` (text: `'plan' | 'build'`)
- `message` (text)
- `status` (text: `'queued' | 'running' | 'completed' | 'failed'`)
- `created_at` (timestamptz), `updated_at` (timestamptz)
- `result` (jsonb, nullable)
- `error` (text, nullable)

Add index on `turn_id` (PK is enough). For Realtime (optional): enable replication for `aui_turns` in Supabase Dashboard (Realtime → tables).

**Env (server-only):**

- `SUPABASE_URL` – same project as auth (or dedicated); must be available in API routes.
- `SUPABASE_SERVICE_ROLE_KEY` – server-side only; never expose to client. Used so API routes can insert/update/select without RLS (or use anon + RLS if you prefer).

**Server-side Supabase client:**

- New file: `lib/supabase-server.ts` (or `lib/supabase-admin.ts`).
- `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` only when both env vars are set; export a nullable client so callers can fall back to in-memory when Supabase isn’t configured.

## 2. Turn layer: Supabase-first with in-memory fallback

Refactor [lib/aui-turns.ts](lib/aui-turns.ts):

- Keep `AUIStoredTurn` and the existing function signatures (`createTurn`, `markTurnRunning`, `markTurnCompleted`, `markTurnFailed`, `getTurn`).
- **When server Supabase client is available:**
  - `createTurn`: INSERT into `aui_turns` (status `'queued'`).
  - `markTurnRunning` / `markTurnCompleted` / `markTurnFailed`: UPDATE `aui_turns` set status (and `result` or `error`), `updated_at`.
  - `getTurn`: SELECT by `turn_id`; map row (snake_case) to `AUIStoredTurn` (camelCase) so the rest of the app sees the same shape (e.g. `turn_id` → `turnId`, `runtime_id` → `runtimeId`, `created_at`/`updated_at` → `createdAt`/`updatedAt` as numbers if the API currently uses timestamps).
- **When Supabase is not configured:** use the existing in-memory `Map` so local dev without Supabase still works.
- Use a single place to decide “use Supabase or memory” (e.g. `if (supabaseServer) { ... } else { ... }` in each function).

Important: the GET route returns the object from `getTurn(turnId)`. Ensure the mapped object has `status`, `result`, `error` so the client’s `turn?.status === 'completed' && turn?.result` and `turn?.status === 'failed'` logic still hold.

## 3. API routes

- **[app/api/agent/message/route.ts](app/api/agent/message/route.ts)**  
  No signature change. It already calls `createTurn`, `markTurnRunning`, `markTurnCompleted`, `markTurnFailed` from `@/lib/aui-turns`. Once those functions write/read from Supabase, any instance that handles the POST or the subsequent GET will see the same turn.
- **[app/api/agent/turn/[turnId]/route.ts](app/api/agent/turn/[turnId]/route.ts)**  
  Keep `const turn = getTurn(turnId)` and `return Response.json(turn)`. No change except that `getTurn` now reads from Supabase when configured, so 404 only when the turn truly doesn’t exist.

## 4. Optional: Supabase Realtime for instant completion

- **Client:** In [hooks/use-aui-builder.ts](hooks/use-aui-builder.ts), when `activeTurnId` is set, subscribe to Supabase Realtime for the row (or a channel) keyed by `turnId` (e.g. `channel('aui_turns').on('postgres_changes', { event: 'UPDATE', filter:` turn_id=eq.${activeTurnId} `}, ...)` if using table replication).
- On payload where `status === 'completed'` and `result` present: call `handleTurnCompleted(result)`, clear loading state, add to `finalizedTurnsRef`, and unsubscribe.
- On `status === 'failed'`: show error, clear state, add to `finalizedTurnsRef`, unsubscribe.
- Keep the existing polling in `waitForTurnCompletion` as fallback (e.g. if Realtime doesn’t fire within N seconds) or reduce polling frequency. Alternatively you can rely only on Realtime and remove polling once stable.

Requires: Realtime enabled for `aui_turns` in Supabase; client uses existing `supabase` from [lib/supabase.ts](lib/supabase.ts) (anon key is enough if RLS allows reading the turn row for the current user/session; otherwise you may need a small API that returns a short-lived token or use a channel that the backend publishes to).

## 5. Edge cases and notes

- **Runtime store remains in-memory** ([lib/aui-runtime.ts](lib/aui-runtime.ts)). If the instance that runs the async `sendRuntimeMessage` block doesn’t have that runtime (e.g. runtime started on another instance), you’ll get “AUI runtime not found” before any turn completion. Fixing that would require persisting runtime metadata (e.g. in Supabase) and resolving it in `sendRuntimeMessage`; that’s a separate, larger change. For many deployments (single instance or sticky sessions), turn persistence alone removes the timeout.
- **Idempotency:** `createTurn` should insert only if the turn doesn’t exist (e.g. `INSERT ... ON CONFLICT (turn_id) DO NOTHING` or check before insert) so duplicate POSTs don’t break.
- **TTL/cleanup (optional):** Add a cron or periodic job to delete old rows from `aui_turns` (e.g. `updated_at < now() - interval '1 day'`) to avoid unbounded growth.
- **Tests:** Update or add tests for [lib/aui-turns.ts](lib/aui-turns.ts) so that with a mock Supabase client (or in-memory path) createTurn → markTurnCompleted → getTurn returns the expected shape; and that GET /api/agent/turn/[turnId] returns 404 when turn doesn’t exist and 200 with correct body when it does.

## Summary

| Item                                             | Action                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Supabase                                         | Create `aui_turns` table; set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for API routes.              |
| [lib/supabase-server.ts](lib/supabase-server.ts) | New server-only Supabase client (service role).                                                         |
| [lib/aui-turns.ts](lib/aui-turns.ts)             | Implement create/get/update with Supabase; keep in-memory fallback and same exported types/signatures.  |
| GET /api/agent/turn/[turnId]                     | No change; relies on getTurn() returning same shape.                                                    |
| Client polling                                   | Unchanged; will succeed once getTurn reads from DB.                                                     |
| Realtime (optional)                              | Client subscribes to turn updates; call handleTurnCompleted on status=completed; keep or relax polling. |

This gives you a clear path to implement the fix with Supabase while keeping the current API and client behavior, and leaves runtime persistence and Realtime as optional next steps.
