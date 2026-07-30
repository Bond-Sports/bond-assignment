---
name: Improve AGENTS.md Guidance
overview: Enhance AGENTS.md to teach the OpenCode agent about the automated validation plugin, how to interpret its output, and how to prioritize errors over warnings.
todos:
  - id: update-agents-md
    content: Add validation plugin awareness, error/warning response rules, manual validation instructions, and enhanced checklist to AGENTS.md
    status: pending
isProject: false
---

# Improve AGENTS.md with Validation Plugin Guidance

## What changes

Single file change: [sandbox-templates/agent-builder/AGENTS.md](sandbox-templates/agent-builder/AGENTS.md)

The current AGENTS.md is minimal (53 lines). It covers the basics (directory structure, required files, build order) but has no mention of the validation plugin or how the agent should react to validation feedback. The agent needs clear instructions on:

- That automated validation runs after every `.aui.json` file edit
- How to read the validation output (errors vs warnings)
- That errors are **blocking** and must be fixed immediately before continuing
- That warnings are **non-blocking** and can be addressed later or ignored
- How to manually run validation itself via `npx aui validate`

## Specific additions to AGENTS.md

### 1. New section: "Automated Validation" (after "Build Order", before "Quick Validation Checklist")

Add a section explaining:

- A validation plugin runs automatically after every `.aui.json` file edit -- no manual action needed
- The plugin runs `npx aui validate` from within the agent folder
- It validates the **entire agent folder** (cross-file references between all `.aui.json` files), not individual files
- A final validation sweep also runs when the session goes idle

### 2. New section: "Responding to Validation Results"

Clear behavioral rules for the agent:

- **Errors** (marked with `Errors: N` where N > 0 or `Validation failed`):
  - Stop what you are doing and fix them immediately
  - Do not move on to the next file or step until errors reach 0
  - Read the error output carefully -- it points to the exact file and field causing the problem
- **Warnings** (marked with `Warnings: N` or lines starting with `!`):
  - Non-blocking -- do not interrupt your current work to fix them
  - Address them at the end if time permits, or note them for the user
  - Common warnings include unknown integration references or unrecognized config keys in test files -- these often resolve themselves as you build out more files
- **Clean pass** (`Validation passed!` with 0 errors and 0 warnings):
  - Continue with your work, no action needed

### 3. New section: "Manual Validation"

Teach the agent it can also validate on demand:

- Run `cd <agent-folder> && npx aui validate` at any time
- Useful after completing a batch of edits to confirm everything is consistent
- Always validate before telling the user the agent is complete

### 4. Enhance existing "Quick Validation Checklist"

Expand the existing checklist with the most common error causes the validation catches:

- All `tools[X].integrations` entries must reference integrations defined in `integrations.aui.json`
- All parameter codes referenced in tools must exist in `parameters.aui.json`
- `agent.aui.json` must have a non-empty `agent.code` field
- Entity references must match entity codes defined in `entities.aui.json`
