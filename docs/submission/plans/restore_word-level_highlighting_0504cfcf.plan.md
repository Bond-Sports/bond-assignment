---
name: Restore word-level highlighting
overview: Add client-side word-level change detection on top of the server-provided line-level diffs by pairing adjacent delete/add lines within each hunk, computing the changed character segment, and rendering it as a highlighted span -- restoring the UX that existed before the server-side diff migration.
todos:
  - id: util
    content: Create diffAnnotation.ts with getChangedSegment and annotateHunkLines functions
    status: completed
  - id: diffs-tsx
    content: Update Diffs.tsx to call annotateHunkLines in useMemo and render valueRange highlights
    status: completed
  - id: scss
    content: Add &__line-value styles and update font-family rule in styles.scss
    status: completed
isProject: false
---

# Restore Word-Level Highlighting in Diffs

## Problem

The current `Diffs.tsx` renders every line as a flat `<span className="diffs__line-text">{line.content}</span>` with no intra-line highlighting. For small targeted edits in large files (e.g., changing a single JSON value), the user cannot visually distinguish what changed within a line.

## Approach

The server already provides line-level diffs (context/delete/add). Word-level highlighting is a lightweight **rendering-time** computation: pair adjacent delete+add lines within a hunk, compare their characters to find the differing segment, and highlight only that segment. This requires no changes to the API, store, or data flow.

## Files to change

### 1. New utility: [apps/operator/src/widgets/AgentBuilder/partials/diffAnnotation.ts](apps/operator/src/widgets/AgentBuilder/partials/diffAnnotation.ts)

Create a small utility with two exports:

`**getChangedSegment(line1, line2)**` -- finds the differing character range between two strings using prefix/suffix matching, expanded to word boundaries. Returns `{ range1: [start, end], range2: [start, end] }`.

The algorithm:

- Walk from the start to find the common prefix length
- Walk from the end to find the common suffix length
- The middle segment is the changed part
- Expand start/end to word boundaries (non-whitespace runs) so highlights don't cut mid-word

`**annotateHunkLines(lines: ICLIDiffLine[])**` -- walks through a hunk's lines, collects consecutive delete runs followed by consecutive add runs, pairs them 1:1, calls `getChangedSegment` on each pair, and returns an enriched array with an optional `valueRange?: [number, number]` on each line.

```typescript
export type AnnotatedDiffLine = ICLIDiffLine & {
  valueRange?: [number, number];
};
```

Lines that are context-only, unpaired deletes, or unpaired adds get no `valueRange`.

### 2. Update [apps/operator/src/widgets/AgentBuilder/partials/Diffs.tsx](apps/operator/src/widgets/AgentBuilder/partials/Diffs.tsx)

Two changes:

**a)** In the hunk rendering, wrap `hunk.lines` with `useMemo(() => annotateHunkLines(hunk.lines), [hunk.lines])` to compute `valueRange` per line.

**b)** Replace the flat text render:

```tsx
<span className="diffs__line-text">{line.content || " "}</span>
```

with a conditional that checks for `valueRange`:

```tsx
<span className="diffs__line-text">
  {line.valueRange && line.valueRange[1] > line.valueRange[0] ? (
    <>
      {line.content.slice(0, line.valueRange[0])}
      <span className={`diffs__line-value diffs__line-value--${line.type}`}>
        {line.content.slice(line.valueRange[0], line.valueRange[1])}
      </span>
      {line.content.slice(line.valueRange[1])}
    </>
  ) : (
    line.content || " "
  )}
</span>
```

### 3. Update [apps/operator/src/widgets/AgentBuilder/styles.scss](apps/operator/src/widgets/AgentBuilder/styles.scss)

Add `&__line-value` back to the `.diffs` block (after the `&__line-text` rule at line ~894):

```scss
&__line-value {
  border-radius: 2px;
  padding: 0 2px;

  &--delete {
    background-color: #ff000033;
    color: #ffb3b3;
  }

  &--add {
    background-color: rgba(70, 105, 56, 0.65);
    color: #b5e0a8;
  }
}
```

Also add `&__line-value` to the existing monospace font-family rule on line 879:

```scss
&__line-prefix,
&__line-text,
&__line-value {
  font-family: ui-monospace, ...;
}
```
