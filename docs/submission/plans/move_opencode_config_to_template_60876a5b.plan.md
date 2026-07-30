---
name: Move opencode config to template
overview: Move the opencode.json file creation from runtime (session-manager.ts) into the E2B template, so it's baked into the sandbox image alongside the other static files.
todos:
  - id: create-opencode-json
    content: Create `sandbox-templates/agent-builder/opencode.json` with the static config
    status: completed
  - id: add-copy-to-template
    content: Add `.copy('opencode.json', 'opencode.json')` to `template.ts`
    status: completed
  - id: remove-runtime-write
    content: Remove the 'Configuring project...' block from `session-manager.ts` and clean up unused imports
    status: completed
  - id: rebuild-template
    content: Rebuild the E2B template
    status: completed
isProject: false
---

# Move opencode.json to E2B Template

### 1. Create the static file

**New file:** `sandbox-templates/agent-builder/opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",
  "provider": {
    "anthropic": {
      "options": {
        "apiKey": "{env:ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

### 2. Add `.copy()` to the template

**File:** [sandbox-templates/agent-builder/template.ts](sandbox-templates/agent-builder/template.ts)

Add after the existing `.copy()` calls (e.g. after line 49):

```typescript
.copy('opencode.json', 'opencode.json')
```

Since workdir is `/home/user/project`, this places it at `/home/user/project/opencode.json`.

### 3. Remove the runtime write from session manager

**File:** [src/lib/session-manager.ts](src/lib/session-manager.ts) lines 122-143

Remove the entire "Configuring project..." block (the `progress()` call, the `sandbox.commands.run(cat > ...)`, and the catch). This eliminates the `CommandExitError` usage too -- check if it's still used elsewhere; if not, remove the import.

### 4. Rebuild the template

```bash
cd sandbox-templates/agent-builder && npm run build:dev
```
