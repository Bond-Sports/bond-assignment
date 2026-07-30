---
name: Fix question card ordering
overview: Split the agent text message around question tool calls so that question cards appear in the correct chronological position within the conversation, with agent text before and after them rendered as separate messages.
todos:
  - id: split-assistant-msg
    content: "In useAgentBuilder.ts handleSendMessage: change assistantMessageId to let, add needsNewAssistantMessage flag, finalize current assistant and set flag when question arrives, create new assistant placeholder lazily when text follows"
    status: completed
  - id: fix-empty-render
    content: "In AgentConversationMessages.tsx: update render condition to skip empty finalized agent messages (no text + not loading)"
    status: completed
isProject: false
---

# Fix Question Card Message Ordering

## Problem

`assistantMessageId` in [`useAgentBuilder.ts`](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) is a `const` (line 198). All streamed text accumulates into a single agent message created before streaming starts. Question cards are appended after this message, so they always appear below all agent text -- even text that logically came after the question in the stream.

## Solution

When a question tool event arrives mid-stream, finalize the current agent text message and lazily create a new one for any text that follows. This splits the agent text around question cards.

### Changes to [`useAgentBuilder.ts`](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)

In `handleSendMessage` (starting at line 193):

1. **Change `const assistantMessageId` to `let`** (line 198) so it can be reassigned
2. **Add a `needsNewAssistantMessage` flag** (boolean, starts `false`)
3. **When a question event arrives** (lines 243-262), after appending the question message:
   - Call `finishAssistantMessage(taskId, assistantMessageId)` to finalize the current agent text
   - Set `needsNewAssistantMessage = true`
4. **When a text event arrives** (lines 265-272), before appending text:
   - If `needsNewAssistantMessage` is `true`, create a new assistant placeholder, append it to the task, update `assistantMessageId`, and reset the flag
5. **On `done` event** (line 277): finalize the current `assistantMessageId` as before (this is already the case)

### Changes to [`AgentConversationMessages.tsx`](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx)

**Handle empty finalized agent messages**: If a question arrives before any text, the initial agent placeholder gets finalized with empty text. The current render condition `(message.text || !message.isLoading)` would render an empty bubble. Fix by adding `message.text` to the condition:

```tsx
{message.text ? (
  <AgentChatMessage ... />
) : (
  message.isLoading && message.role === 'agent' && <AgentReasoning />
)}
```

This ensures:

- Agent messages with text render normally (regardless of loading state)
- Agent messages with no text only show the reasoning spinner while loading
- Empty finalized agent messages are skipped entirely

### Result

The messages array will now look like:

```
[0] user message
[1] agent text (text BEFORE the question)
[2] question card
[3] agent text (text AFTER the question, only if text follows)
```

If a question arrives before any text, the initial placeholder is empty and finalized -- the rendering change ensures it's hidden. The new assistant message for post-question text is only created when actual text arrives (lazy), avoiding trailing empty messages.
