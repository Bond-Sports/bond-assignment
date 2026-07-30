---
name: prompt-only output trim
overview: Reduce visible agent verbosity only through prompt and skill wording, without changing streaming or event filtering. This is a best-effort behavior change, not a hard guarantee.
todos:
  - id: tighten-v2-prompt
    content: Add explicit user-facing brevity and no-narration instructions to `src/lib/v2-chat-prompt.ts`
    status: pending
  - id: tighten-v3-prompt
    content: Mirror the same user-facing brevity guidance in `src/lib/v3-chat-prompt.ts`
    status: pending
  - id: tighten-voa-prompt
    content: Add a matching `User-Facing Output` section to `src/lib/voa-system-prompt.ts`
    status: pending
  - id: consistency-check
    content: Cross-check the three prompt variants so they enforce the same visible output style and limitations
    status: pending
isProject: false
---

# Prompt-Only Output Trim

## Goal

Make the main agent sound more minimal and professional to end users by changing only prompt/skill instructions, not backend event filtering.

Target outcome:

- no step-by-step narration like "I'll help you..." or "Now I'll validate..."
- no self-talk about what the agent is about to do
- concise customer-facing updates during validate/push/test flows
- short failure messages that keep only useful facts

## Constraint

This is intentionally **prompt-only**. It can reduce chatter, but it cannot fully guarantee silence because the backend still streams raw assistant `text` and `thinking` events.

## Files To Update

### 1. `v2` prompt builder

Update `[src/lib/v2-chat-prompt.ts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/v2-chat-prompt.ts)` to add a dedicated customer-facing output style section inside the Artemis system prompt.

Add instructions like:

- never narrate your internal work
- never announce upcoming actions
- never explain validate/diff/push/test steps unless the user explicitly asks
- if progress must be communicated, keep it to one short sentence
- final success should be brief and outcome-focused
- on failure, give only the minimum facts needed to understand what failed and what happens next

This is currently the main opencode prompt builder and is the highest-priority file.

### 2. `v3` prompt builder

Mirror the same output-style guidance in `[src/lib/v3-chat-prompt.ts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/v3-chat-prompt.ts)` so the Claude-based path does not drift from `v2`.

Right now both prompt builders contain large shared Artemis instructions, so the new tone/output block should be kept semantically aligned between them.

### 3. VOA system prompt

Add the same guidance to `[src/lib/voa-system-prompt.ts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/src/lib/voa-system-prompt.ts)` so the alternate provider path follows the same customer-visible style.

This file already has separate sections like `# Tool Usage` and `# Completion Sequence`; the new guidance fits naturally as a short `# User-Facing Output` section.

## Prompt Wording Direction

The new guidance should be explicit and prescriptive, for example:

- customer-facing output must be compact and professional
- do not expose internal reasoning, planning, or implementation steps
- do not say "let me", "now I will", "I’m going to", or similar narration
- do not describe tools or file operations to the user
- prefer one short final summary over multiple progress messages
- if validation/push/testing succeeds, report the outcome briefly
- if something fails, report the failure briefly with the key fact only

## Validation

After implementation, verify by running a representative edit/validate/push/test workflow and checking whether the visible assistant text becomes materially shorter.

Check specifically for removal of phrases like:

- "I'll help you..."
- "Let me first..."
- "Now I'll..."
- long bullet recaps of internal implementation steps

Also confirm failure messages still retain essential facts.

## Expected Outcome

The agent should sound noticeably cleaner and more customer-appropriate in most cases, while keeping the implementation limited to prompt files only.

## Residual Risk

Because the stream layer is unchanged, occasional verbose narration may still leak through if the model ignores the prompt. That is an accepted limitation of this scope.
