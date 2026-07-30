---
name: smoke-test-visibility
overview: Fix smoke-test UI state so already-seen smoke tests do not reappear after reload, while new/running tests still appear during the active run and test groups close when a new thread starts.
todos:
  - id: store-lifecycle
    content: Change smoke store persistence and updateRunTasks lifecycle so seen tasks do not resurrect active UI state.
    status: completed
  - id: new-thread-close
    content: Wire the new close action into Agent Builder and right-side new-thread flows while preserving seenTaskIds.
    status: completed
  - id: validate-behavior
    content: Run lint and manually verify reload, active smoke run, and new-thread close behavior.
    status: completed
isProject: false
---

# Smoke Test Visibility Fix

## Findings

The issue is caused by the state model in `[apps/operator/src/stores/useSmokeTestStore.ts](apps/operator/src/stores/useSmokeTestStore.ts)`:

- `seenTaskIds` is persisted and used only to filter `newTasks` before adding `pendingTasks`.
- `tasksByRunId`, `runIdByMessageId`, and `verdicts` are also persisted.
- `[SmokeTasksBox](apps/operator/src/widgets/AgentBuilder/partials/SmokeTasksBox.tsx)` renders directly from `runIdByMessageId` and `tasksByRunId`, so it can show old tests after reload even when those task IDs are already in `seenTaskIds`.
- `[InstructionsRightSideContainer](apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainer.tsx)` renders tab groups from `pendingTasks`, so `seenTaskIds` protects that path only while the seen set is preserved.
- `resetForNewInteraction()` clears only `pendingTasks` and increments `resetSignal`; it does not clear the persisted run/message maps that drive `SmokeTasksBox`.
- The Agent Builder `+ New` path currently calls `reset()`, which clears `seenTaskIds`; that can make already-seen smoke tasks eligible to pop again if the backend poll reports them again.

## Implementation Plan

1. Update `[useSmokeTestStore.ts](apps/operator/src/stores/useSmokeTestStore.ts)` so only `seenTaskIds` is persisted. Treat `tasksByRunId`, `runIdByMessageId`, and `verdicts` as active in-memory UI state instead of reload-restored UI state.
2. Tighten `updateRunTasks()` so an already-seen run cannot be resurrected after reload. If the incoming run has no unseen task IDs and is not already present in the current in-memory `tasksByRunId`, return the existing state instead of rewriting `tasksByRunId` / `runIdByMessageId`.
3. Add or adjust a close action in `[useSmokeTestStore.ts](apps/operator/src/stores/useSmokeTestStore.ts)` for the “new thread” behavior: clear active UI state (`pendingTasks`, `tasksByRunId`, `runIdByMessageId`, `verdicts`, `resetSignal`) but preserve `seenTaskIds`.
4. Replace the Agent Builder manual new-thread call in `[useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)` from the full `reset()` to the new close action, so new threads close the smoke UI without forgetting what has already been seen.
5. Keep `[InstructionsRightSideContainer.tsx](apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainer.tsx)` using `resetSignal` for local group cleanup. If needed, call the close action directly in `handleNewThread` before `handleClearClick()` so the right panel closes immediately and consistently.
6. Leave `[SmokeTasksBox.tsx](apps/operator/src/widgets/AgentBuilder/partials/SmokeTasksBox.tsx)` structurally unchanged unless validation shows it still needs a guard. Its data source will stop being restored/resurrected by the store.

## Validation

- Run `nx lint operator` or the narrowest available operator lint target.
- Manually verify:
  - New smoke tasks appear in the right-side group and conversation box while running.
  - Reloading the page does not show already-seen smoke tasks.
  - Creating a new thread closes the smoke groups.
  - Starting a fresh smoke run still shows new tasks.
