---
name: Harden BaseModel Refresh
overview: Make BaseModel refresh reliably after agent-driven file/schema updates by broadening the refresh trigger and keeping workflow query refetch behavior deterministic.
todos:
  - id: analyze-stream-completion-paths
    content: Map all completion/mutation event patterns from current stream handling
    status: completed
  - id: harden-agentbuilder-refresh-trigger
    content: Add fallback tick emission on done when mutation occurred, with duplicate guard
    status: completed
  - id: verify-basemodel-refetch-stability
    content: Confirm BaseModel refetch effect remains guarded and idempotent
    status: completed
  - id: prune-event-type-fields
    content: Keep only required event typing fields used by runtime logic
    status: completed
  - id: validate-lints-and-runtime
    content: Run lint/diagnostic checks and manual scenario validation
    status: completed
isProject: false
---

# Reliable BaseModel Refresh After Agent Updates

## Objective

Ensure `BaseModel` reflects updated system prompts/workflow schema immediately after the agent finishes applying file changes, even when stream payload shapes vary.

## Current Gap

- Refresh signal is emitted only for one event shape in `AgentBuilder`:
  - `event.type === 'pipeline'`
  - `event.step === 'push'`
  - `event.success === true`
- If the backend returns a different completion pattern (or omits `success`), `schemaSyncTick` is not incremented and `BaseModel` does not refetch.

## Target Files

- [apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)
- [apps/operator/src/pages/base-model/useBaseModel.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/useBaseModel.tsx)
- [libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts)

## Plan

- Keep the existing `schemaSyncTick` architecture.
- In `useAgentBuilder`, emit refresh tick from a broader, deterministic completion path:
  - Primary: pipeline push success (current logic)
  - Fallback: stream `done` when at least one file-mutating tool event occurred in the same run (`write`, `edit`, etc.)
- Add per-send local tracking flags inside `handleSendMessage` to avoid duplicate tick increments:
  - `hasMutatedFilesInRun`
  - `hasEmittedSchemaSyncInRun`
- Keep `BaseModel` effect-based refetch behavior but ensure it remains idempotent and context-guarded.
- Tighten `ICLISendMessageEvent` typing only to fields actually needed by this logic (remove dead optional fields if still unused).

## Validation

- Run one conversation that writes/edits files and ends without `pipeline push success` exact shape; verify `BaseModel` still updates.
- Run one conversation with normal pipeline push success; verify no double refetch tick.
- Confirm no regressions in:
  - chunk-level file refetch
  - agent stream rendering
  - BaseModel dev-mode loading behavior
- Recheck lints for touched files and resolve introduced diagnostics only.
