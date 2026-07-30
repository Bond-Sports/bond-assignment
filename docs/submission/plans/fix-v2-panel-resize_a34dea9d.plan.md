---
name: fix-v2-panel-resize
overview: Restore V2 right-panel resizing by keeping the resizable wrapper mounted in all resize-eligible states and removing the compare-mode CSS that forces the right panel to 100% width.
todos:
  - id: inspect-v2-branching
    content: Refactor V2 right-side container so compare mode does not bypass ResizablePanel on base-model routes.
    status: completed
  - id: adjust-compare-css
    content: Relax compare-mode width overrides for the resizable right-side container so inline pixel width can take effect.
    status: completed
  - id: verify-behavior
    content: Validate chat mode and compare mode resizing behavior and confirm no regressions on non-base-model routes.
    status: completed
isProject: false
---

# Fix V2 Right-Panel Resize

## What is broken

V2 differs from V1 in two places that block resize behavior:

- In [apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx), `isCompareMode` returns early with a plain `div`, so `ResizablePanel` is never mounted in compare mode.
- In [apps/operator/src/layouts/instructions-layout/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/styles.scss), `.instructions-layout--compare-mode .right-side-container` and `.right-side-container--resizable` are forced to `width: 100% !important` and `max-width: 100% !important`, which overrides the pixel width that `ResizablePanel` applies inline.

Essential snippets:

```112:148:apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx
const renderContent = () => {
  if (isCompareMode) {
    return (
      <div className="right-side-container" ...>
        <CompareView ... />
      </div>
    );
  }

  if (location.pathname === ERoutes.BASE_MODEL) {
    return (
      <ResizablePanel ...>
        {ftv}
      </ResizablePanel>
    );
  }
}
```

```679:697:apps/operator/src/layouts/instructions-layout/styles.scss
.right-side-container {
  flex: 1 1 100% !important;
  flex-basis: 100% !important;
  max-width: 100% !important;
  width: 100% !important;

  &.right-side-container--resizable {
    flex: 1 1 100% !important;
    flex-basis: 100% !important;
    max-width: 100% !important;
    width: 100% !important;
  }
}
```

## Implementation approach

- Update [apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx) so `ERoutes.BASE_MODEL` decides the outer wrapper first, matching V1.
- Keep `ResizablePanel` mounted as the stable outer node on base-model routes, and switch only the inner content between `FineTuningView` and `CompareView`.
- Update [apps/operator/src/layouts/instructions-layout/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/styles.scss) so compare mode can still collapse the left panel, but does not hard-force `.right-side-container--resizable` to `100%` width. Preserve full-width behavior only for the non-resizable variant if that is still intended.
- Validate that compare mode still fills the available remaining space correctly while the resizable variant honors the panel’s inline pixel width.

## Validation

- Check normal V2 chat mode on base-model: drag handle appears and width changes persist while toggling history/chat.
- Check V2 compare mode on base-model: drag handle remains usable and panel width changes visually.
- Check non-base-model routes: behavior remains unchanged, since those paths do not use `ResizablePanel` today.
- Run lint on the touched operator files and do a quick manual verification in the running operator app.
