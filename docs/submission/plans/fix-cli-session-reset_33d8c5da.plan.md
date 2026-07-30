---
name: fix-cli-session-reset
overview: Clear the persisted CLI sandbox when the app invalidates a dead session so the next reconnect creates a fresh sandbox instead of reusing the stale one from localStorage.
todos:
  - id: clear-persisted-sandbox-on-invalidate
    content: Update `useCLISessionManager.invalidateSession()` to clear the global sandbox id before resetting shared session state.
    status: completed
  - id: verify-reconnect-recovers-fresh
    content: Validate that an invalidated dead sandbox is removed from storage and the next reconnect creates a fresh session.
    status: completed
  - id: run-focused-checks
    content: Run focused lint or diagnostics for the touched CLI session manager file and confirm manual new-session flow still behaves correctly.
    status: completed
isProject: false
---

# Fix Dead CLI Reconnect Loop

## Cause

The reconnect loop is driven by a stale persisted sandbox id being reused after invalidation:

- `[libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts](libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts)` creates sessions with `getGlobalSandboxId() || sandboxId`, so persisted storage wins on every reconnect.
- `[libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts](libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts)` currently resets only in-memory session state in `invalidateSession()` and leaves the persisted sandbox untouched.
- `[libs/api/src/api/CLIConnectionApi/cliFiles/useCLISessionAndFiles.ts](libs/api/src/api/CLIConnectionApi/cliFiles/useCLISessionAndFiles.ts)` auto-reconnects whenever there is no active session, so a dead persisted sandbox keeps getting retried.

Relevant snippets:

```ts
const effectiveSandboxId = getGlobalSandboxId() || sandboxId;
```

```ts
const invalidateSession = useCallback(() => {
  setState({
    auiContext: null,
    session: null,
    isSessionLoading: false,
    progressText: "",
    error: null,
  });
  setFilesState(initialCliFilesState);
}, [setState, setFilesState]);
```

## Recommended Fix

1. Update `[libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts](libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts)` so `invalidateSession()` also calls `clearGlobalSandboxId()`.
2. Keep the rest of the reconnect flow unchanged for the first pass. This fixes the cause directly: once a session is declared invalid, the next `createCLISession()` request will no longer reuse the dead sandbox from `localStorage`.
3. Leave `[apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)` functionally unchanged in the first pass. Its explicit `clearGlobalSandboxId(); invalidateSession();` path will become redundant but harmless; simplifying it should only happen after verifying the primary fix.

## Validation

1. Reproduce with a stale `aui_cli_sandbox_id` in `localStorage` that points to a dead sandbox.
2. Trigger any invalidation path already in code, such as:

- send failure in `[apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)`
- file-load invalidation in `[libs/api/src/api/CLIConnectionApi/cliFiles/useCLIFiles.ts](libs/api/src/api/CLIConnectionApi/cliFiles/useCLIFiles.ts)`
- keepalive failure in `[libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts](libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts)`

1. Confirm that invalidation removes `aui_cli_sandbox_id`, and the following reconnect creates a fresh session instead of retrying the dead sandbox.
2. Run focused linting for the touched API file and verify there is no regression in manual “Create New Session”.

## Deliberately Not In Scope For First Fix

- Changing auto-retry behavior in `[libs/api/src/api/CLIConnectionApi/cliFiles/useCLISessionAndFiles.ts](libs/api/src/api/CLIConnectionApi/cliFiles/useCLISessionAndFiles.ts)`
- Tightening `isCLISessionInvalidError()` in `[libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts](libs/api/src/api/CLIConnectionApi/cliConnectionApi.ts)`
- Refactoring the global sandbox key to be scoped per account/agent

Those may be worth a second pass, but they are not required to fix the confirmed root cause.
