---
name: answer-route-diagnosis
overview: Diagnose why `/answer` hit OpenCode path and define a safe validation/hardening plan for Claude SDK question replies.
todos:
  - id: repro-curl-with-claude-fields
    content: Re-test `/answer` curl with `provider` and `agentId` in body
    status: pending
  - id: observe-3002-route
    content: Verify request reaches Claude sandbox route on port 3002
    status: pending
  - id: consider-provider-validation
    content: Optionally harden `/answer` to reject missing `provider` with explicit 400
    status: pending
isProject: false
---

# Diagnose `/answer` Routing Failure

## Root Cause (confirmed)

- The request body you sent contains only `callID` and `answers`.
- In `[/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/src/app/api/sessions/[id]/answer/route.ts](/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/src/app/api/sessions/[id]/answer/route.ts)`, Claude routing only happens when `provider === "claude-sdk"`.
- Without `provider`, the handler falls back to the OpenCode branch and calls sandbox port `4096` (`/question?...`), which produced your exact error: port 4096 not open.

## Immediate Verification Steps (no code changes)

- Re-run your curl with Claude fields in body:
  - `provider: "claude-sdk"`
  - `agentId: "<your-agent-id>"`
- Optional but recommended for Claude format:
  - `answersMap: { "<question text>": "Form" }`
- Confirm response is `{ "ok": true }` and that the sandbox receives call to port `3002` path `/api/constructor/:agentId/question/answer`.

## Hardening Plan (recommended follow-up change)

- Validate request shape strictly in `/answer`:
  - If `provider` is missing, return `400` with explicit message (instead of silently defaulting to OpenCode).
  - If `provider === "claude-sdk"` and `agentId` missing, keep current `400` behavior.
- Keep OpenCode behavior unchanged when `provider === "opencode"`.
- Add clear error text that includes expected fields for each provider to prevent ambiguous debugging.

## Frontend Expectation Check

- Current frontend already sends `provider` and `agentId` in answer submissions from `[/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/src/components/app-shell.tsx](/Users/bugo/Documents/Developer/aui/aui-agent-builder-chat/src/components/app-shell.tsx)`.
- If your browser request still lacks those fields, likely causes are stale client bundle or a different caller path than this updated UI.
