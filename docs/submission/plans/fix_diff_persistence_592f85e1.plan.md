---
name: Fix Diff Persistence
overview: Stabilize diff state flow so message/file diffs survive normal React re-renders and file navigation, and remove re-render paths that can temporarily drop rendered diff data.
todos:
  - id: atomic-diff-store-write
    content: Add a single store action that updates cumulative and per-message diffs atomically.
    status: pending
  - id: remove-unused-cumulative-subscription
    content: Stop subscribing to cumulativeDiffs in useAgentBuilder and keep sandbox-scoped clear behavior.
    status: pending
  - id: switch-done-handler-to-atomic
    content: Use atomic store action in CLI done event instead of split sequential writes.
    status: pending
  - id: stabilize-chat-diff-read
    content: Ensure AgentChatMessage diff selector/fallback remains stable across remounts and remove debug-only output.
    status: pending
  - id: verify-file-tree-and-chat-persistence
    content: Validate persistence across file navigation/re-renders and sandbox reset semantics.
    status: pending
isProject: false
---

# Fix Diff Persistence Between Re-renders

## Goal

Ensure diff UI stays stable across routine re-renders (message streaming completion, file switching, sidebar updates) without losing already computed diffs.

## Root Cause (from current code)

- `useAgentBuilder` subscribes to `cumulativeDiffs` even though it does not use that value, creating unnecessary full re-renders of the chat tree when cumulative diffs update.
- Diff writes are currently split across two store updates (`setCumulativeDiffs` then `setDiffsForMessage`), creating an intermediate render frame where message diff mapping can be absent/stale.
- Session reset logic must remain tied to sandbox identity, not object/reference churn.

## Implementation Plan

1. **Make diff store updates atomic**

- Update `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/stores/useAgentBuilderDiffStore.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/stores/useAgentBuilderDiffStore.ts)` to add one action that writes both:
  - `cumulativeDiffs`
  - `diffsByMessageId[messageId]`
    in a **single** `set(...)` call.
- Keep existing actions only if still needed elsewhere; otherwise consolidate to one canonical write path to avoid split-frame UI states.

1. **Remove unnecessary subscription in AgentBuilder hook**

- In `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)`:
  - Stop destructuring `cumulativeDiffs` from store (unused reactive subscription).
  - Consume only action selectors needed for writes/clear.
- Keep reset effect keyed by sandbox identity (`cliSession?.sandboxId`) so diffs clear only when filesystem context changes.

1. **Use the atomic action in message completion flow**

- In the `event.type === 'done'` path of `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)`:
  - Compute `delta` from previous cumulative snapshot.
  - Replace sequential calls (`setCumulativeDiffs` + `setDiffsForMessage`) with one atomic store update.
- Preserve existing behavior: only attach per-message diffs when `delta.length > 0`.

1. **Harden read path in chat message rendering**

- In `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx)`:
  - Keep selector keyed by `messageId`.
  - Ensure no transient debug-only behavior affects render output.
  - Confirm empty fallback path is stable and does not mutate between renders.

1. **Verify file-tree status continuity from cumulative diffs**

- In `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/BaseModel.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/BaseModel.tsx)`:
  - Validate `modifiedFiles` derivation still maps from cumulative snapshot after atomic updates.
  - Remove debug logging in derivation to avoid noise and render timing side effects.

## Validation Checklist

- Send a message that edits files; confirm diff appears under that assistant message.
- Navigate across multiple files in code view; return to conversation; diff remains visible.
- Trigger additional re-renders (toggle code mode/sidebar/task selection without sandbox change); prior message diffs persist.
- Start a new sandbox session; diffs clear exactly once on sandbox switch.
- Confirm file-tree badges (`A/M/D`) remain consistent with cumulative diffs after navigation.

## Affected Files

- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/stores/useAgentBuilderDiffStore.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/stores/useAgentBuilderDiffStore.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/BaseModel.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/BaseModel.tsx)`
