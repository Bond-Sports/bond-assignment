---
name: Fix agent-switch loading regression
overview: 'Fix the agent-switch loading indicator regression where progress briefly shows then disappears, replaced by the "New Session" button. The root cause is a race condition: when switching agents, `cliAui` is briefly built with the NEW agent ID but the OLD agent''s stale version, triggering a premature session creation. When `currentAgent` updates moments later, the version gate invalidates `cliAui` (makes it `undefined`), which aborts the in-flight session and clears the change-detection ref, leaving the UI in a "no session, not loading" state.'
todos:
  - id: fix-stale-version
    content: Add network-mismatch check in useCliSessionVersionId to prevent stale versions from being used
    status: completed
  - id: fix-ref-clearing
    content: Remove previousAuiRef.current = null from useCLISessionManager's !aui branch
    status: completed
  - id: fix-loading-gap
    content: Add isAgentTransitioning composite flag to useAgentBuilder computed output
    status: completed
isProject: false
---

# Fix Agent-Switch Loading Regression

## Root Cause Analysis

There is a **render-timing race condition** involving three asynchronous state updates during an agent switch:

### The Sequence That Breaks

```mermaid
sequenceDiagram
  participant User
  participant NetworkAtom as selectedNetwork atom
  participant AgentAtom as currentAgent atom
  participant VersionHook as useCliSessionVersionId
  participant CliAui as cliAui memo
  participant SessionMgr as useCLISessionManager

  User->>NetworkAtom: Selects new agent
  Note over NetworkAtom: _id = NEW_AGENT_ID (immediate)
  Note over AgentAtom: Still has OLD agent data

  NetworkAtom->>VersionHook: Render 1
  Note over VersionHook: currentAgent = OLD agent<br/>selected_version_id = OLD_VERSION<br/>isVersionReady = true (STALE!)

  VersionHook->>CliAui: {newAgentId, OLD_VERSION}
  CliAui->>SessionMgr: Effect fires: agentChanged = true
  Note over SessionMgr: Sets isSessionLoading: true<br/>Starts BFF session creation<br/>(with WRONG version)

  Note over AgentAtom: useCurrentAgent effect runs<br/>setCurrentAgent(null)

  AgentAtom->>VersionHook: Render 2
  Note over VersionHook: currentAgent = null<br/>isVersionReady = false

  VersionHook->>CliAui: undefined
  CliAui->>SessionMgr: Effect cleanup: aborted = true<br/>Effect re-runs: !aui branch<br/>previousAuiRef.current = null

  Note over SessionMgr: BFF session completes...<br/>if (!aborted) → state NOT updated<br/>(OR completes before abort → isSessionLoading: false)

  Note over AgentAtom: New agent data fetched<br/>setCurrentAgent(NEW_AGENT)

  AgentAtom->>VersionHook: Render 3
  Note over VersionHook: currentAgent = NEW agent<br/>selected_version_id resolved<br/>isVersionReady = true

  VersionHook->>CliAui: {newAgentId, NEW_VERSION}
  CliAui->>SessionMgr: Effect fires<br/>prev = null → NO change detection!<br/>No session created ❌
```

### Why the Button Shows

The "New Session" button renders when ALL of these are true (from [AgentEmptyState.tsx](apps/operator/src/widgets/AgentBuilder/partials/AgentEmptyState.tsx)):

- `isCliConnected` is `false` (`cliSession == null`)
- `isCliSessionLoading` is `false`
- `cliSessionError` is `null`

This happens because:

1. The session created with the wrong version has `auiContext: {newAgentId, OLD_VERSION}`
2. When `cliAui` returns with `{newAgentId, NEW_VERSION}`, `matchesContext` fails (version mismatch)
3. `belongsToCurrentAui = false` → `session: null` returned to consumer
4. `isSessionLoading` becomes `false` either because the wrong-version creation completed, or because no new creation was started
5. `previousAuiRef.current` was nulled → no change detection → no new session creation

### Three Sub-Problems

| #   | Problem                                                                                               | Where                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | `cliAui` is built with **stale version** (old agent's version + new agent's ID) for one render        | [useCliSessionVersionId.ts](apps/operator/src/hooks/useCliSessionVersionId.ts)                  |
| 2   | `previousAuiRef.current` is **cleared** when `aui` goes through `undefined`, killing change detection | [useCLISessionManager.ts](libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts) L82-84     |
| 3   | No loading state shown during the gap while version resolves for the new agent                        | [useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) computed values |

---

## Fix

### Fix 1 — Detect stale version immediately in `useCliSessionVersionId`

**File**: [apps/operator/src/hooks/useCliSessionVersionId.ts](apps/operator/src/hooks/useCliSessionVersionId.ts)

Add `useNetwork()` and compare `currentAgent.scope.network_id` against `selectedNetwork._id`. If they differ, the version belongs to a different agent and must not be used:

```typescript
const [selectedNetwork] = useNetwork();
const isAgentCurrent = currentAgent?.scope?.network_id === selectedNetwork?._id;

if (!isAgentCurrent) {
  return { versionId: undefined, isVersionReady: false };
}
```

This early-return fires on the **same render** that `selectedNetwork._id` changes, preventing `cliAui` from ever being built with a stale version. No premature BFF session creation.

### Fix 2 — Preserve `previousAuiRef` when `aui` goes through `undefined`

**File**: [libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts](libs/api/src/api/CLIConnectionApi/useCLISessionManager.ts) L82-84

Remove the line `previousAuiRef.current = null` from the `if (!aui)` branch:

```typescript
if (!aui) {
  // Don't clear ref — preserves change detection when aui
  // goes through undefined during agent/version transitions.
  return;
}
```

When `cliAui` returns (after version resolves), the ref still holds the old agent's identity, allowing `agentChanged` to be correctly detected.

### Fix 3 — Show loading during the version-resolution gap

**File**: [apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts](apps/operator/src/widgets/AgentBuilder/useAgentBuilder.ts) computed values (~L1118)

Derive a composite loading flag that covers the version-resolution gap:

```typescript
const isAgentTransitioning = !!selectedNetwork?._id && !isSessionVersionReady;
```

Then in the computed return:

```typescript
computed: {
  isCliSessionLoading: isCliSessionLoading || isAgentTransitioning,
  ...
}
```

This ensures the spinner shows immediately when an agent is selected but its version hasn't resolved yet — covering initial load, agent switches, and version dropdown changes.

---

## Expected Flow After Fix

```mermaid
sequenceDiagram
  participant User
  participant NetworkAtom as selectedNetwork
  participant VersionHook as useCliSessionVersionId
  participant CliAui as cliAui
  participant SessionMgr as useCLISessionManager
  participant UI

  User->>NetworkAtom: Switch agent
  Note over NetworkAtom: _id = NEW

  NetworkAtom->>VersionHook: network_id mismatch detected
  Note over VersionHook: isVersionReady = false (immediate!)
  VersionHook->>CliAui: undefined
  CliAui->>SessionMgr: !aui → return (ref preserved)
  Note over UI: isAgentTransitioning = true<br/>→ Spinner shown ✓

  Note over VersionHook: currentAgent updates<br/>version resolves
  VersionHook->>CliAui: {newAgentId, NEW_VERSION}
  CliAui->>SessionMgr: agentChanged detected (ref intact)<br/>Creates session with correct version
  Note over UI: Progress text streams in ✓
  Note over SessionMgr: Session created
  Note over UI: Session connected ✓
```

- Zero premature BFF calls (no wrong-version session creation)
- Loading indicator visible throughout the entire transition
- Single session creation with the correct version
