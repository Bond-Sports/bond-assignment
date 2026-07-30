---
name: Fix session timer origin
overview: Use the E2B sandbox's actual `endAt` timestamp from `sandbox.getInfo()` to drive the countdown timer and expiry check, instead of local timestamps that reset on reconnect.
todos:
  - id: add-endAt-to-session
    content: Add `endAt` field to Session type and populate it from sandbox.getInfo() in createSession
    status: completed
  - id: update-store-and-timer
    content: Update Zustand store isExpired and app-shell countdown to use session.endAt, remove savedAt
    status: completed
isProject: false
---

# Fix session timer to use sandbox endAt

Both `createdAt` and `savedAt` reset to `Date.now()` on every reconnect, so the timer restarts incorrectly. The E2B SDK provides the real sandbox expiration via `sandbox.getInfo()` which returns `startedAt` and `endAt` as `Date` objects. We use `endAt` directly as the source of truth.

## 1. Add `endAt` to the Session type

**File:** [src/lib/types.ts](src/lib/types.ts)

Add `endAt: number` (epoch ms) to the `Session` interface:

```typescript
export interface Session {
  id: string;
  sandboxId: string;
  opencodeSessionId: string;
  opencodeBaseUrl: string;
  status: "creating" | "ready" | "error" | "destroyed";
  createdAt: number;
  endAt: number;
  systemPrompt?: string;
}
```

## 2. Populate `endAt` from sandbox in createSession

**File:** [src/lib/session-manager.ts](src/lib/session-manager.ts)

After the sandbox is created or reconnected (right before setting `session.status = "ready"`), call `sandbox.getInfo()` to get the real expiration:

```typescript
const info = await sandbox.getInfo();
session.endAt = info.endAt.getTime();
```

Initialize `endAt: 0` in the session object at the top of `createSession`.

## 3. Update Zustand store

**File:** [src/stores/session-store.ts](src/stores/session-store.ts)

- Change `isExpired()` to use `session.endAt`:

```typescript
isExpired: () => {
  const { session } = get();
  if (!session || !session.endAt) return true;
  return Date.now() >= session.endAt;
},
```

- Remove `savedAt` from state, `setSession` action, and `partialize` (only persist `session`).

## 4. Update countdown timer

**File:** [src/components/app-shell.tsx](src/components/app-shell.tsx)

Change the countdown `useEffect` to compute remaining time from `session.endAt`:

```typescript
const remaining = session.endAt - Date.now();
```

Remove the `savedAt` dependency and references. Remove the `SESSION_TTL_MS` constant (no longer needed on the frontend -- the server provides the absolute deadline).

Update `RestorePrompt` to show "Xm ago" using `session.createdAt` (which is still fine for display -- it's approximate and doesn't drive logic).
