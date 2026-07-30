---
name: Interaction badge on user bubble
overview: 'Store interaction context on user messages when sent with a selected interaction, and render an "Interaction #N" badge on the user message bubble instead of (or in addition to) the current input-area freeze tag, so context is visible in the thread.'
todos: []
isProject: false
---

# Show interaction badge on user message bubble

## Current behavior

- The **freeze tag** ("# Interaction {N}") is rendered in the **input area** ([ChatPanel.tsx](apps/operator/src/pages/agent-builder/components/ChatPanel.tsx) lines 173–179): it appears above the input when `selectedInteraction` is set and indicates "the next message will use this interaction as context."
- User messages are plain `{ role: 'user', content: string }` ([types.ts](apps/operator/src/pages/agent-builder/types.ts) lines 122–125); no metadata is stored.
- User bubbles are rendered as a simple div with content only (lines 155–157 in ChatPanel).

So the badge never appears on any message—only in the input area. To show **which messages were sent with interaction context**, that context must be stored on the message and rendered on the user bubble.

## Approach

1. **Extend the user message type** so we can attach interaction context when sending.
2. **Persist interaction context when appending the user message** in `handleSend`.
3. **Render a badge on the user bubble** when that message has interaction context.
4. **Style the badge** so it fits inside or above the user bubble (reuse freeze-tag look or a compact variant).

Optional: keep the input-area freeze tag as-is so users still see "next message will use Interaction #N" before sending; the bubble badge then documents "this message was sent with that context."

---

## 1. Extend `UserMessage` in types

**File:** [apps/operator/src/pages/agent-builder/types.ts](apps/operator/src/pages/agent-builder/types.ts)

- Add an optional field to the `UserMessage` interface, for example:
  - `interactionContext?: { interactionNumber: number; interactionId: string }`
- This keeps the type minimal and matches the data you already have in `selectedInteraction` (from [useChatContextStore](apps/operator/src/pages/agent-builder/useChatContextStore.ts)).

---

## 2. Attach interaction context when appending the user message

**File:** [apps/operator/src/pages/agent-builder/components/ChatPanel.tsx](apps/operator/src/pages/agent-builder/components/ChatPanel.tsx)

- In `handleSend`, when you do:
  - `setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);`
- Change it to include interaction context when `selectedInteraction` is set, e.g.:
  - `{ role: 'user', content: userMsg, interactionContext: selectedInteraction ? { interactionNumber: selectedInteraction.interactionNumber, interactionId: selectedInteraction.interactionId } : undefined }`
- TypeScript will require the new optional field on `UserMessage` (step 1).

---

## 3. Render the badge inside the user message bubble

**File:** [apps/operator/src/pages/agent-builder/components/ChatPanel.tsx](apps/operator/src/pages/agent-builder/components/ChatPanel.tsx)

- In the message map, for `msg.role === 'user'`:
  - Keep the existing structure: a wrapper (e.g. `ab-user-bubble` or an inner wrapper) so the bubble can contain both badge and content.
  - If `(msg as UserMessage).interactionContext` is present, render a small badge (e.g. "Interaction #N" or "# Interaction N") **inside** the user bubble—typically above the `<pre>` with the content, so the badge gives context and the content stays below.
- Use a class like `ab-user-bubble__context-badge` or reuse `ab-chat__freeze-tag` (or a variant) for styling. The badge should be compact (small text, subtle background) so it doesn’t dominate the bubble.

Example structure:

```tsx
<div className="ab-user-bubble">
  {msg.interactionContext && (
    <span className="ab-user-bubble__context-badge">
      # Interaction {msg.interactionContext.interactionNumber}
    </span>
  )}
  <pre>{msg.content}</pre>
</div>
```

---

## 4. Add styles for the badge on the user bubble

**File:** [apps/operator/src/pages/agent-builder/styles.scss](apps/operator/src/pages/agent-builder/styles.scss)

- Under `.ab-user-bubble` (or a parent block), add a modifier or element, e.g. `&__context-badge`:
  - Small font size, possibly a different background (e.g. slightly darker/lighter than the bubble) so it’s visible but secondary.
  - Margin below the badge so the message content is clearly separated.
- Reuse design tokens from [variables_v2.scss](libs/break/src/styles/variables_v2.scss) (e.g. `$font-2`, `$space-1`, `$radius-4`) so the badge matches the existing freeze-tag style without duplicating values.

---

## 5. Optional: input-area freeze tag

- **Keep** the existing freeze tag in the input area so users still see "sending in context of Interaction #N" before they send. The bubble badge then reflects what was actually sent.
- If you prefer to **remove** the input-area tag and only show context on the bubble, delete or conditionally hide the block at lines 173–179 in ChatPanel; the bubble badge alone would indicate context.

---

## Summary

| Step | Action                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| 1    | Add `interactionContext?: { interactionNumber: number; interactionId: string }` to `UserMessage` in types.ts              |
| 2    | When pushing the user message in handleSend, set `interactionContext` from `selectedInteraction` when present             |
| 3    | In the message list, for user messages with `interactionContext`, render a badge inside the user bubble above the content |
| 4    | Add SCSS for the badge (e.g. `.ab-user-bubble__context-badge`) using design tokens                                        |
| 5    | Decide whether to keep the input-area freeze tag (recommended) or remove it                                               |

No API or store changes are required; only the local `messages` state and the way user messages are typed and rendered change.
