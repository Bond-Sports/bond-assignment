---
name: agentbuilder-file-handling
overview: Extract attachment/file-input logic from AgentConversationBox into a dedicated hook file to improve separation of concerns while preserving existing behavior and component API.
todos:
  - id: create-files-hook
    content: Add useAgentConversationFiles hook with validation, drag/drop handlers, input ref, and file error state.
    status: completed
  - id: refactor-conversation-box
    content: Replace inline file-handling logic in AgentConversationBox with the new hook while keeping rendered UI behavior identical.
    status: completed
  - id: keep-parent-contract-stable
    content: Ensure AgentBuilder/useAgentBuilder interfaces remain unchanged and continue passing attachment props as before.
    status: completed
  - id: verify-behavior-and-lints
    content: Validate attachment UX flow and run lint checks for edited files.
    status: completed
isProject: false
---

# AgentBuilder Attachment Refactor Plan

## Objective

Move file handling (validation, drag/drop state, file input orchestration, and related local error state) out of `AgentConversationBox` so the component is focused on rendering and chat-input interactions.

## Current Logic To Extract

From `[apps/operator/src/widgets/AgentBuilder/partials/AgentConversationBox.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationBox.tsx)`:

- `MAX_FILE_SIZE_MB` / `MAX_FILE_SIZE_BYTES`
- `formatFileSize`
- `fileInputRef`, `fileError`, `isDragOver`
- `validateAndAddFiles`
- `handleFileInputChange`, `handleAttachClick`
- `handleDragOver`, `handleDragLeave`, `handleDrop`

## Planned Changes

- Create `[apps/operator/src/widgets/AgentBuilder/partials/useAgentConversationFiles.ts](apps/operator/src/widgets/AgentBuilder/partials/useAgentConversationFiles.ts)` that encapsulates all attachment behavior.
- Keep `attachedFiles` ownership in `[apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)` unchanged (no state-lifting changes).
- Update `[apps/operator/src/widgets/AgentBuilder/partials/AgentConversationBox.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentConversationBox.tsx)` to consume the hook and remove inline file-handling logic.
- Preserve the current prop contract (`attachedFiles`, `onAttachFiles`, `onRemoveFile`) so `[apps/operator/src/widgets/AgentBuilder/AgentBuilder.tsx](apps/operator/src/widgets/AgentBuilder/AgentBuilder.tsx)` remains unchanged.
- Keep existing styles in `[apps/operator/src/widgets/AgentBuilder/styles.scss](apps/operator/src/widgets/AgentBuilder/styles.scss)` unchanged unless a class binding must be adjusted.

## Verification

- Behavior checks:
  - Attach files via paperclip and confirm chips render.
  - Drag/drop files and confirm drag-over state toggles correctly.
  - Oversized files show the same error messaging and valid files still attach.
  - Remove file chip works and send button enable/disable logic remains unchanged.
- Quality checks:
  - Run lint diagnostics on changed files and fix any introduced issues.

## Non-Goals

- No changes to upload API flow in `useAgentBuilder`.
- No redesign of attachment UI.
- No cross-feature utility consolidation outside AgentBuilder in this refactor (keep scope tight and low-risk).
