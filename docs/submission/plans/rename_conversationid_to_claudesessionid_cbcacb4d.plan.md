---
name: Rename conversationId to claudeSessionId
overview: Rename the `conversationId` field on `IAgentBuilderConversation` to `claudeSessionId` to eliminate confusion with the entity's own `id`. Also fix a related bug in `AgentChatHeader.tsx` where active-item comparison incorrectly uses `conversationId` instead of `id`.
todos:
  - id: rename-field
    content: Rename conversationId to claudeSessionId on interface and store action in useAgentBuilderStore.ts
    status: completed
  - id: update-hook
    content: Update sendCLIMessage call in useAgentBuilder.ts to read claudeSessionId
    status: completed
  - id: fix-header-bug
    content: Fix active-item comparison in AgentChatHeader.tsx to use id instead of conversationId
    status: completed
isProject: false
---

# Rename `conversationId` to `claudeSessionId` on `IAgentBuilderConversation`

## Problem

The `conversationId` field on `IAgentBuilderConversation` stores the Claude SDK session ID, not the conversation's own identifier (that's the `id` field). This causes naming confusion and led to a bug in `AgentChatHeader.tsx` where `conversationId` is used for active-item comparison instead of `id`.

## Changes

### 1. [useAgentBuilderStore.ts](apps/operator/src/stores/useAgentBuilderStore.ts)

- Line 9: Rename field `conversationId?: string` to `claudeSessionId?: string` on `IAgentBuilderConversation`
- Line 98: Update `updateConversationClaudeSessionId` implementation — change `{ ...conv, conversationId: claudeSessionId }` to `{ ...conv, claudeSessionId }`

### 2. [useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)

- Line 234: Update the `sendCLIMessage` call — change `conversationId: currentConversation?.conversationId` to `conversationId: currentConversation?.claudeSessionId` (the API parameter name stays `conversationId` since that's what the backend expects)

### 3. [AgentChatHeader.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentChatHeader.tsx)

- Line 63: Fix the active-item comparison bug — change `conversation.conversationId === selectedConversation.conversationId` to `conversation.id === selectedConversation?.id` (uses the entity `id`, not the Claude session ID which could be `undefined` for new conversations)
