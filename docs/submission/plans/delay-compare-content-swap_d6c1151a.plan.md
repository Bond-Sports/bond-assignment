---
name: delay-compare-content-swap
overview: Make compare mode feel like an expanding transition by keeping the existing width animation and delaying the inner view swap until the right-panel transition completes.
todos:
  - id: add-delayed-compare-display-state
    content: Add local compare display state in InstructionsRightSideContainerV2 so content swap is decoupled from raw compare mode.
    status: completed
  - id: wire-transition-completion
    content: Use right-panel transition completion with a fallback timer to swap content only after expand/shrink finishes.
    status: completed
  - id: verify-compare-transition-flow
    content: Validate smooth compare open/close while preserving manual resize and normal V2 behavior.
    status: completed
isProject: false
---

# Delay Compare Content Swap

## What is actually causing the hard cut

The compare open/close state change currently does two things in the same render:

- [apps/operator/src/layouts/instructions-layout/InstructionsLayout.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/InstructionsLayout.tsx) adds or removes `instructions-layout--compare-mode`, which already drives the width transition for the columns.
- [apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx) immediately swaps `FineTuningView` and `CompareView` with a ternary.

That means the layout can animate, but the content cannot: React unmounts one large tree and mounts the other in the same commit.

Essential snippet:

```112:129:apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx
const innerContent = isCompareMode ? (
  <div ...>
    <CompareView ... />
  </div>
) : (
  <FineTuningView ... />
);
```

## Minimal fix

- Update [apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx) to introduce a small local display state separate from raw `isCompareMode`.
- Keep the existing compare-mode layout class behavior unchanged in [apps/operator/src/layouts/instructions-layout/InstructionsLayout.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/InstructionsLayout.tsx), so the column expansion/shrink animation still starts immediately.
- Delay the inner content swap until the right panel finishes its width transition:
  - On open: keep `FineTuningView` visible while the right panel expands, then render `CompareView` after the transition completes.
  - On close: keep `CompareView` visible while the panel shrinks, then restore `FineTuningView` after the transition completes.
- Use `transitionend` on the right-panel element as the primary signal, with a small timeout fallback matching the existing compare duration so the behavior is robust.
- Keep the change surgical: no new store state, no refactor of `CompareView`, and no plan-file edits.

## Validation

- Opening compare should visually expand first, then show compare content instead of cutting immediately.
- Closing compare should visually shrink first, then restore the playground content.
- Existing resize behavior should remain intact.
- History/chat behavior in the V2 playground should remain unchanged outside compare mode.
