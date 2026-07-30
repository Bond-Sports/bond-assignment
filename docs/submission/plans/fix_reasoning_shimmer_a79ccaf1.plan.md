---
name: Fix reasoning shimmer
overview: Adjust the `AgentReasoningBlock` streaming title shimmer so it behaves like a clipped highlight sweep instead of a moving background wash over the text, while preserving the existing done/reduced-motion states.
todos:
  - id: adjust-shimmer-gradient
    content: Refine the streaming title gradient, size, and keyframes in `apps/operator/src/widgets/AgentBuilder/styles.scss` to create a narrow clipped shimmer sweep.
    status: completed
  - id: preserve-fallback-states
    content: Keep `done` and `prefers-reduced-motion` behavior visually correct after the shimmer change.
    status: completed
  - id: lint-check
    content: Run lints on the updated file and fix any introduced issues.
    status: completed
isProject: false
---

# Fix Reasoning Title Shimmer

## Goal

Update the streaming `Thinking` title shimmer in [apps/operator/src/widgets/AgentBuilder/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/styles.scss) so the animation matches the intended effect from the reference CSS: a narrow light sweep clipped to the text, with the text remaining readable the whole time.

## Findings

The relevant markup already scopes the effect correctly in [apps/operator/src/widgets/AgentBuilder/partials/AgentReasoningBlock.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/partials/AgentReasoningBlock.tsx): the shimmer is applied only to `.agent-reasoning-block__title[data-status='streaming']`.

The current SCSS uses a very large gradient and transparent text fill:

```713:745:apps/operator/src/widgets/AgentBuilder/styles.scss
&__title {
  display: inline-block;
  color: $gray-10;
  // ...

  &[data-status='streaming'] {
    background-image: linear-gradient(
      110deg,
      rgba($gray-20, 0.72) 0%,
      rgba($white, 0.98) 42%,
      rgba($gray-14, 0.9) 58%,
      rgba($gray-20, 0.72) 100%
    );
    background-size: 250% 100%;
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    animation: agent-reasoning-title-shimmer 2s linear infinite;
  }
}
```

That combination causes the moving background to dominate the glyph area instead of producing a slim shimmer streak.

## Proposed Change

1. Keep the shimmer on the existing title element in [apps/operator/src/widgets/AgentBuilder/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/styles.scss); no TSX change is needed unless visual testing proves otherwise.
2. Rework the `streaming` state to follow the reference effect more closely:

- use a darker/static base text appearance
- use a much narrower background sweep via a smaller `background-size`
- shape the gradient so only a thin bright band passes over the text
- animate left-to-right rather than sweeping an oversized full-width wash across the letters

3. Preserve the existing `done` state and the `prefers-reduced-motion` fallback, only updating colors if needed so the non-animated state still has correct contrast.
4. Run lints for the touched file after the edit.

## Validation

- Confirm the `Thinking` title remains legible while streaming.
- Confirm the shimmer appears as a narrow highlight, not a full text-covering overlay.
- Confirm `data-status='done'` still renders as static text.
- Confirm reduced-motion still disables the animation cleanly.
