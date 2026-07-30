---
name: Interaction badge on messages
overview: Add an interaction reference badge to user message bubbles in the Agent Builder chat, so when a user sends a message that was triggered from a specific interaction, the badge persists on the message bubble as a visual reference.
todos:
  - id: add-interaction-field
    content: Add interactionNumber to IAgentMessage interface in useAgentBuilder.ts and AgentConversationMessages.tsx
    status: completed
  - id: capture-interaction
    content: Capture selectedThreadMessage.interactionNumber when creating user message in handleSendMessage
    status: completed
  - id: pass-and-render
    content: Pass interactionNumber through AgentConversationMessages to AgentChatMessage and render the badge
    status: completed
  - id: style-badge
    content: Add badge styles to styles.scss
    status: completed
isProject: false
---

# Interaction badge on Agent Builder user messages

## Current flow

1. User clicks a message in the conversation view -> `handleSelectThreadMessage` in [useMessage.ts](apps/operator/src/widgets/ConversationMessages/partials/Message/useMessage.ts) sets `selectedThreadMessage` (with `interactionNumber`) in the store and opens Agent Builder.
2. [AgentConversationBox.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationBox.tsx) shows a small `# Interaction N` chip above the input area while composing.
3. User sends -> `handleSendMessage` in [useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) creates a user message `{ id, role: 'user', text, createdAt }` and then clears `selectedThreadMessage` to `null` (line 213).
4. The interaction reference is lost after sending; the user message bubble in [AgentChatMessage.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx) has no way to show which interaction it referenced.

## Goal

Persist the interaction number on the user message object so `AgentChatMessage` can render a badge like `# Interaction 3` above/below the message text for user messages that were sent with an interaction reference.

## Implementation steps

### 1. Add `interactionNumber` to the message interface

**File:** [useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) and [AgentConversationMessages.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx)

Both define `IAgentMessage` (duplicated interface). Add an optional field:

```ts
interface IAgentMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  isLoading?: boolean;
  createdAt: number;
  interactionNumber?: number;
}
```

Consider extracting this interface to a shared location (e.g. a types file in the AgentBuilder directory) to avoid the duplication, but that is optional for this change.

### 2. Capture interaction number when sending

**File:** [useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)

In `handleSendMessage` (line 190), when creating the user message object, include `interactionNumber` from `selectedThreadMessage` if it exists:

```ts
setMessages((prev) => [
  ...prev,
  {
    id: userMessageId,
    role: "user",
    text: message,
    createdAt,
    interactionNumber: selectedThreadMessage?.interactionNumber,
  },
  {
    id: assistantMessageId,
    role: "agent",
    text: "",
    isLoading: true,
    createdAt: createdAt + 1,
  },
]);
```

`selectedThreadMessage` is already available in scope (destructured from the store at line 31). The field will be `undefined` for messages sent without an interaction reference, so nothing changes for those.

### 3. Pass `interactionNumber` through to AgentChatMessage

**File:** [AgentConversationMessages.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx)

Pass `interactionNumber` to `AgentChatMessage`:

```tsx
<AgentChatMessage
  role={message.role}
  text={message.text}
  createdAt={message.createdAt}
  interactionNumber={message.interactionNumber}
/>
```

### 4. Render the badge in AgentChatMessage

**File:** [AgentChatMessage.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx)

- Add `interactionNumber?: number` to the props interface.
- Render a small badge above the message text when `interactionNumber` is defined and `role === 'user'`:

```tsx
const AgentChatMessage = ({
  role,
  text,
  createdAt,
  interactionNumber,
}: IProps) => {
  return (
    <Flex
      direction="vertical"
      spacing="xsmall"
      className={`agent-chat-message__container agent-chat-message__container--${role}`}
    >
      {role === "user" && interactionNumber != null && (
        <span className="agent-chat-message__interaction-badge">
          # Interaction {interactionNumber}
        </span>
      )}
      <div className={`agent-chat-message agent-chat-message--${role}`}>
        <p>{text}</p>
      </div>
      <p className="agent-chat-message__time">
        {moment.utc(createdAt).local().format("MMM D, h:mm a")}
      </p>
    </Flex>
  );
};
```

### 5. Style the badge

**File:** [styles.scss](apps/operator/src/widgets/AgentBuilder/styles.scss)

Add styles for the badge inside `.agent-chat-message__container--user`. Reuse the same visual style as the existing `__selected-thread-message` chip in the conversation box for consistency:

```scss
.agent-chat-message__interaction-badge {
  font-size: $font-3-5; // 12px
  color: #667085;
  background-color: #1f1f1f;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
  align-self: flex-end;
}
```

## Files to modify

- [apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) -- add `interactionNumber` to `IAgentMessage` and capture it in `handleSendMessage`
- [apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationMessages.tsx) -- add `interactionNumber` to `IAgentMessage` and pass it to `AgentChatMessage`
- [apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx) -- add prop and render the badge for user messages
- [apps/operator/src/widgets/AgentBuilder/styles.scss](apps/operator/src/widgets/AgentBuilder/styles.scss) -- add `.agent-chat-message__interaction-badge` styles
