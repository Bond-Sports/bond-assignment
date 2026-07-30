---
name: Agent Builder Versioning
overview: Align CLI session creation with agent versioning so every Agent Builder session is created with a version, and block the initial `/sessions` request until that version is resolved.
todos:
  - id: derive-effective-cli-version
    content: Use selected version when AGENT_VERSIONING is enabled, and keep a fallback fetched version path only when the flag is disabled.
    status: completed
  - id: gate-initial-session-request
    content: Prevent CLISessionKeeper and AgentBuilder from creating or connecting a CLI session until versionId is resolved.
    status: completed
  - id: make-session-manager-version-aware
    content: Include versionId in shared CLI session matching and dedupe so version changes create the correct session.
    status: completed
  - id: validate-session-flow
    content: Verify initial load, flag-off fallback, and flag-on dropdown version behavior with targeted lint/manual checks.
    status: completed
isProject: false
---

# Align CLI Session Versioning

The current diff only adds `versionId` to `cliAui` inside [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts), but the first background CLI session is actually created from [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CLISessionKeeper/CLISessionKeeper.tsx`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CLISessionKeeper/CLISessionKeeper.tsx), which currently builds `aui` without any `versionId`. On top of that, [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts) keys session reuse by account+agent only, so a dropdown version change would otherwise keep using a session created for the wrong version.

## Planned Changes

- Define one effective CLI session version source for operator surfaces that create CLI sessions.

  - In [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts), stop always using the fetched fallback.
  - When `AGENT_VERSIONING` is on, use the existing selected version source already used elsewhere in operator: `currentAgent.selected_version_id` via [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useEffectiveAgentVersion.ts`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useEffectiveAgentVersion.ts).
  - When `AGENT_VERSIONING` is off, keep a manual fallback version lookup using [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/agent-versions.ts`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/agent-versions.ts): prefer `active_version_id` when present in the fetched list, then a published version, then the first available version.

- Gate all initial CLI session creation until the effective version is known.

  - Update [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CLISessionKeeper/CLISessionKeeper.tsx`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CLISessionKeeper/CLISessionKeeper.tsx) so it does not pass `aui` into `useCLISessionAndFiles()` until `versionId` is resolved.
  - Keep the same guard in [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) so manual connect/create-session actions cannot race before the version is ready.
  - This addresses the real initial-load path because [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/cliFiles/useCLISessionAndFiles.ts`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/cliFiles/useCLISessionAndFiles.ts) auto-calls `connectSession(aui)` whenever `aui` exists and no session is present.

- Make CLI session reuse version-aware in the shared session manager.
  - Update [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts) so session identity/dedupe includes `versionId`, not only `accountId` and `agentId`.
  - Ensure a resolved version change behaves like a real session context change, so selecting a different version from the dropdown does not silently reuse a session created for the previous version.
  - Keep [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts) as the transport layer for `versionId` in the `/sessions` request body.

## Key Facts Driving This Plan

- The current diff in [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) always computes `sessionVersionId` from fetched versions plus `active_version_id`; it does not branch on `AGENT_VERSIONING` or use `selected_version_id`.
- [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CLISessionKeeper/CLISessionKeeper.tsx`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CLISessionKeeper/CLISessionKeeper.tsx) currently constructs `aui` without `versionId`, so the background preconnect path can create the first session before Agent Builder logic runs.
- [`/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts`](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts) currently treats sessions as matching when only account and agent match, which is insufficient if session creation is version-sensitive.

## Validation

- Verify that no initial `POST /sessions` is issued until the effective version is known.
- Verify that with `AGENT_VERSIONING` off, Agent Builder still creates a session using the fetched fallback version.
- Verify that with `AGENT_VERSIONING` on, Agent Builder uses the dropdown-selected version and changing that selection results in a version-matched session instead of reusing a stale one.
- Run targeted linting for the edited files after implementation and do a focused manual check of the session creation flow.
