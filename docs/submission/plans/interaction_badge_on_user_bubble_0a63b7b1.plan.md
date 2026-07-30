---
name: Interaction badge on user bubble
overview: 'Store interaction context on user messages when sent with a selected interaction, and render an "Interaction #N" badge on the user message bubble instead of (or in addition to) the current input-area freeze tag, so context is visible in the thread.'
todos: []
isProject: false
---

# Show interaction badge on user message bubble

## Goal

- **Keep the badge in the input area** as now: user sees "next message will use Interaction #N" before sending.
- **On send**: clear the input-area selection (already done via `clearSelectedInteraction()`).
- **Show the badge on the user message bubble** after send so it’s clear that "we used the context from the interaction you provided" — instead of that context appearing as or in the agent message, which feels odd.

## Current behavior

- The **freeze tag** ("# Interaction {N}") is in the **input area** ([ChatPanel.tsx](apps/operator/src/pages/agent-builder/components/ChatPanel.tsx) lines 173–179); it clears after send.
- User messages are plain `{ role: 'user', content: string }` ([types.ts](apps/operator/src/pages/agent-builder/types.ts) lines 122–125); no metadata is stored.
- User bubbles are rendered as a simple div with content only (lines 155–157 in ChatPanel). Context is not shown on the user bubble, so it can appear as if the agent is "saying" the context instead of the user having requested it.

## Approach

1. **Extend the user message type** so we can attach interaction context when sending.
2. **Persist interaction context when appending the user message** in `handleSend` (when `selectedInteraction` is set).
3. **Render a badge on the user bubble** when that message has interaction context, so the user sees "this message was sent with context from Interaction #N."
4. **Style the badge** inside the user bubble (e.g. above the message text), reusing the freeze-tag look.
5. **Leave the input-area badge and clear-on-send behavior unchanged.**

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

## 5. Input-area badge (no change)

- **Keep** the existing freeze tag in the input area and the current clear-on-send behavior. No changes needed here.

---

## Summary

| Step | Action                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| 1    | Add `interactionContext?: { interactionNumber: number; interactionId: string }` to `UserMessage` in types.ts              |
| 2    | When pushing the user message in handleSend, set `interactionContext` from `selectedInteraction` when present             |
| 3    | In the message list, for user messages with `interactionContext`, render a badge inside the user bubble above the content |
| 4    | Add SCSS for the badge (e.g. `.ab-user-bubble__context-badge`) using design tokens                                        |
| 5    | No change to input-area badge; keep as-is                                                                                 |

No API or store changes are required; only the local `messages` state and the way user messages are typed and rendered change.
