---
name: restore-compare-animation
overview: Restore smooth compare open/close animation for the V2 resizable right panel with a minimal CSS-only change that preserves working resize behavior.
todos:
  - id: update-resizable-transition
    content: Adjust the V2 resizable right-panel transitions so compare mode can animate in both directions.
    status: completed
  - id: scope-no-transition-to-drag
    content: Disable transitions only during active drag-resize using the existing body resizing class.
    status: completed
  - id: verify-animation-and-resize
    content: Validate smooth compare open/close plus unaffected manual resize behavior.
    status: completed
isProject: false
---

# Restore V2 Compare Animation

## What changed the animation

The current resize fix in [apps/operator/src/layouts/instructions-layout/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/styles.scss) keeps the resizable panel working, but it also makes compare transitions asymmetric:

- The normal resizable state uses `transition: none`, so when compare mode closes, the right panel loses its easing immediately.
- `ResizablePanel` applies inline `width` and `minWidth` in pixels in [apps/operator/src/components/ResizablePanel/ResizablePanel.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/ResizablePanel/ResizablePanel.tsx), but the compare-mode transition list does not include `min-width`, so part of the layout snaps even while `width` animates.

Essential snippets:

```615:621:apps/operator/src/layouts/instructions-layout/styles.scss
&.right-side-container--resizable {
  flex: 0 0 auto;
  flex-basis: auto;
  max-width: none;
  width: auto;
  min-width: 0;
  transition: none;
}
```

```47:50:apps/operator/src/components/ResizablePanel/ResizablePanel.tsx
const style = {
  width: `${width}px`,
  minWidth: `${width}px`,
} as React.CSSProperties;
```

## Minimal fix

- Update [apps/operator/src/layouts/instructions-layout/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/styles.scss) so the resizable right panel uses the same compare transition timing in its normal state instead of blanket `transition: none`.
- Add `min-width` to the right-panel transition list so the inline `minWidth` from `ResizablePanel` can animate cleanly against compare-mode `min-width: 0 !important`.
- Keep drag-resize responsive by scoping `transition: none` only while `body.resizable-panel-resizing` is active, reusing the body class already applied by `ResizablePanel`.
- Leave [apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx) unchanged unless testing proves the issue is not CSS-only.

## Validation

- Compare open animation should expand smoothly from the user-sized panel width to full width.
- Compare close animation should shrink smoothly back to the previously sized panel width.
- Dragging the resize handle should still feel immediate, without eased lag during mousemove.
- Normal non-compare layout fill behavior should remain unchanged.
