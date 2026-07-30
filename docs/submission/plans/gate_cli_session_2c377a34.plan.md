---
name: Gate CLI Session
overview: Prevent the duplicate CLI session create on agent switch by reusing the existing version-resolution gate in the base-model code-view path, so the request waits for version context and only falls back to an unversioned request when version resolution explicitly concludes there is no version to send.
todos:
  - id: trace-outlier-cli-credentials
    content: Make `useBaseModelCodeView` use the shared version-resolution hook before building CLI credentials.
    status: completed
  - id: preserve-fallback-behavior
    content: Keep the existing fallback semantics so an unversioned request is still allowed only after version readiness explicitly resolves without a usable version.
    status: completed
  - id: verify-single-session-create
    content: Validate the agent-switch flow to confirm the duplicate unversioned-then-versioned session create no longer occurs.
    status: completed
isProject: false
---

# Gate CLI Session Creation

## Root Cause

The most likely first unversioned `POST /sessions` is coming from `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/useBaseModelCodeView.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/useBaseModelCodeView.ts)`, because it builds CLI credentials immediately from account/network/token and omits `versionId` entirely.

```59:69:apps/operator/src/pages/base-model/useBaseModelCodeView.ts
  const cliAui = useMemo(
    () =>
      token && account?._id && selectedNetwork?._id
        ? {
            token,
            accountId: account._id,
            agentId: selectedNetwork._id,
            environment: getCliAuiEnvironment(),
          }
        : undefined,
```

That differs from the already version-aware paths in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CLISessionKeeper/CLISessionKeeper.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/CLISessionKeeper/CLISessionKeeper.tsx)` and `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts)`, which already wait for `isVersionReady` from `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useCliSessionVersionId.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useCliSessionVersionId.ts)`.

## Minimal Change

Update only `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/useBaseModelCodeView.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/useBaseModelCodeView.ts)`:

- Import `useCliSessionVersionId`.
- Read `{ versionId, isVersionReady }` from that hook.
- Build `cliAui` only when `isVersionReady` is `true`.
- Pass `versionId` into `cliAui`.

This keeps the fallback behavior the user wants: if version resolution completes and there is genuinely no version to send, the existing hook can still expose `versionId` as `undefined` and allow the request to proceed once readiness is satisfied.

## Why This Is The Smallest Safe Fix

- It reuses the existing version-resolution policy instead of introducing new session-manager logic.
- It avoids larger changes in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts)`, where a small mistake would affect every CLI consumer.
- It aligns the one outlier path with the two existing version-aware paths, which should collapse the switch flow onto a single credential shape instead of `without versionId` then `with versionId`.

## Validation

After the change:

- Switch agents while on the Base Model page.
- Confirm the session-create request is not fired before version readiness resolves.
- Confirm there is only one `POST /sessions` for the switch when a version exists.
- Confirm the fallback still works when version resolution ends with no available version.
