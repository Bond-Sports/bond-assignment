---
name: agent-builder versionid
overview: Tighten the staged Agent Builder session-versioning change so `/api/sessions` receives `versionId` only from Agent Builder, with `active_version_id` as the primary source and a published-version fallback, while leaving existing shared-session reuse behavior unchanged.
todos:
  - id: review-staged-cli-plumbing
    content: Keep the shared CLI session plumbing for optional `versionId`, with no new callers beyond Agent Builder.
    status: completed
  - id: fix-agentbuilder-version-selection
    content: Update Agent Builder to prefer `currentAgent.active_version_id`, then published version, then first available version.
    status: completed
  - id: verify-scope-and-behavior
    content: Confirm the diff does not change Base Model or CLISessionKeeper behavior and preserves shared-session reuse.
    status: completed
isProject: false
---

# Agent Builder Session `versionId`

## What I Found

- The staged diff already threads an optional `versionId` through the shared CLI session creation path in [libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts](libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts) and [libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts](libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts).
- Only Agent Builder currently passes that option via [apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts), so other callers are not affected unless they start passing `versionId` too.
- The current staged Agent Builder selection logic is:

```ts
return versions.find((v) => v.status === "published")?.id ?? versions[0]?.id;
```

- That does not match the requested priority. The better source of truth is `currentAgent?.active_version_id`, which already exists in operator state and is used elsewhere for versioning.
- `CLISessionKeeper` preconnects shared sessions from [apps/operator/src/components/CLISessionKeeper/CLISessionKeeper.tsx](apps/operator/src/components/CLISessionKeeper/CLISessionKeeper.tsx). Because you chose to reuse existing sessions, the implementation should not force session recreation when a session already exists without the desired `versionId`.

## Proposed Change

- In [apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts), keep the new version-aware session option only for Agent Builder.
- Replace the current `sessionVersionId` resolver so it uses this order:

1. `currentAgent?.active_version_id` if it exists and is present in the fetched versions list.
2. The first `published` version from `useGetAgentVersions`.
3. The first available version from the fetched list.

- Keep [libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts](libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts) and [libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts](libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts) as the shared plumbing layer for the request body field, but do not add any feature-flag gating around `/api/sessions` for Agent Builder.
- Do not change `CLISessionKeeper`, Base Model code view, or other session consumers.

## Expected Result

- New Agent Builder session creations will send `versionId` in the `/api/sessions` body.
- The chosen value will prefer the agent’s active version, then a published version, then any available version.
- Other endpoints and other session consumers remain unchanged because they do not pass `versionId`.
- Existing shared sessions may still be reused without recreation, per your selection.

## Validation

- Inspect the final staged diff to confirm only Agent Builder resolves and passes the version choice.
- Verify the `sessionVersionId` computation in [apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) matches the requested priority order.
- If runtime validation is needed later, open Agent Builder with no existing new session and confirm the `/api/sessions` request payload contains `versionId`.
