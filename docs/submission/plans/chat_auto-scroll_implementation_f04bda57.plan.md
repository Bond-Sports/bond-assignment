---
name: Chat auto-scroll implementation
overview: Add auto-scroll behavior to the Agent Builder chat so that when a new assistant message appears, the view smoothly scrolls to its top -- but if the user manually scrolls during the animation, the programmatic scroll is cancelled.
todos:
  - id: auto-scroll
    content: Add ref on last agent message, containerRef on scroll container, user-scroll detection via wheel/touch listeners, and useEffect to trigger cancellable smooth scroll on new messages
    status: completed
isProject: false
---

# Chat Auto-Scroll to Assistant Message Top (User-Interruptible)

## Current State

- The scrollable container is `.agent-conversation-messages` in `[AgentConversationMessages.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx)`, which has `overflow-y: auto` in `[styles.scss](apps/operator/src/widgets/AgentBuilder/styles.scss)` (line 274).
- Messages are stored in Zustand via `messagesByTaskId`. During streaming, the array reference changes on every chunk but `length` stays the same.
- There is currently zero scroll management logic anywhere in this widget.
- Messages always come in pairs: user message followed by agent message (see `handleSendMessage` in `[useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)` lines 191-194).

## Implementation

Modify `[AgentConversationMessages.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx)` only.

### Approach

1. `**containerRef**` -- ref on the `.agent-conversation-messages` div (the scrollable container)
2. `**lastAgentMessageRef**` -- ref on the last agent message's wrapper div
3. `**isAutoScrollingRef**` -- mutable ref boolean that tracks whether a programmatic scroll is in progress
4. **User-scroll detection** -- attach `wheel` and `touchmove` event listeners to the container. When either fires while `isAutoScrollingRef.current` is true, the user is scrolling during our animation. We detect this and cancel by re-setting `scrollTop` to current position (effectively stopping the smooth scroll by doing an instant scroll to "here").
5. `**useEffect` on `messages.length**` -- when message count changes:

- Set `isAutoScrollingRef.current = true`
- Call `lastAgentMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- Use a `scroll` event listener on the container to detect when scrolling has finished (no `scroll` event for ~100ms = animation done), then set `isAutoScrollingRef.current = false`

### Cancellation mechanism

`scrollIntoView({ behavior: 'smooth' })` cannot be cancelled via API. The standard workaround: when the user scrolls (wheel/touch), we call `container.scrollTop = container.scrollTop` which interrupts the smooth scroll by setting an instant scroll to the current position, effectively freezing it in place.

### Sketch

```tsx
const AgentConversationMessages = ({ messages }: IProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastAgentMessageRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cancelAutoScroll = () => {
      if (isAutoScrollingRef.current) {
        container.scrollTop = container.scrollTop;
        isAutoScrollingRef.current = false;
      }
    };

    container.addEventListener('wheel', cancelAutoScroll, { passive: true });
    container.addEventListener('touchmove', cancelAutoScroll, { passive: true });

    return () => {
      container.removeEventListener('wheel', cancelAutoScroll);
      container.removeEventListener('touchmove', cancelAutoScroll);
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0 || !lastAgentMessageRef.current || !containerRef.current) return;

    isAutoScrollingRef.current = true;
    lastAgentMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const container = containerRef.current;
    let scrollEndTimer: ReturnType<typeof setTimeout>;

    const onScroll = () => {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(() => {
        isAutoScrollingRef.current = false;
        container.removeEventListener('scroll', onScroll);
      }, 100);
    };

    container.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(scrollEndTimer);
      container.removeEventListener('scroll', onScroll);
      isAutoScrollingRef.current = false;
    };
  }, [messages.length]);

  const lastAgentIndex = messages.findLastIndex((m) => m.role === 'agent');

  return (
    <div className="agent-conversation-messages" ref={containerRef}>
      {messages.map((message, index) => (
        <div
          key={message.id}
          ref={index === lastAgentIndex ? lastAgentMessageRef : undefined}
        >
          {(message.text || !message.isLoading) && (
            <AgentChatMessage ... />
          )}
          {message.role === 'agent' && message.isLoading && <AgentReasoning />}
        </div>
      ))}
    </div>
  );
};
```

### Key behaviors

- **User sends message**: `messages.length` changes, effect fires, smooth-scrolls the agent message top into view
- **Streaming chunks**: `messages.length` unchanged, no scroll triggered, user reads naturally
- **User scrolls during animation**: `wheel`/`touchmove` detected, `scrollTop = scrollTop` freezes the smooth scroll instantly, `isAutoScrollingRef` reset to false
- **Animation finishes naturally**: `scroll` events stop for 100ms, timer fires, `isAutoScrollingRef` reset to false
- `**block: 'start'**`: aligns the top of the assistant message to the top of the scroll container

## Files Changed

- `[apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx)` -- add containerRef, lastAgentMessageRef, user-scroll detection, cancellable auto-scroll effect
