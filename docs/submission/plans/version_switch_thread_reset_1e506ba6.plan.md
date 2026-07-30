---
name: Version Switch Thread Reset
overview: Reset the active playground thread when the selected agent version changes inside the instructions layout, so stale tasks and messages from another version do not remain visible.
todos:
  - id: detect-version-switch-in-layout
    content: Add a guarded same-agent version-change detector to `apps/operator/src/layouts/instructions-layout/useInstructionsLayout.ts`.
    status: completed
  - id: reuse-existing-thread-reset
    content: "Trigger `createNewTask({ isLoading: true })` on real version switches instead of introducing new reset logic."
    status: completed
  - id: verify-no-broad-side-effects
    content: Validate that the reset is limited to instructions/playground behavior and does not alter unrelated version-switch flows.
    status: completed
isProject: false
---

# Reset Playground Thread On Version Switch

## Root cause

- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainer.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainer.tsx)` is passive: it only renders the current `selectedTask` title and `FineTuningView`.
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/useFineTuningView.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/useFineTuningView.ts)` and `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/ConversationMessages/useConversationMessages.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/ConversationMessages/useConversationMessages.ts)` render messages from `taskMessages[taskId]`, so if `taskId` is unchanged the full old conversation remains mounted.
- Version switching currently updates only `currentAgent.selected_version_id` through `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)` and `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/atoms/current-agent-atom.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/atoms/current-agent-atom.ts)`. It does not clear `taskId`, `selectedTask`, or `sessionId`.
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx)` validates task context only by account, network, and organization, not by agent version, so the previous thread is still treated as valid.

## Recommended fix

- Implement the reset in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/useInstructionsLayout.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/useInstructionsLayout.ts)`, not in the global version dropdown.
- Read the selected version from `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useEffectiveAgentVersion.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useEffectiveAgentVersion.ts)`.
- Add a guarded effect that detects a real version switch for the same agent after initial mount, then calls `createNewTask({ isLoading: true })`.
- Use refs to avoid false positives on first render and on agent changes. The reset should run only when:
  - the agent id stays the same, and
  - the effective `selectedVersionId` actually changes.
- Let `createNewTask()` do the reset work because it already clears `selectedTask`, creates a fresh `taskId`, and removes `sessionId` / `messageId` from the URL in one place. That keeps the fix small and consistent with existing thread-reset behavior.

## Why this is the safest small fix

- It is scoped to the instructions playground UX where the bug is visible.
- It avoids changing global `VersionDropdown` semantics for every page that can switch versions.
- It avoids widening `isTaskInCurrentContext()` with version logic before we have confirmed the backend task payload exposes a reliable version identifier for all task types.
- It reuses the existing reset path instead of introducing a second, slightly different way to clear thread state.

## Validation

- Switch versions on the same agent while a thread is open and confirm the old thread title and all old messages disappear.
- Confirm the URL no longer retains the previous `sessionId` after the switch.
- Confirm a fresh thread is created and the playground remains usable without extra clicks.
- Confirm agent changes do not trigger duplicate resets beyond the normal existing flow.
- Run diagnostics on `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/useInstructionsLayout.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/layouts/instructions-layout/useInstructionsLayout.ts)` after the change.
