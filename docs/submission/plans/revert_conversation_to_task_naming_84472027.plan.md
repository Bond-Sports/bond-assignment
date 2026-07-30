---
name: Revert conversation to task naming
overview: Rename all "conversation" terminology back to "task" across the agent builder feature (store, hook, header component, and parent component), while preserving the new features added during the rename (claudeSessionId tracking, dynamic titles, empty-task guard, conversation continuation).
todos:
  - id: rename-store
    content: Rename all conversation -> task identifiers in useAgentBuilderStore.ts (interface, state, actions, defaults)
    status: completed
  - id: rename-hook
    content: Rename all conversation -> task identifiers in useAgentBuilder.ts (destructuring, handlers, local vars, return object)
    status: completed
  - id: rename-header
    content: Rename all conversation -> task identifiers in AgentChatHeader.tsx (import, props, JSX)
    status: completed
  - id: rename-parent
    content: Rename all conversation -> task prop names in AgentBuilder.tsx
    status: completed
  - id: verify-lints
    content: Run linter on all four files to confirm no errors
    status: completed
isProject: false
---

# Revert "conversation" naming back to "task" across Agent Builder

## Scope

Four files need renaming. The new features (claude session ID tracking, dynamic titles, `hasEmptyConversation` guard) must be preserved -- only the identifiers change.

## 1. Store: [useAgentBuilderStore.ts](apps/operator/src/stores/useAgentBuilderStore.ts)

**Interface rename:**

- `IAgentBuilderConversation` -> `IAgentBuilderTask`
- Field `claudeSessionId` stays as-is (it is not a naming-convention issue)

**State and action renames:**

- `conversationsList` -> `agentTasksList`
- `selectedConversationId` -> `selectedAgentTaskId`
- `messagesByConversationId` -> `messagesByTaskId`
- `setConversationsList` -> `setAgentTasksList`
- `setSelectedConversationId` -> `setSelectedAgentTaskId`
- `setMessagesForConversation` -> `setMessagesForTask`
- `appendMessagesToConversation` -> `appendMessagesToTask`
- `updateMessageInConversation` -> `updateMessageInTask`
- `updateConversationClaudeSessionId` -> `updateTaskClaudeSessionId`
- `updateConversationTitle` -> `updateTaskTitle`

**Default constant:**

- `defaultConversations` -> `defaultAgentTasks`
- Default ID prefix: `'agent-conversation-new'` -> `'agent-task-new'`

**Action implementations:** parameter names `conversationId` in the action signatures become `taskId` (except where they refer to the Claude session ID).

## 2. Hook: [useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)

**Destructured store bindings (lines 23-57):** rename every destructured name to match the store renames above.

**Derived state:**

- `selectedConversation` -> `selectedTask`
- `isConversationDropdownOpen` / `setIsConversationDropdownOpen` -> `isTaskDropdownOpen` / `setIsTaskDropdownOpen`

**Handler renames:**

- `handleToggleConversationDropdown` -> `handleToggleTaskDropdown`
- `handleSelectConversation` -> `handleSelectTask`
- `handleCreateConversation` -> `handleCreateTask`

**Local variable in handlers:**

- `convId` -> `taskId` (inside `handleSendMessage`, `handleSubmitAnswer`, identity-change effect)
- `currentConversation` -> `currentTask`
- `freshConversation` -> `freshTask`
- ID prefix in `handleCreateConversation`: `'agent-conversation-new-'` -> `'agent-task-new-'`

**Return object:**

- `state.conversationsList` -> `state.agentTasksList`
- `state.selectedConversation` -> `state.selectedTask`
- `state.isConversationDropdownOpen` -> `state.isTaskDropdownOpen`
- `actions.handleToggleConversationDropdown` -> `actions.handleToggleTaskDropdown`
- `actions.handleSelectConversation` -> `actions.handleSelectTask`
- `actions.handleCreateConversation` -> `actions.handleCreateTask`
- `computed.hasEmptyConversation` -> `computed.hasEmptyTask`

## 3. Header: [AgentChatHeader.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentChatHeader.tsx)

**Import:** `IAgentBuilderConversation` -> `IAgentBuilderTask`

**Props interface and destructuring:**

- `conversations` -> `tasks`
- `selectedConversation` -> `selectedTask`
- `isConversationDropdownOpen` -> `isTaskDropdownOpen`
- `handleToggleConversationDropdown` -> `handleToggleTaskDropdown`
- `handleCreateConversation` -> `handleCreateTask`
- `handleSelectConversation` -> `handleSelectTask`

**JSX references:** update all prop usages (`selectedConversation.title` -> `selectedTask.title`, `conversations.map` -> `tasks.map`, etc.)

**aria-label:** `"Create new conversation"` -> `"Create new task"`

## 4. Parent: [AgentBuilder.tsx](apps/operator/src/widgets/AgentBuilder/AgentBuilder.tsx)

Update all prop names passed to `AgentChatHeader` to match the new task-based names:

- `conversations=` -> `tasks=`
- `selectedConversation=` -> `selectedTask=`
- `isConversationDropdownOpen=` -> `isTaskDropdownOpen=`
- `handleToggleConversationDropdown=` -> `handleToggleTaskDropdown=`
- `handleCreateConversation=` -> `handleCreateTask=`
- `handleSelectConversation=` -> `handleSelectTask=`
- `computed.hasEmptyConversation` -> `computed.hasEmptyTask`

## What stays unchanged

- `claudeSessionId` field name on the interface (correctly named)
- `sessionId` wire key in `cliConnectionApi.ts` (backend contract)
- `conversationId` parameter on `ICLISendMessageOptions` (API layer name, maps to `sessionId` on wire)
- All new features: session ID tracking, dynamic titles, empty-task guard, functional updater pattern
- CSS class names (they still use `agent-chat-header__task-button` etc.)
