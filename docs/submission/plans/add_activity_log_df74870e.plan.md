---
name: Add Activity Log
overview: Add a new version-scoped Activity Log view to the operator versioning UI, using mock entries for now and wiring the new action into both existing version action menus. Keep it aligned with the current `VersionHistoryPanel` sheet pattern, but treat history and activity as two views within the same right-side panel so transitions feel continuous.
todos:
  - id: add-activity-log-state
    content: Add Activity Log view state and selected-version wiring in `useVersionDropdown.ts` and `VersionDropdown.tsx`, keeping the history and activity views mutually coordinated inside the same sheet flow.
    status: completed
  - id: add-menu-entry
    content: Add the `Version Activity Log` action to the shared version actions menu path used by both menu entry points.
    status: completed
  - id: build-activity-log-panel
    content: Create the new Activity Log sheet component and isolated mock data module under `VersionDropdown/partial/`.
    status: completed
  - id: style-activity-log-panel
    content: Add dedicated SCSS for the Activity Log sheet layout and selected-row/detail presentation in `VersionDropdown/styles.scss`.
    status: completed
  - id: validate-activity-log-flow
    content: Verify both open paths, in-panel transition behavior, back/close behavior, and lint cleanliness for the touched operator files.
    status: completed
isProject: false
---

# Add Version Activity Log

## Scope

Implement a new right-side Activity Log view for the operator versioning flow, based on the provided screenshot and [Figma reference](https://www.figma.com/design/WRiKqGcvwd2CyRC4RxuH7S/Branches---Versioning?node-id=81-2741&p=f&t=JgbI5f2RKNag2isF-0). The first version will be scoped to the currently selected version and will use mock activity entries, with the selected version label shown in the header/detail area. Instead of closing one sheet and opening another, the history and activity experiences should feel like two modes of the same panel with an internal transition.

## Targeted Changes

- Extend `[apps/operator/src/components/VersionDropdown/useVersionDropdown.ts](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)` with Activity Log state, selected activity-log version context, and view-switch handlers, resetting that state when the active agent changes.
- Update `[apps/operator/src/components/VersionDropdown/VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)` to:
  - pass a new `onOpenVersionActivityLog` handler into the version actions menu path
  - pass selected version context into the activity-log view
  - keep the right-side panel mounted while switching between history and activity content
- Update `[apps/operator/src/components/VersionDropdown/partial/VersionActionsButton.tsx](apps/operator/src/components/VersionDropdown/partial/VersionActionsButton.tsx)` and `[apps/operator/src/components/VersionDropdown/partial/VersionActionsMenuItems.tsx](apps/operator/src/components/VersionDropdown/partial/VersionActionsMenuItems.tsx)` to add a `Version Activity Log` menu item.
  Important: `renderVersionActionsMenuItems()` is reused by both the main selected-version Actions button and each row menu inside `[apps/operator/src/components/VersionDropdown/partial/VersionHistoryRow.tsx](apps/operator/src/components/VersionDropdown/partial/VersionHistoryRow.tsx)`, so this change should intentionally light up both entry points.
- Add a new activity-log view component under `apps/operator/src/components/VersionDropdown/partial/` and decide during implementation whether the cleanest outcome is:
  - extending `VersionHistoryPanel.tsx` into a small view-switching panel shell, or
  - introducing a shared panel shell used by both `VersionHistoryPanel` and `VersionActivityLogPanel`
    The key requirement is preserving one continuous sheet container and animating or transitioning the inner content rather than tearing down and recreating the overlay.
    Recommended split for the first pass:
  - `VersionActivityLogPanel.tsx`: activity-log content, two-column layout, selection state, and detail rendering
  - `versionActivityLogMock.ts`: mock entry types and seeded data shaped for an easy later backend swap
  - optional `README.md` if you want to strictly follow the operator app’s local component rule for new components
- Extend `[apps/operator/src/components/VersionDropdown/styles.scss](apps/operator/src/components/VersionDropdown/styles.scss)` with a separate `version-activity-log-panel__*` class block instead of overloading `version-history-panel__*` styles.

## UI Shape

Mirror the current sheet conventions from `[apps/operator/src/components/VersionDropdown/partial/VersionHistoryPanel.tsx](apps/operator/src/components/VersionDropdown/partial/VersionHistoryPanel.tsx)`: `Sheet` from `@aui/break`, icon + title header, close button, and right-side slide-in behavior.

Interaction model:

- Opening `Version Activity Log` while the history panel is already open should transition within the same sheet instead of closing and reopening the overlay.
- Row-level opens from Version History should preserve the clicked version as the activity-log context.
- The panel should support returning from Activity Log back to Version History without dismissing the whole sheet.

Inside the new panel:

- Left column: stacked activity entries matching the screenshot, with one selected by default
- Right column: selected-entry detail card showing the mock content/body
- Header area: `Activity Log` title plus the current version label in the top-right area
- Mock rows should cover the screenshot-style event types, for example: draft created, tool goal edited, constraint edited, agent settings edited

## Data Strategy

Keep the backend seam explicit:

- derive the displayed version label from the currently selected version that `VersionDropdown` already knows about
- keep mock activity entries in a dedicated local module rather than embedding them inline in JSX
- shape each entry with the fields the backend is likely to provide later, such as `id`, `title`, `actorName`, `timestampLabel` or raw timestamp, `summary`, `detailPath`, and `detailBody`

## Validation

After implementation:

- verify the new menu item opens the activity-log view from both the top Actions button and the per-row menu in Version History
- verify the history-to-activity switch happens inside one mounted sheet and feels continuous
- verify the panel can return from activity log back to history without closing the overlay
- compare spacing, column balance, and typography against the provided screenshot
- run narrow linting on the touched operator files and fix any introduced diagnostics
