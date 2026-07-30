---
name: trim smoke docs
overview: Reduce instruction bloat in the smoke-test template by removing repetition and over-prescriptive wording while preserving the current runner/worker/orchestrator contract.
todos:
  - id: trim-aui-evals
    content: Reduce `aui-evals/SKILL.md` to the essential worker contract
    status: completed
  - id: trim-evaluator-manifest
    content: Shorten `evaluator.md` so it defers detailed behavior to the skill
    status: completed
  - id: trim-evaluate-doc
    content: Convert `EVALUATE.md` into high-level architecture docs only
    status: completed
  - id: dedupe-orchestrator-doc
    content: Trim redundant worker disclaimers in `validate-and-push/SKILL.md`
    status: completed
  - id: consistency-pass
    content: Cross-check all four docs against the current `smoke.js` contract
    status: completed
isProject: false
---

# Trim Smoke-Test Instructions

## Goal

Make the smoke-test template easier for the subagent to follow by cutting duplicated and overly specific instructions, while keeping the existing behavioral boundaries intact:

- worker executes only
- orchestrator grades
- runner remains the source of execution status

## What I will change

### 1. Shrink the worker skill to the true contract

Rewrite [sandbox-templates/agent-builder-subagents/.opencode/skills/aui-evals/SKILL.md](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/skills/aui-evals/SKILL.md) so it only keeps:

- payload shape
- runner invocation pattern
- runner-output-to-summary mapping
- acknowledgement format
- a short list of essential guardrails

I will remove or compress:

- long anti-pattern lists like explicit `test` / `jq` / `cat` / `echo` examples
- repeated “do not grade / do not interpret / do not narrate” phrasing when already covered once
- duplicated failure-mode prose that is already obvious from the runner contract

### 2. Make the worker manifest concise and non-redundant

Trim [sandbox-templates/agent-builder-subagents/.opencode/agents/evaluator.md](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/agents/evaluator.md) so it becomes a short role + permission wrapper around the skill, instead of restating the whole playbook.

Keep:

- role boundary: worker executes, orchestrator grades
- minimal artifact isolation reminder
- existing permission block

Remove or compress:

- repeated copies of the skill’s step-by-step flow
- repeated “never X” bullets that the permission block already enforces

### 3. Turn `EVALUATE.md` into architecture docs, not a second skill

Trim [sandbox-templates/agent-builder-subagents/EVALUATE.md](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/EVALUATE.md) so it stays high-level:

- what `test_questions.json` is for
- what the post-push smoke test is for
- orchestrator vs worker responsibilities
- where the authoritative detailed contracts live

I will remove duplicated worker-level operational detail such as the full factual summary schema explanation when that already exists in the skill.

### 4. Keep `validate-and-push` detailed, but cut repeated worker disclaimers

Review [sandbox-templates/agent-builder-subagents/.opencode/skills/validate-and-push/SKILL.md](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/skills/validate-and-push/SKILL.md) and trim only redundant reminders about what the worker does not do.

Keep intact:

- scenario design rules
- grading rules
- aggregation rules
- failure handling

Compress:

- repeated statements that `execution=OK` is not PASS
- repeated statements that workers do not grade, when already stated clearly once per major section

## Editing principle

The simplification will be conservative:

- keep the system behavior unchanged
- remove duplicate wording before removing protective constraints
- prefer one authoritative place per concept
  - worker contract in `aui-evals`
  - worker identity/permissions in `evaluator.md`
  - orchestration/grading in `validate-and-push`
  - high-level explanation in `EVALUATE.md`

## Expected outcome

After the trim, the subagent should see a much smaller instruction surface with fewer chances to get distracted by enumerated prohibitions, but the same core boundaries will still be explicit and testable.

## Validation

After the markdown cleanup, I will do a read-through consistency pass across the four files to ensure:

- no contradictions between worker/orchestrator responsibilities
- no references to removed steps or outdated wording
- the runner contract described in docs still matches [sandbox-templates/agent-builder-subagents/.opencode/skills/aui-evals/scripts/smoke.js](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/skills/aui-evals/scripts/smoke.js)
