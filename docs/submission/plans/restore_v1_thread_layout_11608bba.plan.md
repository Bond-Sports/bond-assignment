---
name: restore v1 thread layout
overview: Rework the operator thread V2 right-side container so normal-mode history uses the same in-header/tabbed layout contract as V1, while preserving the separate compare-mode flow and version-selection behavior.
todos:
  - id: inspect-v2-header-contract
    content: Map the minimal V1 header/tab structure that must be restored in V2 normal mode while keeping V2 compare/version controls.
    status: completed
  - id: replace-overlay-history
    content: Plan the container and hook changes needed to remove FloatingView-based history from V2 and restore inline TaskListing rendering.
    status: in_progress
  - id: preserve-compare-mode
    content: Keep existing compare store/layout behavior intact and validate that the normal-mode refactor does not change compare-mode entry or exit.
    status: pending
  - id: align-history-styling
    content: Reuse the existing V1 thread-history SCSS hooks and identify only the small styling adjustments still needed for the V2 header composition.
    status: pending
isProject: false
---

# Restore V1 Thread Layout In V2

## Goal

Make the V2 right-side thread layout behave like V1 in normal mode so we do not introduce a layout contract change. The history/task listing should render inside the same header/tab structure V1 uses, not inside a floating overlay.

## What I Verified

- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainer.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainer.tsx)` keeps history inline via local `selectedTab` state and renders `TaskListing` inside the `Threads` tab panel.
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx)` replaces that with `showHistory` + `FloatingView`, which changes both DOM structure and styling behavior.
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/styles.scss)` already contains V1-style task-list overrides under `.thread-header__threads-panel`, so the current V2 history UI misses those styles because it is rendered outside that structure.
- Compare mode is independent of the history overlay. It is driven by `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/stores/useCompareStore.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/stores/useCompareStore.ts)`, the compare-mode classes in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/InstructionsLayout.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/InstructionsLayout.tsx)`, and `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx)`.

## Planned Changes

- Update `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx)` to follow the V1 normal-mode structure:
  - add local tab state like V1 (`Chat` / `Threads`)
  - render `TaskListing` inline in the header/tab content instead of inside `FloatingView`
  - keep the existing compare-mode branch untouched so `CompareView` still takes over the full right panel when `isCompareMode` is active
- Trim overlay-only state from `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/useInstructionsSidesV2.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/useInstructionsSidesV2.ts)`:
  - remove `showHistory`, `toggleHistory`, and `closeHistory` if they are no longer needed
  - keep version loading and compare selection logic
  - if compare is triggered while the `Threads` tab is open, switch back to `Chat` in the container-level state instead of relying on overlay close behavior
- Rework the V2 header so it preserves V2 controls without changing the V1 layout contract. This likely means updating `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/PlaygroundHeaderV2.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/PlaygroundHeaderV2.tsx)` and `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/PlaygroundHeaderV2.styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/PlaygroundHeaderV2.styles.scss)` so the compare/version controls coexist with the V1-style `Chat` / `All Threads` tabbed header.
- Adjust `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/styles.scss)` only where needed so the inline history list matches V1 visually. The first preference is to reuse the existing `.thread-header__threads-panel` rules by restoring the same wrapper structure, then add only small V2-specific overrides if the compare/version controls need spacing tweaks.

## Validation

- Confirm normal mode still shows chat by default and switches to the inline history list via the header tabs.
- Confirm the history task listing inherits the V1-style search, filter, list spacing, and selected-row treatment.
- Confirm entering compare mode still expands the right side into `CompareView` exactly as before, and exiting compare returns to the normal chat layout without stale history state.
