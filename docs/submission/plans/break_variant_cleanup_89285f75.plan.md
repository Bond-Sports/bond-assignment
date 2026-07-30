---
name: Break Variant Cleanup
overview: Replace FineTuningView’s local overrides of shared `@aui/break` controls with existing shared switch/button APIs where available, and move any truly missing button chrome into shared `break` appearances instead of operator SCSS.
todos:
  - id: shared-switch-path
    content: Swap FineTuningView CompareView off the local `custom-switch` wrapper onto the shared `break` segmented-switch path, lifting any remaining dark-state delta into `break` if needed.
    status: completed
  - id: shared-compare-trigger
    content: Add a shared Button appearance for the compare-trigger pill and update both FineTuningView trigger components to consume it via Button props instead of local `.button-content` overrides.
    status: completed
  - id: shared-dropdown-row
    content: Rework compare-version popover rows to use an existing shared Button variant if it matches; otherwise add a shared dropdown-row appearance in `break` and remove operator-level Button hover overrides.
    status: completed
  - id: cleanup-validate
    content: Delete the reviewed FineTuningView Button/switch overrides from operator SCSS, then smoke-check the affected UI and run narrow lint validation for the touched projects.
    status: completed
isProject: false
---

# Rework FineTuningView To Shared Break APIs

Replace operator-local SCSS overrides for the reviewed Fine Tuning controls with shared `@aui/break` styling hooks. Reuse the existing switch path where it already exists, and lift the remaining missing button chrome into shared `Button` appearances so operator stops restyling `.break-button` and `.button-content` directly.

## Findings

- `[libs/break/src/lib/Button/styles.scss](libs/break/src/lib/Button/styles.scss)` already defines both the segmented-control container `.break-mode-switch` and `appearance="switch-option"`, so the light `custom-switch` wrapper in Fine Tuning is duplicating shared `break` styling.
- `[libs/break/src/lib/UiCodeModeSwitch/styles.scss](libs/break/src/lib/UiCodeModeSwitch/styles.scss)` already contains shared light/dark segmented-switch theming, which is the closest existing reference for CompareView’s trace-mode switch styling.
- `[apps/operator/src/widgets/FineTuningView/partials/styles.scss](apps/operator/src/widgets/FineTuningView/partials/styles.scss)` and `[apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss](apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss)` duplicate the same gray compare-trigger pill by overriding `.break-button.unstyled`, `.button-content`, hover, and focus states locally.
- `[apps/operator/src/widgets/FineTuningView/partials/CompareVersionPopover/styles.scss](apps/operator/src/widgets/FineTuningView/partials/CompareVersionPopover/styles.scss)` overrides button hover/background/radius for dropdown rows instead of consuming a shared `Button` appearance.

## Planned Changes

- Reuse the shared segmented-control path in `[apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareViewHeader.tsx](apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareViewHeader.tsx)` by replacing the local `custom-switch` wrapper with the shared `break` switch container class and keeping the existing `appearance="switch-option"` buttons. If the trace-mode dark palette still needs a delta after that swap, move that delta into shared `break` switch styling rather than nesting `.custom-switch` overrides in operator.
- Extend shared `Button` styling in `[libs/break/src/lib/Button/Button.tsx](libs/break/src/lib/Button/Button.tsx)` and `[libs/break/src/lib/Button/styles.scss](libs/break/src/lib/Button/styles.scss)` for the reviewed Fine Tuning controls that do not have an existing shared match today:
  - a gray compare-trigger appearance for `[apps/operator/src/widgets/FineTuningView/partials/PlaygroundHeaderV2.tsx](apps/operator/src/widgets/FineTuningView/partials/PlaygroundHeaderV2.tsx)` and `[apps/operator/src/widgets/FineTuningView/partials/CompareView/partials/ComparePopoverTrigger.tsx](apps/operator/src/widgets/FineTuningView/partials/CompareView/partials/ComparePopoverTrigger.tsx)`
  - if `ghost-light` still does not match the compare dropdown row after direct comparison, a shared light dropdown-row appearance for `[apps/operator/src/widgets/FineTuningView/partials/CompareVersionPopover/CompareVersionPopover.tsx](apps/operator/src/widgets/FineTuningView/partials/CompareVersionPopover/CompareVersionPopover.tsx)`
- Update the compare-trigger components to use the existing `Button` API instead of manually spacing icons through nested SCSS:
  - use `leftIcon` / `rightIcon` in the shared `Button` where possible
  - keep only local text-transform / truncation styles in operator
  - delete `.button-content`, hover, border, and focus overrides from the Fine Tuning SCSS files once the shared appearance is wired in
- Simplify `[apps/operator/src/widgets/FineTuningView/partials/CompareVersionPopover/styles.scss](apps/operator/src/widgets/FineTuningView/partials/CompareVersionPopover/styles.scss)` so it only owns popover shell/layout/text styles; move button chrome into the shared `Button` appearance and avoid styling `.break-button` descendants directly.

## Shared APIs To Leverage

```typescript
// libs/break/src/lib/Button/Button.tsx
leftIcon?: CentralIconComponent;
rightIcon?: CentralIconComponent;
contentClassName?: string;
appearance?: 'default' | 'light' | 'success' | 'main' | 'tab' | 'purple-main' | 'select' | 'active-select' | 'purple-filled' | 'delete' | 'switch-option' | 'outline-light' | 'builder' | 'plain-text'
```

```scss
// libs/break/src/lib/Button/styles.scss
.break-mode-switch { ... }
&.switch-option-appearance { ... }
```

## Validation

- Smoke-check the three reviewed surfaces in operator: header compare trigger, compare-mode switch in both light and trace/dark states, and the compare version popover rows.
- Run the narrowest existing lint coverage available for the touched shared/operator projects and fix any style/type fallout before finalizing.
