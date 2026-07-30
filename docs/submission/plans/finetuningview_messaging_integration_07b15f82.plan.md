---
name: FineTuningView messaging integration
overview: Enable standard AUI platform messaging inside the FineTuningView panel in AgentBuilder by adding missing CSS overrides, passing proper props, and ensuring task initialization on panel mount.
todos:
  - id: css-overrides
    content: Add FineTuningView layout CSS overrides scoped to .ab-panel__content in agent builder styles.scss
    status: completed
  - id: pass-props
    content: Update AgentBuilder.tsx renderPanelContent to pass customStyle and customHeader to FineTuningView, import useMainContext for createNewTask
    status: completed
  - id: task-init
    content: Add useEffect to ensure a task exists (taskId is set) when the thread panel is open
    status: in_progress
  - id: verify
    content: Run the app and verify ConversationBox appears and messaging works in the agent builder thread panel
    status: pending
isProject: false
---

# Enable FineTuningView Messaging in Agent Builder

## Root Cause

The `FineTuningView` renders its messaging UI (`ConversationBox`, `ConversationMessages`) based on state from `useTaskStore` and `useMainContext`. Both are available to `AgentBuilder` because it sits inside `DashboardLayout` -> `MainProvider`. However, the layout CSS that makes FineTuningView fill its container comes from `[instructions-layout/styles.scss](apps/operator/src/layouts/instructions-layout/styles.scss)`, which is **not** loaded in the agent builder context. The critical rules missing are:

```scss
.conversation-container { height: 100%; }
.thread-container { ... height-related flex rules ... }
.thread-box { margin-top: auto; }
```

Without these, the conversation-container collapses and the ConversationBox is clipped or invisible.

Additionally, the agent builder currently passes bare `<FineTuningView allowShowRightSide={false} />` without `customStyle` or `customHeader`, unlike `[InstructionsRightSideContainer.tsx](apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainer.tsx)` which passes both.

## Changes

### 1. Add CSS overrides in `[styles.scss](apps/operator/src/pages/agent-builder/styles.scss)`

Inside `.ab-panel__content`, scope styles for the FineTuningView's class hierarchy to fill the panel:

```scss
.ab-panel__content {
  // ... existing rules ...

  .conversation-container {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .chat-content {
    flex: 1;
    display: flex;
    width: 100%;
    overflow: auto;
  }

  .chat-container {
    display: flex;
    width: 100%;
    flex: 1;
  }

  .thread-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow: auto;
    border: none;
    margin: 0;
    padding: 0;
  }

  .thread-box {
    margin-top: auto;
    padding: 7px 18px 4px 18px;
  }
}
```

These mirror the essential layout rules from `instructions-layout/styles.scss` and `chat-page/styles.scss`, scoped so they only apply inside agent builder panels.

### 2. Pass `customStyle` and `customHeader` props in `[AgentBuilder.tsx](apps/operator/src/pages/agent-builder/AgentBuilder.tsx)`

In the `renderPanelContent` function, update the `'thread'` case:

- Pass `customStyle={{ border: '0', margin: '0', padding: '0' }}` -- same as [InstructionsRightSideContainer](apps/operator/src/layouts/instructions-layout/partials/InstructionsRightSideContainer.tsx) does at line 68-74.
- Pass a `customHeader` with the thread title and a "New Thread" button that calls `MainContext.createNewTask()`.

This requires importing `useMainContext` inside AgentBuilder (or threading it through `useAgentBuilder`). Since AgentBuilder is already inside `MainProvider`, `useMainContext()` will work.

Reference pattern from `InstructionsRightSideContainer`:

```tsx
<FineTuningView
  customHeader={customHeader}
  customStyle={fineTuningStyle}
  allowShowRightSide={false}
/>
```

### 3. Ensure a task exists when the thread panel is opened

`MainContext.selectInitialTaskOnLoad` runs on mount and creates a task if none exists. However, if the user navigates directly to the agent builder before the task list API responds, there may be a brief period with no `taskId`.

Add a `useEffect` that watches for the thread panel being in `openPanels` and, if `useTaskStore.taskId` is empty, calls `MainContext.createNewTask()`. This ensures a task is always available when the thread panel is visible.

Place this in `[useAgentBuilderSession.ts](apps/operator/src/pages/agent-builder/useAgentBuilderSession.ts)` or a new small hook used by the thread panel.

### 4. Files NOT changed

- `[FineTuningView.tsx](apps/operator/src/widgets/FineTuningView/FineTuningView.tsx)` -- no changes needed; it already renders ConversationBox when `showConversationBox` is true
- `[useFineTuningView.ts](apps/operator/src/widgets/FineTuningView/useFineTuningView.ts)` -- no changes needed
- `[ConversationBox.tsx](apps/operator/src/widgets/ConversationBox/ConversationBox.tsx)` -- no changes needed
- `[MainContext.tsx](apps/operator/src/contexts/MainContext.tsx)` -- no changes needed

## Verification

After implementation, the thread panel in the agent builder should show:

- `ConversationMessages` (empty initially, then populated as messages are exchanged)
- `ConversationBox` (text input with send button at the bottom of the thread container)
- A custom header with thread title and "New Thread" action
