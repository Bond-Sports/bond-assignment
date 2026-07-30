---
name: compare trace tab
overview: Plan the compare-mode Trace tab in operator so it matches the provided design and reuses the existing trace-info API/editor path already used by the right-side trace viewer.
todos:
  - id: derive-trace-turns
    content: Extend useCompareView to derive aligned interaction turns and expose selected interaction state plus previous/next navigation.
    status: completed
  - id: wire-trace-fetching
    content: Fetch current and compare trace payloads with useGetTraceInfo using the selected sessionId/interactionId pairs and normalize them for JsonCodeEditor.
    status: completed
  - id: render-trace-layout
    content: Replace the trace placeholder in CompareView with the two-column JSON compare UI shown in the screenshot.
    status: completed
  - id: style-trace-tab
    content: Add trace-specific SCSS for the interaction label, split editor layout, and empty/loading states.
    status: completed
  - id: validate-trace-tab
    content: Run targeted validation on the touched compare-view files and confirm the trace tab behavior matches the expected compare flow.
    status: completed
isProject: false
---

# Compare Trace Tab Plan

## Goal

Implement the `Trace` tab in [CompareView.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx) as a two-column compare surface that mirrors the screenshot: shared interaction navigation at the top-right, version headers per column, and read-only JSON trace editors for the current thread vs compared version.

## What Is Already True

- [CompareView.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx) already has the `Thread` / `Trace` switch and the two-panel shell for thread compare.
- [useCompareView.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/useCompareView.ts) already provides both message streams: current thread from `taskMessages[currentTaskId]` and compare thread from `taskMessages[compareTaskId]`.
- [message-right-side.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/message-right-side.ts) already exposes `useGetTraceInfo(interactionId, { sessionId })`, which is the correct source of truth for per-interaction trace data.
- [RightSide.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/RightSide/RightSide.tsx) already shows the expected JSON preparation pattern: remove `metadata`, stringify the rest, and render through `JsonCodeEditor`.

## Planned Implementation

### 1. Add compare-trace interaction state in `useCompareView`

Extend [useCompareView.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/useCompareView.ts) so it derives a stable ordered interaction list from the existing message arrays.

Use facts already present in the message model:

- user-turn messages contain `context.interactionId`
- current-side session id is the current `taskId`
- compare-side session id is `compareTaskId`

The hook should compute:

- a normalized `interactions` array keyed by turn order
- `selectedInteractionIndex`
- current-side selected interaction identity `{ interactionId, sessionId }`
- compare-side selected interaction identity `{ interactionId, sessionId }`
- navigation handlers for previous/next interaction

This keeps compare-trace state local to compare mode instead of trying to reuse global `rightSideData`, which only tracks the normal thread selection.

### 2. Fetch trace info per panel from the existing API

Inside compare mode, call `useGetTraceInfo` twice using the selected interaction identities:

- current column: selected current interaction + current `taskId`
- compare column: selected compare interaction + `compareTaskId`

Reuse the same serialization rule from [RightSide.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/RightSide/RightSide.tsx):

- if no trace payload, fall back to `'{}'`
- strip `metadata`
- `JSON.stringify(payload, null, 2)` before passing to `JsonCodeEditor`

This keeps the compare trace viewer consistent with the existing trace-info contract rather than creating a second formatter.

### 3. Replace the trace placeholder UI with the designed layout

Update [CompareView.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx) so the `activeTab === 'trace'` branch renders:

- the same two-column panel layout used by thread compare
- a compact shared interaction indicator in the header area, matching the screenshot intent (`Interaction #n`)
- left panel header with current version label and `CURRENT` chip
- right panel header with selected compare version label
- one read-only `JsonCodeEditor` per panel with copy support and loading state

The search field visible in the screenshot should come from the editor component itself if `JsonCodeEditor` already renders it in read-only mode; do not invent a second search implementation unless the actual component API requires it.

### 4. Add trace-specific empty and loading handling

Handle the real states explicitly:

- no comparable interactions yet
- compare trace still unavailable because compare replay is still running
- missing trace payload for a selected interaction on one side only
- one column loading while the other is already available

The goal is to fail clearly at the data boundary instead of showing a generic “coming soon” placeholder.

### 5. Style the trace tab to match the screenshot without disrupting thread compare

Extend [styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss) with trace-specific classes for:

- compact interaction label placement in the top-right header zone
- editor panel spacing and borders
- dark-editor container sizing inside each column
- empty/loading states that preserve the split layout

Keep the existing `compare-view__panels` structure so the thread tab remains unchanged.

## Files Expected To Change

- [CompareView.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx)
- [useCompareView.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/useCompareView.ts)
- [styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss)

## Validation

- Confirm switching between `Thread` and `Trace` preserves compare mode correctly.
- Confirm interaction navigation updates both trace columns in lockstep.
- Confirm left and right columns query the correct `(sessionId, interactionId)` pairs.
- Confirm trace JSON output matches the existing right-side trace formatting.
- Run targeted lint checks on the touched compare-view files after implementation.

## Key Risk To Watch

The compare thread does not currently have a dedicated selected-interaction store. The safest implementation is to derive aligned interaction turns directly from the current and compare message arrays in [useCompareView.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/useCompareView.ts) rather than coupling compare mode to global `rightSideData`.
