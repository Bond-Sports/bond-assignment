---
name: Server-side diff endpoint
overview: Replace the client-side diff computation (LCS algorithm in diffsUtils.ts) with a new server-side diff endpoint, adding the API function to cliConnectionApi.ts, updating the store types, rewriting the diff rendering components, and wiring the endpoint call into the message flow.
todos:
  - id: api-function
    content: Add ICLIDiffLine/Hunk/File/Response interfaces and fetchCLIDiff function to cliConnectionApi.ts
    status: completed
  - id: store-type
    content: Update IAgentBuilderFileDiff to server format, remove attachFileDiffToLastAgentMessage and originalFileContentByAgentMessageId
    status: completed
  - id: diffs-component
    content: Rewrite Diffs.tsx to render server hunks/lines instead of computing diffs client-side
    status: completed
  - id: file-diffs-list
    content: Simplify FileDiffsList.tsx to pass server file objects directly to Diffs
    status: completed
  - id: wire-endpoint
    content: Call fetchCLIDiff in useAgentBuilder.ts done handler, attach results to assistant message
    status: completed
  - id: remove-old-diff
    content: Remove file-content-watching diff logic from useBaseModel.tsx
    status: completed
  - id: update-scss
    content: Add context/delete/hunk-header styles, rename --remove to --delete in styles.scss
    status: completed
  - id: cleanup-utils
    content: Delete diffsUtils.ts and update AgentChatMessage.tsx filter
    status: completed
isProject: false
---

# Server-Side Diff Endpoint Integration

## Current State

Diffs are computed entirely on the frontend:

- `useBaseModel.tsx` (lines 346-369) watches `currentFileContent` vs `originalFileContentFromServer`, calls `attachFileDiffToLastAgentMessage` with raw `{original, modified, fileLabel}`
- The store (`useAgentBuilderStore.ts`) tracks per-message originals via a module-level map (`originalFileContentByAgentMessageId`)
- `FileDiffsList.tsx` calls `getDiffBlocks()` from `diffsUtils.ts` which runs an LCS diff algorithm
- `Diffs.tsx` renders the computed pairs (removed/added lines with value-range highlights)

## New Endpoint

```
POST /api/sessions/{sessionId}/diff
Header: X-Sandbox-Id: {sandboxId}
Body: {"agentId": "..."}
Response: { success, files[], summary }
```

Each file contains `hunks[]`, each hunk contains `lines[]` with `type: "context" | "delete" | "add"` and `content`.

## Changes

### 1. Add `fetchCLIDiff` to [cliConnectionApi.ts](libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts)

Add interfaces and the fetch function following the exact same pattern as `fetchCLIFiles` (lines 292-312):

```typescript
export interface ICLIDiffLine {
  type: 'context' | 'delete' | 'add';
  content: string;
}

export interface ICLIDiffHunk {
  header: string;
  lines: ICLIDiffLine[];
}

export interface ICLIDiffFile {
  file: string;
  status: string;
  additions: number;
  deletions: number;
  hunks: ICLIDiffHunk[];
}

export interface ICLIDiffResponse {
  success: boolean;
  files: ICLIDiffFile[];
  summary: { totalFiles: number; additions: number; deletions: number };
}

export const fetchCLIDiff = async (
  sessionId: string,
  sandboxId: string,
  agentId?: string
): Promise<ICLIDiffResponse> => { ... };
```

The function follows `fetchCLIFiles` pattern: POST to `${API_BASE}/sessions/${sessionId}/diff`, `X-Sandbox-Id` header, body `{agentId}`, standard error handling.

### 2. Update store type in [useAgentBuilderStore.ts](apps/operator/src/stores/useAgentBuilderStore.ts)

Replace `IAgentBuilderFileDiff` (currently `{original, modified, fileLabel}`) with the server format:

```typescript
export interface IAgentBuilderFileDiff {
  file: string;
  status: string;
  additions: number;
  deletions: number;
  hunks: {
    header: string;
    lines: { type: "context" | "delete" | "add"; content: string }[];
  }[];
}
```

Remove `attachFileDiffToLastAgentMessage` and the `originalFileContentByAgentMessageId` module-level map — these are no longer needed since the server computes diffs.

### 3. Rewrite [Diffs.tsx](apps/operator/src/widgets/AgentBuilder/partials/Diffs.tsx)

Change props from `{original, modified, fileLabel}` to accept a single server diff file object. Render hunks directly:

- Each hunk gets a header line
- Each line renders as context (no prefix, dimmed), delete (minus prefix, red bg), or add (plus prefix, green bg)
- Remove the `useMemo` call to `computeLineDiff` — no more client-side computation
- Remove the `getDiffBlocks` re-export

### 4. Update [FileDiffsList.tsx](apps/operator/src/widgets/AgentBuilder/partials/FileDiffsList.tsx)

Simplify to iterate `diffs` (now `ICLIDiffFile[]`) and render one `Diffs` component per file, passing the whole file object. Remove the `getDiffBlocks` call and the pair/unpaired splitting logic.

### 5. Wire endpoint call in [useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)

In the `done` event handler (line 288), after `refetchFiles()`, call `fetchCLIDiff` and attach results to the current assistant message:

```typescript
if (event.type === "done") {
  if (currentAssistantId) finishAssistantMessage(taskId, currentAssistantId);
  refetchFiles();
  if (currentAssistantId && cliSession) {
    const assistantId = currentAssistantId;
    fetchCLIDiff(cliSession.id, cliSession.sandboxId, selectedNetwork?._id)
      .then((resp) => {
        if (resp.files.length > 0) {
          updateMessageInTask(taskId, assistantId, (msg) => ({
            ...msg,
            fileDiffs: resp.files,
          }));
        }
      })
      .catch(() => {});
  }
}
```

Import `fetchCLIDiff` from `@aui/api`.

### 6. Remove old diff-attachment code in [useBaseModel.tsx](apps/operator/src/pages/base-model/useBaseModel.tsx)

Remove lines 346-369 (the `useEffect` that watches file content changes and calls `attachFileDiffToLastAgentMessage`), and the related store selector imports (`selectedAgentTaskId`, `attachFileDiffToLastAgentMessage`).

### 7. Update SCSS in [styles.scss](apps/operator/src/widgets/AgentBuilder/styles.scss)

Add a `--context` line style (dimmed text, no background) alongside the existing `--remove`/`--add`. Rename `--remove` to `--delete` to match the server's `type: "delete"`. Add a `__hunk-header` style for the `@@ ... @@` header lines.

### 8. Clean up [diffsUtils.ts](apps/operator/src/widgets/AgentBuilder/partials/utils/diffsUtils.ts)

Delete the file entirely — `computeLineDiff`, `getDiffBlocks`, `ensureString`, and all the LCS/word-boundary logic are no longer used by any consumer.

### 9. Update [AgentChatMessage.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx)

The diff filter on line 16 (`fileDiffs.filter((diff) => diff.original !== diff.modified)`) needs updating since the shape changed. With the new format, all files from the server already represent actual changes, so the filter can simply check `diff.hunks.length > 0`.
