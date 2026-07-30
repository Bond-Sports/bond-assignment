---
name: Skill-Based AUI Validation
overview: Replace the automated plugin with a SKILL.md file for validation guidance, add a brief mention in AGENTS.md pointing to the skill, and remove the plugin and its references from the template.
todos:
  - id: create-skill
    content: Create .opencode/skills/aui-validate/SKILL.md with validation workflow, output reading, and error/warning response rules
    status: completed
  - id: update-agents-md
    content: Add brief Validation section to AGENTS.md pointing to the skill, expand Quick Validation Checklist
    status: completed
  - id: delete-plugin
    content: Delete .opencode/plugins/aui-validate.js
    status: completed
  - id: update-template
    content: "Update template.ts: remove plugin copy, change mkdir to skills dir, add skill copy"
    status: completed
isProject: false
---

# Replace Plugin with Skill-Based Validation

## Summary

Remove the automated validation plugin entirely. Replace it with:

1. A dedicated skill file at `.opencode/skills/aui-validate/SKILL.md` with full validation workflow instructions
2. A brief addition to `AGENTS.md` pointing the agent to the skill and summarizing when to validate

## File Changes

### 1. CREATE `sandbox-templates/agent-builder/.opencode/skills/aui-validate/SKILL.md`

New skill file with YAML frontmatter (`name: aui-validate`, `description: ...`) followed by:

- **What it does**: Explains `npx aui validate` validates the entire agent folder (cross-file references)
- **When to use**: After creating or editing any `.aui.json` file; before telling the user the agent is complete
- **How to run**: `cd <agent-folder> && npx aui validate` from the agent directory
- **Reading the output**: Detailed breakdown of the output format:
  - `Errors: N` with lines marked `✗` -- blocking, must fix immediately before continuing
  - `Warnings: N` with lines marked `!` -- non-blocking, note them but do not interrupt current work
  - `Validation passed!` vs `Validation failed with N error(s)` -- final status line
- **Error response rules**: Stop current work, read the error details, fix the exact file/field indicated, re-run validation to confirm
- **Warning response rules**: Continue working, optionally address at the end, common warnings (unknown integration refs, unrecognized test keys) often resolve as more files are built
- **Common errors**: Missing `agent.code`, integration references that don't match `integrations.aui.json`, parameter codes not in `parameters.aui.json`, missing `rules.post.success`/`rules.post.fail`

### 2. MODIFY [sandbox-templates/agent-builder/AGENTS.md](sandbox-templates/agent-builder/AGENTS.md)

Add a short section after "Build Order" (before "Quick Validation Checklist"):

```markdown
## Validation

Run `cd <agent-folder> && npx aui validate` after editing `.aui.json` files to catch schema errors and cross-reference issues early. Errors must be fixed immediately. Warnings are non-blocking. Load the `aui-validate` skill for detailed guidance on reading and responding to validation output.
```

Also expand the existing "Quick Validation Checklist" with common error causes.

### 3. DELETE `sandbox-templates/agent-builder/.opencode/plugins/aui-validate.js`

Remove the plugin file entirely.

### 4. MODIFY [sandbox-templates/agent-builder/template.ts](sandbox-templates/agent-builder/template.ts)

- Remove the `.copy(".opencode/plugins/aui-validate.js", ...)` line (line 57-59)
- Change the `mkdir -p` command: replace `/home/user/project/.opencode/plugins` with `/home/user/project/.opencode/skills/aui-validate`
- Add a new `.copy()` for the skill file: `.copy(".opencode/skills/aui-validate/SKILL.md", ".opencode/skills/aui-validate/SKILL.md")`
