---
name: fix-version-task-scope
overview: "Prevent old-version tasks from surviving a version switch by fixing the two state owners that still carry them across: URL session state and `tasksList` preservation in `MainContext`. Keep the change local, avoid API contract changes, and preserve existing behavior for network/filter changes."
todos:
  - id: clear-url-before-reset
    content: In `MainContext.createNewTask`, clear `sessionId`/`messageId` before the async disconnect path so version changes cannot re-open the old task from URL state.
    status: completed
  - id: clear-task-list-on-version-change
    content: "Add a version-scoped reset effect in `MainContext` that mirrors the existing network reset: clear `tasksList` and refetch when `versionIdForQuery` changes."
    status: completed
  - id: verify-merge-does-not-leak
    content: Confirm the existing local-task preservation merge no longer carries prior-version rows after the version reset; add a tiny version-boundary guard only if step 2 is insufficient.
    status: completed
isProject: false
---

# Fix Version-Scoped Task Reset

## Goal

When the selected agent version changes, the operator should stop showing tasks from the previous version in both the task list and the open thread.

## Root Cause

The bug is not primarily in `[apps/operator/src/layouts/instructions-layout/useInstructionsLayout.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/useInstructionsLayout.ts)`. That hook only signals the reset.

The real carry-over happens in `[apps/operator/src/contexts/MainContext.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx)`:

- `createNewTask()` clears `sessionId`, but only after `await disconnectWS()`, leaving a race where `selectInitialTaskOnLoad()` can still re-open the old task from the URL.
- The `taskListResponse.data` -> `tasksList` merge preserves local tasks by account/network/filter, but not by selected version, so tasks from the previous version are reinserted into the new version's list.

## Minimal Fix Shape

Make the fix in one place: `[apps/operator/src/contexts/MainContext.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx)`.

1. Clear stale URL task state before async reset work.
   If `createNewTask()` is being used to abandon the current thread, remove `sessionId` and `messageId` from search params before awaiting websocket disconnect. This removes the highest-priority source used by `selectInitialTaskOnLoad()`.

Essential flow today:

```text
version change -> useInstructionsLayout calls createNewTask()
createNewTask() awaits disconnectWS()
meanwhile task list query refreshes
selectInitialTaskOnLoad() sees old sessionId in URL and reopens old task
```

1. Reset local `tasksList` when version scope changes.
   Add a version-change effect parallel to the existing network-change effect so `tasksList` is immediately cleared and refetched when `versionIdForQuery` changes.

Target area in `[apps/operator/src/contexts/MainContext.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx)`:

- existing network reset effect around `selectedNetwork?._id`
- version state already available via `useVersionedListParams()` as `versionIdForQuery`

1. Keep the preservation merge, but stop it from carrying stale rows across version switches.
   The lightest approach is to rely on step 2 so `currentLocalTasks` is empty for the new version before merge runs. If needed after implementation review, add a tiny guard so the merge does not preserve `newTask` rows across a version boundary.

## Why This Is The Smallest Correct Fix

- No API/schema work.
- No changes to task response typing.
- No refactor of `useInstructionsLayout` behavior.
- Fixes the causes at the state owners that actually leak old-version tasks.
- Matches an existing pattern already used for network changes in the same file.

## Validation

Verify this scenario in the operator app:

1. Open version A.
2. Start a new task.
3. Create/switch to version B.
4. Confirm:

- task list does not contain the task from version A
- open thread is a fresh task, not the previous one
- switching back to version A still shows version A tasks

Also verify there is no regression for:

- manual `New Task`
- network switch reset behavior
- task selection from URL when not changing version
