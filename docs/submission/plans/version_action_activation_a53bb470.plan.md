---
name: version action activation
overview: Enable the shared "Publish Version" action for already published versions by routing those cases through activation-only logic instead of always publishing first, while preserving the current publish wording. Keep behavior consistent across the default and dark-new VersionDropdown UIs.
todos:
  - id: map-shared-action-surfaces
    content: Update the shared publish-disabled rules in useVersionDropdown so published versions stay actionable while archived versions remain blocked.
    status: completed
  - id: split-publish-confirm-flow
    content: Refactor handlePublishVersionConfirm to branch by target version status and reuse activation-only behavior for already published versions.
    status: completed
  - id: align-default-and-dark-new-ui
    content: Propagate the new behavior consistently through default and dark-new VersionDropdown action menus and loading states.
    status: completed
  - id: verify-version-state-matrix
    content: Validate draft, published-live, published-not-live, and archived scenarios in the operator VersionDropdown flows.
    status: completed
isProject: false
---

# Plan

## Goal

Make the shared `Publish Version` action usable for already published versions so it behaves like the existing revert flow: if the target version is already `published`, skip the publish API call and only activate it. Per your choice, this should apply everywhere the shared publish action appears, and the UI should keep the current `Publish Version` wording.

## Current Behavior

In `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)`, `handlePublishVersionConfirm` always calls `publishAgentVersion(...)` first and only then calls `setAgentActiveVersion(...)` when the target is not already live. The action is blocked earlier by `isPublishDisabled` / `isPublishDisabledForVersion`, which currently return `true` for both `published` and `archived` versions.

## Planned Changes

1. Update the shared availability rules in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)`.

- Change `isPublishDisabled` and `isPublishDisabledForVersion` so `published` versions are no longer disabled.
- Keep the existing safety guards for missing `currentAgent`, missing `user`, and `archived` versions.
- This fixes the cause, because both the top-level Actions menu and the history-row menus depend on these guards.

1. Split `handlePublishVersionConfirm` by target version status in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)`.

- Resolve the target version from `publishModalVersionId ?? currentAgent?.selected_version_id` as it does today.
- If the target version is `draft`, preserve the current flow: publish first, then activate if needed.
- If the target version is already `published`, skip `publishAgentVersion(...)` and reuse the same activation path already used by `handleRevertToPublishedVersion`.
- Preserve the existing query invalidation and `setSelectedVersionId(versionId)` updates so the dropdown state stays in sync after activation.
- Keep the current copy/toast wording unless implementation reveals a blocking mismatch.

1. Keep UI parity across every entry point that uses this action.

- Default action menu helper: `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/VersionActionsMenuItems.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/VersionActionsMenuItems.tsx)`
- Default dropdown wiring: `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/VersionDropdown.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)`
- History-row action usage via the same helper: `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/VersionSidePanel/VersionHistoryRow.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/VersionSidePanel/VersionHistoryRow.tsx)` and `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/VersionSidePanel/VersionHistoryContent.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/VersionSidePanel/VersionHistoryContent.tsx)`
- Dark-new action menu helper and wiring: `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/dark-new/partial/VersionActionsMenuItems.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/dark-new/partial/VersionActionsMenuItems.tsx)` and `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/dark-new/VersionDropdown.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/dark-new/VersionDropdown.tsx)`
- Because the dark-new modal currently only shows `isPublishingVersion`, update its loading wiring so activate-only requests also surface a loading state there, matching the default dropdown behavior.

1. Verify behavior against the version matrix.

- `draft` selected/version-row action still publishes and then activates.
- `published` but not live selected/version-row action now opens the same publish modal and only activates.
- already live `published` version remains harmless if triggered, with no duplicate publish request.
- `archived` version remains disabled.
- Default and dark-new dropdown variants stay aligned.

## Validation

Run a focused operator validation after implementation.

- UI check the selected-version Actions menu and the history-row menu for a published non-live version.
- Confirm only the activation request fires for already published versions.
- Confirm draft versions still hit publish first.
- Run a narrow lint pass on the touched operator files if feasible.
