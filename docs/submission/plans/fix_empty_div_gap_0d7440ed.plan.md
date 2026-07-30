---
name: Fix empty div gap
overview: Stop eagerly appending a placeholder assistant message when sending. Move isSendingMessage to the zustand store so AgentConversationMessages can read it directly and show AgentReasoning without a phantom message.
todos:
  - id: stop-eager-append
    content: In handleSendMessage, only append the user message. Initialize currentAssistantId to null. Remove the eager assistant placeholder.
    status: completed
  - id: move-isSendingMessage-to-store
    content: Move isSendingMessage and setIsSendingMessage from local useState in useAgentBuilder to useAgentBuilderStore.
    status: completed
  - id: show-loading-from-store
    content: In AgentConversationMessages, read isSendingMessage from the store and render AgentReasoning at the bottom when sending and no agent response has started yet.
    status: completed
isProject: false
---

# Fix Empty Div Gap in AgentConversationMessages

## Root Cause

In `[useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)` line 207-210, `handleSendMessage` eagerly appends **two** messages at once: the user message and a placeholder assistant message (`text: ''`, `isLoading: true`). This assistant placeholder exists solely to show the `AgentReasoning` loading indicator.

When a `question` tool event arrives before any text is streamed, `finishAssistantMessage` (line 252) sets `isLoading: false` on that placeholder but leaves it in the array with empty text. This message then renders an empty `<div>` wrapper in `[AgentConversationMessages.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx)` (line 75), and the parent's `gap: 24px` creates a visible spacing artifact.

The fix: stop creating the assistant placeholder message in the first place, and derive the loading indicator from the store instead.

## Fix

### 1. Stop eagerly appending the assistant placeholder

In `[useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)`, in `handleSendMessage`:

- Only append the **user message** (remove the assistant placeholder from the `appendMessagesToTask` call on lines 207-210)
- Initialize `currentAssistantId` to `null` instead of a generated ID (line 199)
- The existing code at lines 275-278 already handles creating a new assistant message when `currentAssistantId` is null and a text event arrives
- The question handler guard at line 252 (`if (currentAssistantId)`) already handles null, so no empty message to finish

### 2. Move `isSendingMessage` to the zustand store

In `[useAgentBuilderStore.ts](apps/operator/src/stores/useAgentBuilderStore.ts)`:

- Add `isSendingMessage: boolean` and `setIsSendingMessage: (v: boolean) => void` to the store interface and implementation

In `[useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)`:

- Remove the local `const [isSendingMessage, setIsSendingMessage] = useState(false)` (line 20)
- Consume `isSendingMessage` and `setIsSendingMessage` from the store instead

### 3. Show AgentReasoning from store instead of phantom message

In `[AgentConversationMessages.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx)`:

- Read `isSendingMessage` directly from `useAgentBuilderStore`
- Remove the per-message `AgentReasoning` render (line 88: `{message.role === 'agent' && message.isLoading && !message.text && <AgentReasoning />}`)
- After the messages map, conditionally render `<AgentReasoning />` when `isSendingMessage` is true and no agent response has started streaming yet (last message is from user, or last agent message has no text)

## Files Changed

- `[useAgentBuilderStore.ts](apps/operator/src/stores/useAgentBuilderStore.ts)` - Add `isSendingMessage` / `setIsSendingMessage`
- `[useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)` - Remove eager assistant append; init `currentAssistantId` to null; use store for `isSendingMessage`
- `[AgentConversationMessages.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx)` - Read `isSendingMessage` from store; show loading at bottom instead of per-message
