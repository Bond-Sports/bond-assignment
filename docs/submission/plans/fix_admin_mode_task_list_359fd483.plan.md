---
name: Fix admin mode task list
overview: Disable the task list API call and show an "unavailable" message in the threads panel when in AUI admin mode (category scope), since tasks are network-scoped and have no meaning at category level.
todos:
  - id: disable-api
    content: Add `!isAuiAdminMode` guard to `useGetTasks` enabled condition in request.ts
    status: completed
  - id: unavailable-msg
    content: Show "Thread unavailable" message in TaskListing when in admin mode
    status: completed
isProject: false
---

# Fix: Admin Mode Task List Shown at Category Scope (CTS-11997)

Tasks are network-scoped, but when in admin mode (which operates at category scope), the task list API still fires with the stale `network_id` and displays those irrelevant results. The fix has two parts: stop the API call and show an informative unavailable message in the threads panel.

## Change 1 -- Disable `useGetTasks` in admin mode

File: [apps/operator/src/api/request.ts](apps/operator/src/api/request.ts)

- Import `useAuiAdminModeAtom` from `@operator/atoms/aui-admin-mode-atom`
- Read `isAuiAdminMode` inside `useGetTasks`
- Add `!isAuiAdminMode` to the existing `enabled` guard on line 458:

```ts
enabled: !!seedId && !!account?._id && !!networkId && !!createdBy?.value && !isAuiAdminMode,
```

This is the root fix. It follows the same pattern used by `useScopeParams` and `useScopeReferenceParams`, which already skip network-level fetches in admin mode.

## Change 2 -- Show "Thread unavailable" message in TaskListing

File: [apps/operator/src/widgets/TaskListing/TaskListing.tsx](apps/operator/src/widgets/TaskListing/TaskListing.tsx)

- Import `useAuiAdminModeAtom` from `@operator/atoms/aui-admin-mode-atom`
- At the top of the component return, before the existing content, add an early return when `isAuiAdminMode` is true:

```tsx
if (isAuiAdminMode) {
  return (
    <div className="task-listing-unavailable">
      <p className="empty-text">Thread unavailable</p>
      <p className="empty-text">
        Exit admin mode to interact with the AI agent
      </p>
    </div>
  );
}
```

File: [apps/operator/src/widgets/TaskListing/styles.scss](apps/operator/src/widgets/TaskListing/styles.scss)

- Add a small style block for the unavailable state, reusing the existing `.empty-text` styling and adding centering/padding to match the empty state layout.

This keeps the threads tab/history toggle fully functional so admins can open the panel and see a clear explanation of why threads are not available, rather than encountering a blank or confusing state.

## Out of scope

- The `location.href` bug in `useInstructionsLayout.ts` (playground visibility effect never runs) is a separate, pre-existing issue. Fixing it here risks unintended side effects on non-admin flows and would increase PR scope. It should be a follow-up ticket.

## Impact

- Non-admin users: zero change
- Admin users at category scope: task list API call no longer fires; threads panel shows "Thread unavailable / Exit admin mode to interact with the AI agent"
- Admin users at network scope: N/A (admin mode is always category-scoped per `useScopeParams`)
