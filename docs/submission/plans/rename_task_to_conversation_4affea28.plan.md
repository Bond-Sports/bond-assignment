---
name: Rename task to conversation
overview: 'Rename all "task"-related identifiers to "conversation" across the 4 files that use them: the store definition, the hook, the header component, and the main AgentBuilder component.'
todos:
  - id: rename-store
    content: Rename all task-related identifiers in useAgentBuilderStore.ts to conversation equivalents
    status: completed
  - id: rename-hook
    content: Rename all task-related identifiers in useAgentBuilder.ts hook
    status: completed
  - id: rename-header
    content: Rename task-related props and references in AgentChatHeader.tsx
    status: completed
  - id: rename-builder
    content: Rename task-related prop passing in AgentBuilder.tsx
    status: completed
isProject: false
---

# Rename "Task" to "Conversation" in Agent Builder

## Scope

Only **4 files** use task-related identifiers from the store. All other consumers (`useBaseModel.tsx`, `CLISessionKeeper.tsx`, `useHeader.ts`, `useMessage.ts`, etc.) only use non-task identifiers like `isAgentVisible` or `isBaseModelCodeMode`.

## Rename Mapping

| Current                    | New                                 |
| -------------------------- | ----------------------------------- |
| `IAgentBuilderTask`        | `IAgentBuilderConversation`         |
| `agentTasksList`           | `conversationsList`                 |
| `setAgentTasksList`        | `setConversationsList`              |
| `selectedAgentTaskId`      | `selectedConversationId`            |
| `setSelectedAgentTaskId`   | `setSelectedConversationId`         |
| `messagesByTaskId`         | `messagesByConversationId`          |
| `setMessagesForTask`       | `setMessagesForConversation`        |
| `appendMessagesToTask`     | `appendMessagesToConversation`      |
| `updateMessageInTask`      | `updateMessageInConversation`       |
| `updateTaskConversationId` | `updateConversationClaudeSessionId` |
| `updateTaskTitle`          | `updateConversationTitle`           |
| `defaultAgentTasks`        | `defaultConversations`              |
| `selectedTask` (computed)  | `selectedConversation`              |
| `isTaskDropdownOpen`       | `isConversationDropdownOpen`        |
| `handleToggleTaskDropdown` | `handleToggleConversationDropdown`  |
| `handleSelectTask`         | `handleSelectConversation`          |
| `handleCreateTask`         | `handleCreateConversation`          |
| `freshTask` (local var)    | `freshConversation`                 |
| `isCreateDisabled` prop    | stays the same (not task-specific)  |

**Not renamed:** The `conversationId` field on `IAgentBuilderConversation` stays as `conversationId` per user preference. The `id` field on the entity continues to be the internal identifier used as `selectedConversationId`.

## Files to Change

### 1. [useAgentBuilderStore.ts](apps/operator/src/stores/useAgentBuilderStore.ts)

- Rename the interface `IAgentBuilderTask` to `IAgentBuilderConversation`
- Rename all state properties, action names, and internal references per the mapping above
- Rename `defaultAgentTasks` constant to `defaultConversations`, update its ID prefix from `agent-task-new` to `agent-conversation-new`

### 2. [useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)

- Update the import: `IAgentBuilderTask` to `IAgentBuilderConversation`
- Rename all store selector references per the mapping
- Rename local state: `isTaskDropdownOpen` to `isConversationDropdownOpen`, `setIsTaskDropdownOpen` to `setIsConversationDropdownOpen`
- Rename local functions: `handleToggleTaskDropdown`, `handleSelectTask`, `handleCreateTask` to their conversation equivalents
- Rename local variables: `freshTask` to `freshConversation`, `selectedTask` to `selectedConversation`, `taskId` to `convId`
- Update the returned `state`, `actions` object keys accordingly
- Update ID prefixes in template strings from `agent-task-new-` to `agent-conversation-new-`

### 3. [AgentChatHeader.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentChatHeader.tsx)

- Update the import: `IAgentBuilderTask` to `IAgentBuilderConversation`
- Rename props interface: `tasks` to `conversations`, `isTaskDropdownOpen` to `isConversationDropdownOpen`, `handleToggleTaskDropdown` to `handleToggleConversationDropdown`, `handleCreateTask` to `handleCreateConversation`, `handleSelectTask` to `handleSelectConversation`
- Update all internal references to use the new prop names
- Update aria-label from "Create new task" to "Create new conversation"

### 4. [AgentBuilder.tsx](apps/operator/src/widgets/AgentBuilder/AgentBuilder.tsx)

- Update prop names passed to `AgentChatHeader`: `tasks` to `conversations`, `selectedTaskTitle` to `selectedConversationTitle`, and all handler prop names per the mapping
- Update the fallback: `state.selectedTask?.title` to `state.selectedConversation?.title`
