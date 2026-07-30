---
name: Markdown chat rendering
overview: Create a reusable `MarkdownRenderer` component using `react-markdown` and integrate it into `AgentChatMessage` so agent responses render proper markdown (headings, lists, code blocks, links, etc.) instead of plain text.
todos:
  - id: create-markdown-renderer
    content: Create MarkdownRenderer.tsx component wrapping react-markdown
    status: completed
  - id: integrate-chat-message
    content: Use MarkdownRenderer in AgentChatMessage for agent role messages
    status: completed
  - id: add-markdown-styles
    content: Add markdown element styles (code, lists, headings, links, blockquote) under .agent-chat-message--agent in styles.scss
    status: completed
isProject: false
---

# Markdown Rendering for Agent Chat Messages

## Current State

In [AgentChatMessage.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx), the message text is rendered as a plain `<p>` tag (line 24):

```tsx
<div className={`agent-chat-message agent-chat-message--${role}`}>
  <p>{text}</p>
</div>
```

This means markdown from agent responses (headings, code blocks, lists, bold/italic, links) displays as raw text.

## Plan

### 1. Create `MarkdownRenderer` component

Create a new file at `apps/operator/src/widgets/AgentBuilder/partials/MarkdownRenderer.tsx`.

- Import `react-markdown` (already installed).
- Accept a `text: string` prop and a `className?: string` prop.
- Render `<ReactMarkdown>` wrapping the text.
- Keep it minimal -- no custom component overrides needed initially. The SCSS will handle typography styling.

### 2. Use `MarkdownRenderer` in `AgentChatMessage`

In [AgentChatMessage.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx):

- Replace the `<p>{text}</p>` with `<MarkdownRenderer text={text} />` for **agent** messages only.
- Keep the plain `<p>{text}</p>` for **user** messages (user input is not markdown).

### 3. Add markdown-aware styles

In [styles.scss](apps/operator/src/widgets/AgentBuilder/styles.scss), add nested styles under `.agent-chat-message--agent` for markdown elements:

- `p`, `ul`, `ol`, `li` -- margin/spacing resets and text color
- `code` (inline) -- subtle background, monospace font, small padding
- `pre > code` (code blocks) -- darker background, padding, border-radius, overflow-x scroll, full width
- `h1`-`h6` -- scaled font sizes, margin
- `a` -- link color and underline
- `blockquote` -- left border + padding
- Remove `white-space: pre-wrap` from agent messages since ReactMarkdown handles whitespace

## Files Changed

| File                                         | Change                                      |
| -------------------------------------------- | ------------------------------------------- |
| `AgentBuilder/partials/MarkdownRenderer.tsx` | New (small component)                       |
| `AgentBuilder/partials/AgentChatMessage.tsx` | Use `MarkdownRenderer` for agent role       |
| `AgentBuilder/styles.scss`                   | Add markdown element styles under `--agent` |
