---
name: Sync template with disk files
overview: "Update `template.ts` to match the actual files on disk: remove stale `.copy()` calls for deleted files and add `.copy()` calls for new files."
todos:
  - id: sync-template
    content: Replace stale .copy() calls in template.ts with copies matching actual files on disk
    status: completed
isProject: false
---

# Sync template.ts with actual files on disk

**File:** [sandbox-templates/agent-builder/template.ts](sandbox-templates/agent-builder/template.ts)

### Remove stale copies (lines 33-47)

These reference files that no longer exist on disk:

- `handle-account-support.aui.json` (source for 3 copy calls -- all 3 must go)
- `happy-path.test.aui.json`

### Add new copies

These files exist on disk but are not in template.ts:

- `example-agent/tools/create-dispute.aui.json` (now its own file, not a copy of handle-account-support)
- `example-agent/tests/balance-inquiry.test.aui.json`
- `example-agent/tests/dispute-flow.test.aui.json`
- `example-agent/tests/edge-cases.test.aui.txt`
- `example-agent/tests/multi-scenario.test.aui.json`

### Result

The tools and tests sections of the `.copy()` chain will be replaced with:

```typescript
.copy("example-agent/tools/create-dispute.aui.json", "example-agent/tools/create-dispute.aui.json")
.copy("example-agent/tests/balance-inquiry.test.aui.json", "example-agent/tests/balance-inquiry.test.aui.json")
.copy("example-agent/tests/dispute-flow.test.aui.json", "example-agent/tests/dispute-flow.test.aui.json")
.copy("example-agent/tests/edge-cases.test.aui.txt", "example-agent/tests/edge-cases.test.aui.txt")
.copy("example-agent/tests/multi-scenario.test.aui.json", "example-agent/tests/multi-scenario.test.aui.json")
```
