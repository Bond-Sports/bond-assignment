---
name: trace-path-echo
overview: Establish the verified source of the path echo in this repo, separate that from the missing Opencode template source, and define the minimal root-cause fix path that avoids relying on UI-only redaction.
todos:
  - id: confirm-upstream-boundary
    content: Treat the missing `.opencode` tree as out-of-scope for this workspace and avoid assuming its standard from pasted text alone.
    status: pending
  - id: design-event-contract-fix
    content: Define the minimal explicit event metadata needed so hidden dispatch/subagent setup content can be filtered safely.
    status: pending
  - id: frontend-defense-in-depth
    content: Plan a surgical Agent Builder change that ignores only verified hidden events and preserves normal assistant/tool output.
    status: pending
  - id: repro-validation
    content: Add a focused validation path for a mixed event stream to prove the path echo is fixed at the correct layer.
    status: pending
isProject: false
---

# Trace Path Echo

## What is proven in this workspace

The `.opencode` template tree you referenced is not present here, so this repo cannot verify the claimed Opencode subagent standard from source. A repo-wide search returned no `**/.opencode/**` files.

The frontend path is clear:

- [`libs/api/src/api/CLIConnectionApi/cliPollChat.ts`](libs/api/src/api/CLIConnectionApi/cliPollChat.ts) forwards streamed events as-is with `onEvent(event)`.
- [`apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts`](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) only suppresses the first assistant `text` chunk when it exactly equals the outgoing prompt.
- [`apps/operator/src/widgets/AgentBuilder/partials/stream-segments/streamSegments.ts`](apps/operator/src/widgets/AgentBuilder/partials/stream-segments/streamSegments.ts) defines that logic as exact string equality via `shouldSkipPromptEcho()`.
- [`apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx`](apps/operator/src/widgets/AgentBuilder/partials/AgentChatMessage.tsx) renders assistant segment content directly through `MarkdownRenderer`.
- [`apps/operator/src/hooks/useCliSessionManagerOptionsFromFlags.ts`](apps/operator/src/hooks/useCliSessionManagerOptionsFromFlags.ts) and [`apps/operator/src/feature-flags/configCatFlags.ts`](apps/operator/src/feature-flags/configCatFlags.ts) show that "subagents" is only a feature-flagged boolean passed downstream as `useSubagents`; there is no local dispatch/redaction standard here.

## Root-cause direction

Based on this repo alone, a filesystem path showing up in chat would most likely be coming from upstream streamed assistant/tool text, not from a local `.opencode` worker implementation in this workspace.

The current frontend behavior is not defense-in-depth against that class of leak. It suppresses only this narrow case:

```ts
export const shouldSkipPromptEcho = (
  incoming: string,
  prompt: string
): boolean => Boolean(incoming.trim()) && incoming.trim() === prompt.trim();
```

That means a leaked payload path, dispatch artifact, or prompt-derived text chunk will still render if it is not an exact copy of the full user prompt.

## Proposed implementation path

1. Harden the contract at the source of streamed events.
   The correct fix is upstream: the chat/subagent dispatcher should never emit raw dispatch payloads, prompt file paths, or hidden worker input as assistant-visible `text` events.

2. Add frontend defense-in-depth without guessing at semantics.
   In Agent Builder, only suppress content when there is a verifiable signal that it is hidden dispatch/setup text. Prefer explicit event metadata from the backend over heuristic path filtering.

3. If backend metadata does not exist yet, extend the event contract first.
   Update [`libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts`](libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts) to carry an explicit flag or subtype for non-user-visible dispatch events, then honor it in [`apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts`](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts).

4. Validate with a targeted reproduction.
   Reproduce a streamed event sequence containing: session event, hidden dispatch/setup event, normal assistant text, and done event. Confirm the hidden event is ignored while the real assistant response still renders.

## Architecture sketch

```mermaid
flowchart LR
userPrompt[UserPrompt] --> apiReq[PollChatRequest useSubagents]
apiReq --> upstream[Upstream agent or dispatcher]
upstream --> events[Streamed events]
events --> pollChat[cliPollChat onEvent(event)]
pollChat --> builder[useAgentBuilder]
builder --> render[AgentChatMessage MarkdownRenderer]
```

## Notes

- This plan stays fact-based for this repo.
- Auditing the actual Opencode subagent standard still requires the missing repo/path that contains the `.opencode` files you referenced.
