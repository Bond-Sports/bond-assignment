---
name: Version history row actions
overview: Expose the same five version actions from [VersionActionsButton.tsx](apps/operator/src/components/VersionDropdown/partial/VersionActionsButton.tsx) on each row in the history sheet by extending the dropdown hook with explicit publish/archive targets, wiring callbacks through [VersionHistoryPanel.tsx](apps/operator/src/components/VersionDropdown/partial/VersionHistoryPanel.tsx) into [VersionHistoryRow.tsx](apps/operator/src/components/VersionDropdown/partial/VersionHistoryRow.tsx), and optionally deduplicating menu markup so header and rows stay in sync.
todos:
  - id: hook-modal-targets
    content: Add publish/archive modal version-id state, parameterized open/close/confirm, reset on agent change; add per-version disabled helpers and publish label resolution
    status: completed
  - id: view-changes-row
    content: Implement onViewChangesForVersion (scroll + transient highlight) in hook + SCSS
    status: completed
  - id: wire-dropdown-panel
    content: "VersionDropdown: pass target label to PublishVersionModal; thread new callbacks into VersionHistoryPanel"
    status: completed
  - id: history-row-menu
    content: "VersionHistoryRow: full action menu + onClick; optional extract shared VersionActionsMenuItems with VersionActionsButton"
    status: completed
  - id: lint
    content: Run nx lint operator for touched files
    status: completed
isProject: false
---

# Version history panel: parity with version actions menu

## Current behavior

- [VersionActionsButton.tsx](apps/operator/src/components/VersionDropdown/partial/VersionActionsButton.tsx) exposes: **Publish**, **Edit Version Details**, **View Changes** (opens the history sheet), **Revert to this Version** (`noop`), **Archive**.
- [VersionHistoryPanel.tsx](apps/operator/src/components/VersionDropdown/partial/VersionHistoryPanel.tsx) only passes `onOpenEditVersionDetails` into rows.
- [VersionHistoryRow.tsx](apps/operator/src/components/VersionDropdown/partial/VersionHistoryRow.tsx) has a TODO and only renders **Edit**; that `MenuItem` has **no `onClick`**, so edit from the sheet does nothing today.

## Root cause for publish/archive from a row

Confirm paths in [useVersionDropdown.ts](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts) always use `**currentAgent.selected_version_id**` for `archiveAgentVersion` / `publishAgentVersion` (see `handleArchiveVersionConfirm` / `handlePublishVersionConfirm`). The header actions are correct because they assume “selected version”. A row action must operate on **that row’s `version.id`** without relying on the user having selected that version in the dropdown first.

## Recommended approach

### 1. Explicit modal targets in `useVersionDropdown`

Add nullable state, reset when agent changes (extend the existing `useEffect` on `currentAgent?.id` around lines 119–150) and when each modal closes:

- `publishModalVersionId: string | null` — when non-null, publish flow uses this id; when null, fall back to `currentAgent.selected_version_id` (header behavior).
- `archiveModalVersionId: string | null` — same pattern for archive.

Handlers:

- `**handleOpenPublishVersionModal(version?: IAgentVersionItem)**` — if `version` passed, set `publishModalVersionId` to `version.id`; else set `null`. Then open the modal (same as today). Do **not** call `setMenuOpen(false)` when the optional arg is used if that would fight opening from the sheet; either skip `setMenuOpen` when `version` is provided or always no-op if menu is already closed.
- `**handleOpenArchiveVersionModal(version?: IAgentVersionItem)` — mirror for archive.
- `**handleClosePublishVersionModal` / `handleCloseArchiveVersionModal`* — clear the corresponding `*ModalVersionId`.
- `**handlePublishVersionConfirm` / `handleArchiveVersionConfirm` — resolve `versionId = publishModalVersionId ?? currentAgent.selected_version_id` (and same for archive); early-return if missing; use `versionId` in `urlParams.versionId`.

Export derived `**publishModalVersionLabel` (or resolve in [VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)) via `getVersionDisplayLabel` on the version object matching `publishModalVersionId ?? selected`.

Per-version disabled rules (same logic as today’s `isPublishDisabled` / `isArchiveDisabled`, but parameterized by a version):

- **Archive disabled** for a version when `version.status === 'archived'`.
- **Publish disabled** when `!currentAgent?.id || !user?._id` **or** `version.status` is `published` or `archived`.

### 2. Wire [VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)

- Pass `**versionLabel` into `PublishVersionModal` from the resolved target version (not only `selectedVersionValue`).
- Header `**VersionActionsButton`**: keep calling open handlers **without* an argument so `*ModalVersionId`stays`null` (selected-version semantics preserved).
- `**VersionHistoryPanel`: pass new props (see below).

### 3. Extend [VersionHistoryPanel.tsx](apps/operator/src/components/VersionDropdown/partial/VersionHistoryPanel.tsx) props

Add callbacks and any flags the row needs, for example:

- `onOpenPublishVersion: (version: IAgentVersionItem) => void`
- `onOpenArchiveVersion: (version: IAgentVersionItem) => void`
- `onViewChangesForVersion: (version: IAgentVersionItem) => void` — see below
- Optionally pass `**isPublishDisabledForVersion` / `isArchiveDisabledForVersion` as functions from the hook so rules live in one place.

### 4. Implement [VersionHistoryRow.tsx](apps/operator/src/components/VersionDropdown/partial/VersionHistoryRow.tsx)

Mirror the five `MenuItem`s from `VersionActionsButton` (same icons, labels, `version-actions-menu__item-label` / `version-actions-menu__item--section-start` classes, `noop` for disabled publish/archive like the header).

- **Edit**: `onClick={() => onOpenEditVersionDetails(version)}` (fixes the broken edit action).
- **Publish / Archive**: call the new row-specific open handlers with `version`, respect disabled flags.
- **Revert**: keep `noop` for parity with the header until a real revert API/flow exists.
- **View Changes**: because the user is already in the history sheet, literal `openVersionHistory()` is redundant. Implement `**onViewChangesForVersion`** in the hook to **scroll the row into view** and apply a short **highlight (e.g. `data-version-id` + `scrollIntoView` + a transient CSS class in [styles.scss](apps/operator/src/components/VersionDropdown/styles.scss)) so the action remains meaningful in-context. If you prefer disabling the item inside the sheet instead, that is a small product choice; scrolling + highlight matches “focus this version in history” without new routes.

### 5. DRY (recommended, not mandatory)

Extract a small presentational helper (e.g. `VersionActionsMenuItems`) used by both `**VersionActionsButton`** and `**VersionHistoryRow\*\`, taking plain callbacks and disabled booleans so labels/icons/order cannot drift.

## Files to touch

| File                                                                                                    | Change                                                                                                                             |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [useVersionDropdown.ts](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)             | Modal target state; parameterized open/confirm; per-version disabled helpers; scroll/highlight handler for “View Changes” from row |
| [VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)                 | Pass new props to panel; fix `PublishVersionModal` label from target version                                                       |
| [VersionHistoryPanel.tsx](apps/operator/src/components/VersionDropdown/partial/VersionHistoryPanel.tsx) | Thread props to rows                                                                                                               |
| [VersionHistoryRow.tsx](apps/operator/src/components/VersionDropdown/partial/VersionHistoryRow.tsx)     | Full menu + wiring                                                                                                                 |
| [styles.scss](apps/operator/src/components/VersionDropdown/styles.scss)                                 | Optional highlight class for scroll-to-version                                                                                     |
| Optional new partial                                                                                    | Shared menu items for button + row                                                                                                 |

## Verification

- From the history sheet: edit opens modal with that row’s data; publish/archive confirm affects that row’s id even when it is not the currently selected dropdown version; header actions still affect the selected version only.
- `nx lint operator` on the touched paths.
