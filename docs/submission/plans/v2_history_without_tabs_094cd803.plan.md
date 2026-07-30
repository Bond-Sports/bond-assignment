---
name: V2 history without tabs
overview: Keep the history control as a header button (no Chat/All Threads tabs), render thread history inline under the header so V1 task-list SCSS applies, and drive existing FineTuningView behavior via selectedThreadTab only from V2—no changes to FineTuningView until a post-V2 cleanup task.
todos:
  - id: v2-inline-history
    content: "Refactor InstructionsRightSideContainerV2: customHeader = PlaygroundHeaderV2 + conditional thread-header__threads-panel; pass selectedThreadTab from showHistory; drop FloatingView siblings."
    status: completed
  - id: clear-compare-hooks
    content: Ensure clear and compare paths close history; keep useInstructionsSidesV2 compare closeHistory behavior.
    status: completed
  - id: scss-tune
    content: Only add instructions-layout SCSS if header+panel layout needs spacing after inline history.
    status: completed
isProject: false
---

# V2 thread history: header button, no tabs

## Constraint (per product scope)

**Do not change `[FineTuningView.tsx](apps/operator/src/widgets/FineTuningView/FineTuningView.tsx)`.** Renaming `selectedThreadTab` or adding a clearer prop is deferred until after version 2 ships.

## Why `selectedThreadTab` still matters (without tabs in the UI)

`[FineTuningView.tsx](apps/operator/src/widgets/FineTuningView/FineTuningView.tsx)` uses:

```52:52:apps/operator/src/widgets/FineTuningView/FineTuningView.tsx
  const isChatTab = selectedThreadTab !== 'Threads';
```

V1 passes the **Tabs** selected key (`'Chat' | 'Threads'`). V2 will **not** render tabs, but when history is open it must still pass the same sentinel so chat body (messages, input, chat-only loading) stays hidden.

**V2-only mapping (call site only, no component edits):**

- `selectedThreadTab={showHistory ? 'Threads' : 'Chat'}`

The string `'Threads'` is only a legacy signal to `FineTuningView`, not a visible tab. A short comment next to the prop in V2 is enough until the post-V2 API cleanup.

## Implementation (instructions V2 only)

### 1. Inline history + header button

In `[InstructionsRightSideContainerV2.tsx](apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainerV2.tsx)`:

- Keep `[useInstructionsSidesV2](apps/operator/src/layouts/instructions-layout/partials/useInstructionsSidesV2.ts)` for `showHistory` / `toggleHistory` / `closeHistory`.
- Build `customHeader` as one column:
  - Wrapper: `thread-header` (reuse V1 flex; add `thread-header--with-tabs` only if needed for layout—verify against `[styles.scss](apps/operator/src/layouts/instructions-layout/styles.scss)`).
  - `[PlaygroundHeaderV2](apps/operator/src/widgets/FineTuningView/partials/PlaygroundHeaderV2.tsx)` with `onHistoryClick={toggleHistory}`.
  - When `showHistory`: `div.thread-header__threads-panel` → `TaskListing` with `onSelectTask={closeHistory}`.
- Remove sibling `[FloatingView](apps/operator/src/widgets/FineTuningView/partials/FloatingView.tsx)` usage from both resizable and non-resizable branches.

### 2. Wire `FineTuningView` without editing its file

From V2 container only, pass:

- `selectedThreadTab={showHistory ? 'Threads' : 'Chat'}`

Omitting this was why overlay-only history could stack chat + list incorrectly once history is inline.

### 3. Clear / compare

- **Clear:** V2 `clearButton.onClear` should also call `closeHistory()` (like V1 resets tab to Chat).
- **Compare:** keep `handleCompareSelect` calling `closeHistory()` before `setCompareVersionId` in the hook.

### 4. SCSS

- Prefer existing `.thread-header__threads-panel` rules.
- Add minimal `.instructions-layout` overrides only if `PlaygroundHeaderV2` + inline panel need spacing or borders.

## Validation

- History toggles only via header button; no tab row.
- With history open, chat body hidden; closed, chat shows (via existing `FineTuningView` logic + V2 `selectedThreadTab` mapping).
- Task listing matches V1 styling under `.thread-header__threads-panel`.
- Compare mode unchanged.

## Follow-up (explicitly out of scope for this task)

- Refactor `FineTuningView` to a boolean or `threadMainView`-style prop and remove `'Threads'` / `'Chat'` magic strings after V2.
