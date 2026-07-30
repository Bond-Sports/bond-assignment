---
name: claude-sdk-question-support
overview: Add first-class clarifying-question support for Claude SDK by wiring `AskUserQuestion` through stream events, UI rendering, and answer submission, matching current OpenCode UX while using Claude’s documented input/output contract.
todos:
  - id: claude-canusetool
    content: Implement `canUseTool` AskUserQuestion interception and pending-answer wait in Claude SDK agent stream path
    status: completed
  - id: claude-answer-endpoint
    content: Add Claude sandbox HTTP answer route to resolve pending AskUserQuestion callbacks by callID
    status: completed
  - id: outer-answer-proxy
    content: Update `/api/sessions/[id]/answer` to route answers to OpenCode or Claude backend appropriately
    status: completed
  - id: event-normalization
    content: "Normalize Claude AskUserQuestion stream events to frontend `toolName: question` contract"
    status: completed
  - id: ui-answer-shape
    content: Update UI submit payload handling for Claude multi-select/free-text while preserving OpenCode behavior
    status: completed
  - id: validation
    content: Run manual end-to-end checks for Claude question prompt, submit, resume, and OpenCode regression
    status: completed
isProject: false
---

# Claude SDK Question Support Plan

## What the docs confirm (implementation constraints)

- Claude SDK clarifying questions come through the `AskUserQuestion` tool via `canUseTool` callback; this is not a normal post-turn message flow.
- `AskUserQuestion` input schema is `questions[]` with fields `question`, `header`, `options[{label,description}]`, and `multiSelect`.
- The callback must return a permission decision; to proceed, return `allow` with `updatedInput` containing original `questions` and an `answers` map (`Record<questionText, selectedLabelsOrFreeText>`).
- If tool capabilities are restricted, `AskUserQuestion` must be included in the tools allowlist.
- Session resume remains `options.resume = sessionId`; existing resume behavior in your code is compatible.

## Current code hotspots to update

- Backend proxy and SSE normalization: `[/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/src/app/api/sessions/[id]/chat/route.ts](/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/src/app/api/sessions/[id]/chat/route.ts)`
- Answer relay endpoint (currently OpenCode-only): `[/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/src/app/api/sessions/[id]/answer/route.ts](/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/src/app/api/sessions/[id]/answer/route.ts)`
- Claude SDK in-sandbox streaming logic: `[/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/sandbox-templates/agent-builder-claude-sdk/agent/src/agent.ts](/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/sandbox-templates/agent-builder-claude-sdk/agent/src/agent.ts)`
- Claude SDK in-sandbox HTTP endpoints: `[/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/sandbox-templates/agent-builder-claude-sdk/agent/src/index.ts](/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/sandbox-templates/agent-builder-claude-sdk/agent/src/index.ts)`
- UI rendering and submission wiring: `[/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/src/components/app-shell.tsx](/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/src/components/app-shell.tsx)`

## Implementation approach

- Extend Claude SDK stream execution in `agent.ts`:
  - Add `canUseTool` in `query({ options })`.
  - When `toolName === "AskUserQuestion"`, emit a tool event shaped for frontend compatibility (`toolName: "question"`, `toolInput: { questions: ... }`, `callID: toolUseID`, state running).
  - Pause in `canUseTool` by awaiting a per-call promise resolver keyed by `toolUseID`.
  - When answer arrives, build `updatedInput` as `{ questions: originalQuestions, answers: Record<string,string> }`, then return `{ behavior: "allow", updatedInput }`.
  - Keep existing tool handling for non-question tools unchanged.
- Add a Claude-side answer endpoint in `agent/src/index.ts`:
  - New POST route to accept `{ callID, answers }` (or normalized answer payload).
  - Resolve pending `AskUserQuestion` promise for that `callID`; return 404 if no pending request.
- Update outer `/api/sessions/[id]/answer` route:
  - Branch by `provider`/session metadata.
  - For Claude SDK sessions, proxy answer payload to sandbox port `3002` answer endpoint instead of OpenCode `/question/.../reply`.
  - Keep OpenCode behavior unchanged.
- Normalize event naming to reuse existing UI:
  - Ensure Claude question events emitted to frontend use `type: "tool"`, `toolName: "question"`, `toolInput.questions`, and stable `callID` so current `QuestionCard` grouping works.
- Update UI answer serialization in `app-shell.tsx`:
  - Keep OpenCode answer shape support (`string[][]`) for backward compatibility.
  - Add Claude-compatible answer mapping path to preserve multi-select semantics (join labels with `", "` per docs) and optional free-text.
  - Ensure question tool completion updates state from running → done/error once callback resolves.

## Validation plan

- Manual integration flow in Claude SDK mode:
  - Trigger a prompt that forces clarifying questions (plan-style ambiguous request).
  - Confirm question card appears (not generic tool card), supports options and free text, submit works.
  - Verify agent resumes immediately after submit and emits follow-up output.
  - Verify unknown/expired `callID` returns deterministic error.
- Regression checks:
  - OpenCode question flow still works unchanged.
  - Non-question Claude tools continue to render/complete normally.
  - Session resume still works with existing `sessionId` handling.

## Source docs used

- [https://platform.claude.com/docs/en/agent-sdk/user-input](https://platform.claude.com/docs/en/agent-sdk/user-input)
- [https://platform.claude.com/docs/en/agent-sdk/typescript](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [https://platform.claude.com/docs/en/agent-sdk/sessions](https://platform.claude.com/docs/en/agent-sdk/sessions)
- [https://platform.claude.com/docs/en/agent-sdk/streaming-vs-single-mode](https://platform.claude.com/docs/en/agent-sdk/streaming-vs-single-mode)
