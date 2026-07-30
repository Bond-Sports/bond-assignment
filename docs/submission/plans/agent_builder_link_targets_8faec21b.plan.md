---
name: Agent Builder link targets
overview: Open Agent Builder markdown links in a new tab so clicking URLs in agent messages does not navigate away from the playground and lose the in-memory CLI session/chat.
todos:
  - id: markdown-anchor-blank
    content: Add ReactMarkdown `components.a` with target="_blank" and rel="noopener noreferrer" in MarkdownRenderer.tsx
    status: completed
  - id: manual-verify-links
    content: Manually verify agent + reasoning message links open new tab and playground session persists
    status: completed
isProject: false
---

# Open Agent Builder message links in new tab

## Problem

When the agent returns a URL in chat, clicking it navigates the **current** tab away from the Agent Builder playground. Chat state lives only in memory ([`useAgentBuilderStore`](apps/operator/src/stores/useAgentBuilderStore.ts) `messagesByTaskId`) with no persistence yet, so leaving the page unmounts the builder and the session feels “deleted.”

Slack thread consensus: **interim fix** is `target="_blank"` so users are not forced off the page unexpectedly. Long-term fix (chat history DB) is out of scope here.

## Root cause

All agent/user markdown in Agent Builder flows through a single component with no link customization:

```8:12:apps/operator/src/widgets/AgentBuilder/partials/MarkdownRenderer.tsx
const MarkdownRenderer = ({ text, className }: IProps) => {
  return (
    <motion.div className={className}>
      <ReactMarkdown>{text}</ReactMarkdown>
```

`react-markdown` renders `<a href="...">` with default `target` (same tab).

**Call sites** (one fix covers all message surfaces):

- [`AgentChatMessage.tsx`](apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx) — agent text segments and non-segment messages
- [`AgentReasoningBlock.tsx`](apps/operator/src/widgets/AgentBuilder/partials/reasoning/AgentReasoningBlock.tsx) — reasoning segment text

Link styling already exists in [`styles.scss`](apps/operator/src/widgets/AgentBuilder/styles.scss) (`.agent-chat-message__markdown a`); no style changes required.

```mermaid
flowchart LR
  click[User clicks markdown link]
  sameTab[Same tab navigation]
  unmount[Agent Builder unmounts]
  lost[In-memory messages lost]
  newTab[target=_blank]
  stay[Playground tab stays open]
  click --> sameTab --> unmount --> lost
  click --> newTab --> stay
```

## Implementation

### 1. Customize anchor rendering in `MarkdownRenderer`

Update [`MarkdownRenderer.tsx`](apps/operator/src/widgets/AgentBuilder/partials/MarkdownRenderer.tsx):

- Import `Components` from `react-markdown`.
- Define a stable `components` map with a custom `a` renderer:

```tsx
a: ({ children, ...props }) => (
  <a {...props} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
),
```

- Pass `components` to `<ReactMarkdown components={components}>`.

**Pattern to mirror:** AAC already does this in [`MarkdownPreview.tsx`](apps/artificial-agent-conversation/src/components/SettingsContainer/Partials/DefaultSettings/components/RichTemplateEditor/components/MarkdownPreview.tsx) (lines 60–64). Operator uses the same approach in several places (e.g. [`BaseModelBanner.tsx`](apps/operator/src/pages/base-model/partials/BaseModelBanner/BaseModelBanner.tsx)).

**Why `rel="noopener noreferrer"`:** Standard pairing with `target="_blank"` to avoid `window.opener` security issues; matches repo conventions.

**Scope:** Keep the change local to Agent Builder’s `MarkdownRenderer` — not worth moving to `@aui/break` for a single consumer (per shared-kit rule: behavior is Agent Builder–specific).

### 2. Do not change session persistence

No changes to [`useAgentBuilder.ts`](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) or CLI session lifecycle. Navigation away will still lose chat until backend history exists; this plan only prevents **accidental** navigation via message links.

### 3. Optional follow-up (out of scope unless you want it)

[`AgentEmptyState.tsx`](apps/operator/src/widgets/AgentBuilder/partials/AgentEmptyState.tsx) renders config subtitle via `dangerouslySetInnerHTML` — if that HTML can include `<a>` tags, those would still open in the same tab. Only include if product confirms subtitle links exist.

Bare URLs in plain text (e.g. `https://example.com` without `[text](url)`) are **not** auto-linked today because `remark-gfm` is not used. If agents send raw URLs that are not clickable, that is a separate enhancement (add `remark-gfm`), not required for the reported bug.

## Verification

Manual test in Agent Builder (connected CLI session):

1. Trigger an agent message containing a markdown link, e.g. `[docs](https://example.com)`.
2. Click the link → should open a **new browser tab**; playground tab URL and chat history unchanged.
3. Repeat from a reasoning block text segment if available.
4. Confirm middle-click / “Open in new tab” still works (native browser behavior on `<a target="_blank">`).

No new unit tests unless you want a small render test for `MarkdownRenderer` (repo has sparse operator tests; manual QA is sufficient for this one-liner behavior).

## Files touched

| File                                                                                                                                           | Change                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [`apps/operator/src/widgets/AgentBuilder/partials/MarkdownRenderer.tsx`](apps/operator/src/widgets/AgentBuilder/partials/MarkdownRenderer.tsx) | Custom `a` component with `target="_blank"` |

Estimated diff: ~15 lines.
