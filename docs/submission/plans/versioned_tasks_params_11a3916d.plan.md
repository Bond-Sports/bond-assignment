---
name: Versioned Tasks Params
overview: Align the operator seeds task-list request with the existing version-aware query merge pattern so selected agent versions fetch the correct task set without mixing forbidden scope params.
todos:
  - id: inspect-request-hook-shape
    content: Refactor `useGetTasks()` params building in `apps/operator/src/api/request.ts` into scope vs non-scope params.
    status: completed
  - id: wire-version-merge
    content: Use `useVersionedListParams().mergeListParams` so seeds task requests send `version_id` when a selected agent version exists.
    status: completed
  - id: validate-task-filters
    content: Confirm existing task filter branches still map to the same query params, with only the version-aware scope merge changing behavior.
    status: completed
isProject: false
---

# Apply Version Params To Seeds Tasks

## What I found

- The canonical operator pattern for version-aware list queries is in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/helpers/mergeVersionedListParams.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/helpers/mergeVersionedListParams.ts)` and `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useVersionedListParams.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useVersionedListParams.ts)`.
- That helper intentionally returns only `version_id` plus non-scope filters when a version is selected:

```8:20:apps/operator/src/helpers/mergeVersionedListParams.ts
export function mergeVersionedListParams(
  versionId: string | undefined,
  scopeParams: Record<string, unknown>,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const extraSafe = extra ?? {};

  if (versionId) {
    return { ...extraSafe, version_id: versionId };
  }

  return { ...scopeParams, ...extraSafe };
}
```

- The seeds tasks flow currently bypasses that pattern in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/request.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/request.ts)`, where `useGetTasks()` manually assembles `account_id` / `network_id` and all filters into one mutable object for `GET api/v1/seeds/${seedId}/tasks`.
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx)` already has access to `useVersionedListParams()`, but it does not feed that merge into `useGetTasks()`. So the cleanest fix is inside the API hook itself, matching how other operator API hooks already behave.

## Implementation approach

- Update `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/request.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/request.ts)` so `useGetTasks()` imports and uses `useVersionedListParams()`.
- Refactor `getParams()` into two explicit parts:
  - `scopeParams`: only true scope fields such as `account_id` and `network_id`
  - `extraParams`: pagination and all non-scope filters like `page`, `limit`, `title`, `start_time`, `end_time`, `user_id`, `task_origin_type`, `user_and_widget_tasks`, `type`, and `seed_id`
- Build the final query with `mergeListParams(scopeParams, extraParams)` instead of mutating one object. This preserves the existing backend contract:
  - no version selected: keep current scope-based behavior
  - version selected: send `version_id` and keep non-scope filters, while dropping forbidden scope fields
- Preserve the existing branch logic exactly, especially the `USER` / `ALL` behavior that restores `network_id` after the `USERS` branch, and the `USERS` branch behavior that omits `account_id` and `network_id` while keeping `seed_id`.
- Apply the same merge pattern to `useGetAutomatedTasks()` in the same file if we want consistent behavior for the same endpoint family. It is currently unused in the repo, so this is a low-risk consistency follow-up rather than the main requirement.

## Validation

- Verify that `useGetTasks()` still produces the same params when no version is selected.
- Verify that when a version is selected, the request includes `version_id` and no longer includes `account_id` / `network_id`.
- Check the `USERS`, `USER`, `ALL`, `AUTOMATED_TASKS`, and `DEMO` branches to ensure no filter regressions.
- Run lint/diagnostics on the touched operator file after the change.
