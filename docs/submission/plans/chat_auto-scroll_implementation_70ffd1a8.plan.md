---
name: Chat auto-scroll implementation
overview: Add auto-scroll behavior to the Agent Builder chat so that the messages container scrolls to the bottom whenever a new message is added or an assistant message streams new content.
todos:
  - id: auto-scroll
    content: Add useRef, useEffect, and sentinel div to AgentConversationMessages for auto-scroll on new messages and during streaming
    status: completed
isProject: false
---

# Chat Auto-Scroll on New Message

## Current State

- The scrollable container is `.agent-conversation-messages` in [`AgentConversationMessages.tsx`](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx), which has `overflow-y: auto` set in [`styles.scss`](apps/operator/src/widgets/AgentBuilder/styles.scss) (line 274).
- Messages are stored in Zustand via `messagesByTaskId` and derived in [`useAgentBuilder.ts`](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) (line 43): `const messages = messagesByTaskId[selectedAgentTaskId] ?? []`.
- During streaming, `updateMessageInTask` (store line 71-76) replaces the array via `.map()`, so the `messages` reference changes on every chunk -- this is what we can leverage to trigger scroll.
- There is currently zero scroll management logic anywhere in this widget.

## Implementation

Modify [`AgentConversationMessages.tsx`](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx) only:

1. Add a `useRef` for a sentinel `<div>` placed at the bottom of the messages list
2. Add a `useEffect` that calls `scrollIntoView` on the sentinel whenever:
   - A new message is added (user sends a message, assistant placeholder appears)
   - Streaming text updates the last message (each chunk triggers a new `messages` reference)
3. Use `messages.length` and `lastMessage.text` as effect dependencies to cover both cases (new messages and streaming content growth)
4. Use `scrollIntoView({ behavior: 'smooth' })` for the initial scroll on new message count change, and `scrollIntoView({ behavior: 'instant' })` during streaming chunks to avoid choppy smooth-scroll stacking

The component will look roughly like:

```tsx
const AgentConversationMessages = ({ messages }: IProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  useEffect(() => {
    const isNewMessage = messages.length !== prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    bottomRef.current?.scrollIntoView({
      behavior: isNewMessage ? 'smooth' : 'instant',
    });
  }, [messages.length, messages[messages.length - 1]?.text]);

  return (
    <div className="agent-conversation-messages">
      {messages.map((message) => (
        <div key={message.id}>
          {(message.text || !message.isLoading) && (
            <AgentChatMessage ... />
          )}
          {message.role === 'agent' && message.isLoading && <AgentReasoning />}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
```

## Files Changed

- [`apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx`](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx) -- add ref, useEffect, and sentinel div
