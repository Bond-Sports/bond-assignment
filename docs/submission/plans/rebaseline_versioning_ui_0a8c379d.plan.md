---
name: Rebaseline Versioning UI
overview: Preserve the current dark-new versioning UI in source as an unused presentation layer, then make the shipped `VersionDropdown` and its modals/sheet follow the existing operator/Apollo visual patterns without changing the underlying versioning logic.
todos:
  - id: preserve-dark-new-ui
    content: Isolate the current dark versioning presentation into a clearly non-default component/style boundary while keeping the shared hook and formatting helpers intact.
    status: completed
  - id: build-apollo-dropdown
    content: Rework the active VersionDropdown rendering to mirror existing operator dropdown/menu patterns, especially NetworkDropdown.
    status: completed
  - id: rebaseline-versioning-overlays
    content: Restyle or rebuild the versioning modals and history sheet to use standard operator/break surfaces and lighter tokens.
    status: completed
  - id: verify-no-logic-regression
    content: Confirm the UI swap does not change handler wiring or versioning behavior, then validate with targeted lint/manual checks.
    status: completed
isProject: false
---

# Rebaseline Versioning UI

## Goal

Keep the current dark versioning implementation available in the repo for later reuse, but make the active versioning experience look and behave like the existing operator UI patterns.

## Key Facts

The current versioning feature is already split cleanly between shared behavior and presentation:

- Shared behavior is concentrated in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)`.
- The darker current look is mainly carried by the active component tree in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/VersionDropdown.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)` and its SCSS overrides in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/styles.scss)`.
- The closest existing operator reference for the shipped look is `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/NetworkDropdown/NetworkDropdown.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/NetworkDropdown/NetworkDropdown.tsx)` plus its lighter/operator-native SCSS in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/NetworkDropdown/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/NetworkDropdown/styles.scss)`.

Current dark presentation entry point:

```105:165:/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/VersionDropdown.tsx
            <Popover
              open={menuOpen}
              setOpen={handlePopoverOpenChange}
              placement="bottom-start"
              offsetValue={8}
              zIndex={1003}
              closeOnScroll
              className="version-popover-panel"
              trigger={
                <VersionDropdownTrigger
                  label={triggerLabel}
                  disabled={isLoading}
                  menuOpen={menuOpen}
                />
              }
            >
              <div className="version-popover-panel__inner">
                {/* ... */}
                <div className="version-popover-panel__footer">
                  <Flex direction="vertical" alignItems="center" spacing="none" fullWidth>
                    <Button
                      variant="ghost-dark"
                      className="version-popover-panel__footer-action"
                      onClick={handleOpenCreateVersionModal}
                    >
```

Operator-native reference pattern:

```75:132:/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/NetworkDropdown/NetworkDropdown.tsx
      <Dropdown
        isSearchable={true}
        searchPlacement="menu"
        menuTitle={topBarConfig?.networkDropdownTitle || 'Agents'}
        menuFooter={
          <Flex direction="vertical" alignItems="center" spacing="none">
            <Button
              variant="ghost-dark"
              className="break-dropdown-menu__footer-action custom-dropdown-button"
              onClick={handleAddAgentClick}
            >
              <Flex alignItems="center" spacing="small">
                <CentralIcon icon={IconPlusLarge} size={IconSize.Medium} color={IconColor.neutral85} />
                <span className="break-dropdown-menu__footer-action-label">Add Agent</span>
              </Flex>
            </Button>
```

## Implementation Plan

1. Preserve the current `dark-new` UI as a dormant presentation layer.

- Move or rename the current shipped presentation files into a clearly non-default boundary such as `dark-new/`, `legacy/`, or `experimental/` under `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown)`.
- Preserve these files rather than deleting them: `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/VersionDropdown.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)`, `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/EditVersionModal.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/EditVersionModal.tsx)`, `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/CreateVersionModal.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/CreateVersionModal.tsx)`, `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/PublishVersionModal.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/PublishVersionModal.tsx)`, `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/VersionHistoryPanel.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/VersionHistoryPanel.tsx)`, and the related dark SCSS blocks in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/styles.scss)`.
- Keep `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)` and `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/versionDropdownFormat.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/versionDropdownFormat.ts)` as the single source of truth so the future `dark-new` UI can be rewired without rebuilding behavior.
- Keep the public entry point `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/index.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/index.ts)` pointing only at the Apollo-style implementation.

1. Rebuild the active `VersionDropdown` around existing operator patterns, not the dark custom shell.

- Replace the default rendered surface with a structure modeled after `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/NetworkDropdown/NetworkDropdown.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/NetworkDropdown/NetworkDropdown.tsx)`: break-owned dropdown/menu behavior, lighter option styling, standard footer actions, and operator-native hover/selected states.
- Keep the current trigger placement and state wiring from `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/VersionDropdown.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)`, but remove reliance on the dark class hooks like `version-popover-panel`, `version-actions-menu`, and other custom dark wrappers from the active path.
- Reuse existing partial responsibilities where possible instead of duplicating logic, but allow the active presentational partials to diverge from the preserved `dark-new` versions.

1. Rebaseline modals and the history sheet to the existing operator visual language.

- Make `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/EditVersionModal.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/EditVersionModal.tsx)`, `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/CreateVersionModal.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/CreateVersionModal.tsx)`, and `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/PublishVersionModal.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/PublishVersionModal.tsx)` use standard `@aui/break` modal surfaces and lighter operator styling instead of `.break-modal-container.version-dropdown-modal` overrides.
- Align the confirmation flow with existing operator modal conventions by using `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/DeleteModal/DeleteModal.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/DeleteModal/DeleteModal.tsx)` as the reference for spacing, footer actions, and neutral copy tone.
- Rework `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/VersionHistoryPanel.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/partial/VersionHistoryPanel.tsx)` so the active sheet feels like the rest of operator: neutral surfaces, break defaults where possible, and only minimal local SCSS for spacing/layout.

1. Reduce the active SCSS to operator-style deltas only.

- Split `styles.scss` responsibility into two layers: preserved `dark-new` styles for the dormant implementation, and minimal Apollo/operator styles for the active implementation.
- Remove hard-coded dark values like `#121212`, `#1a1a1a`, `#313131`, white text, and purple focus rings from the active path; replace them with existing break/operator tokens and patterns already used in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/NetworkDropdown/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/NetworkDropdown/styles.scss)`.
- Update action/menu icon colors in the active path so they no longer assume dark backgrounds.

1. Keep integration unchanged while making the UI swap reversible.

- Leave the mount point in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/Header/Header.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/Header/Header.tsx)` unchanged if possible, so the rest of the app continues to consume `VersionDropdown` the same way.
- The revert path should be one import/export switch, not another full rewrite. That means the preserved `dark-new` implementation should stay self-contained and continue consuming the shared hook contract.

1. Validate at the component boundary.

- Verify that create, edit, publish, archive, select-version, and version-history flows still call the same handlers from `useVersionDropdown`.
- Run the narrowest relevant validation for operator after the implementation: lint the touched files or `nx lint operator`, and manually verify the header dropdown, all modals, and the right-side history sheet for visual consistency and regression-free behavior.

## Expected Outcome

After this work, the app ships an Apollo/operator-consistent versioning experience, while the `dark-new` implementation remains preserved in source as an unused presentation layer that can be reactivated later without rebuilding business logic.
