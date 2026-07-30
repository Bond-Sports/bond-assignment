---
name: simplify eval runner
overview: Replace the current one-subagent-per-scenario smoke-test flow with a single JS batch entrypoint invoked directly by the orchestrator, while preserving the existing `.eval-runs/<run_id>/` per-scenario artifact contract and orchestrator grading.
todos:
  - id: design-batch-runner
    content: Add `run-batch.js` that discovers scenario payloads, runs `smoke.js` in parallel, and emits the existing per-scenario artifacts.
    status: completed
  - id: remove-subagent-layer
    content: Remove the evaluator-subagent execution layer so the orchestrator invokes `run-batch.js` directly and no longer depends on `aui-evals` or `evaluator.md` for execution.
    status: pending
  - id: simplify-orchestrator-dispatch
    content: Update `validate-and-push` so it keeps payload creation and grading but runs `node .opencode/skills/aui-evals/scripts/run-batch.js <run_id>` directly instead of dispatching any evaluator task.
    status: completed
  - id: sync-template-docs
    content: Copy the new script in `template.ts`, remove stale subagent wiring/docs where no longer needed, and align `EVALUATE.md` with the orchestrator-run batch architecture and the actual turn-limit contract.
    status: completed
isProject: false
---

# Simplify Post-Push Eval Dispatch

## Goal

Make the post-push smoke-test flow simpler and cleaner by changing it from:

- orchestrator writes payloads
- orchestrator dispatches many `evaluator` Tasks in parallel
- each worker runs one scenario and writes one summary

To:

- orchestrator writes payloads
- orchestrator runs one batch entrypoint for the whole `run_id`
- the batch entrypoint fans scenarios out locally in parallel and writes the same per-scenario summaries/logs/transcripts the orchestrator already knows how to grade

## Current Contracts To Preserve

- [sandbox-templates/agent-builder-subagents/.opencode/skills/validate-and-push/SKILL.md](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/skills/validate-and-push/SKILL.md): orchestrator owns matrix design, grading, aggregate PASS/SKIPPED/FAIL, and fail-closed behavior.
- [sandbox-templates/agent-builder-subagents/.opencode/skills/aui-evals/scripts/smoke.js](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/skills/aui-evals/scripts/smoke.js): stable per-scenario runner contract (`stdout` JSON result, `stderr` NDJSON progress, exit-code conventions, `.aui-sandbox.json` metadata).
- The orchestrator must still be able to read `RUN_DIR/<scenario_id>.json` files exactly as it does today.

## Proposed Implementation

### 1. Add a batch runner layer without breaking `smoke.js`

Create one new script under [sandbox-templates/agent-builder-subagents/.opencode/skills/aui-evals/scripts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/skills/aui-evals/scripts):

- `run-batch.js`: the single batch coordinator invoked by the orchestrator.

Design:

- `run-batch.js` should discover `*.payload.json` inside `/home/user/project/.eval-runs/<run_id>/`.
- For each payload, it should spawn `node smoke.js <turn...>` as a child process.
- It should run scenarios in parallel from one worker process, capture each scenario's stdout/stderr separately, and write:
  - `<scenario_id>.transcript.json`
  - `<scenario_id>.progress.log`
  - `<scenario_id>.json`
- It should keep the current summary JSON shape so the orchestrator grading logic does not need a format rewrite.

This keeps the current low-level runner stable and moves orchestration complexity into one explicit batch runner instead of many Task dispatches or a pass-through subagent.

### 2. Remove the evaluator-subagent execution layer

Update the template so smoke-test execution no longer depends on an evaluator subagent:

- [sandbox-templates/agent-builder-subagents/.opencode/skills/validate-and-push/SKILL.md](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/skills/validate-and-push/SKILL.md) should become the only execution playbook for the post-push smoke test.
- [sandbox-templates/agent-builder-subagents/.opencode/agents/evaluator.md](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/agents/evaluator.md) should be removed, or at minimum removed from all active orchestration paths, if it no longer provides distinct behavior.
- [sandbox-templates/agent-builder-subagents/.opencode/skills/aui-evals/SKILL.md](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/.opencode/skills/aui-evals/SKILL.md) should either be deleted or reduced to pure runner reference material. It should not remain as dead execution guidance.

The important simplification is that there is no intermediate agent whose only job is to start a script and then wait.

### 3. Simplify orchestrator dispatch, keep grading logic

Update [sandbox-templates/agent-builder-subagents/.opencode/skills/validate-and-push/SKILL.md](/Users/bugo/Documents/Developer/aui/agent-builder-subagents/.opencode/skills/validate-and-push/SKILL.md) step 4 so it still:

- designs the scenario matrix
- writes one payload file per scenario under `RUN_DIR`
- reads and grades one summary file per scenario

But changes execution from:

- many `Task(subagent_type="evaluator", prompt:"run_id=...\nscenario_id=...")`

to:

- one direct orchestrator-side command: `node .opencode/skills/aui-evals/scripts/run-batch.js <run_id>`

The grading and reporting sections should stay mostly intact, because the artifact contract is intentionally preserved.

### 4. Re-scope template wiring and permissions

Update [sandbox-templates/agent-builder-subagents/opencode.json](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/opencode.json) and related template docs so the orchestrator has the exact permissions and instructions it needs to run the batch script directly.

This step should also remove stale evaluator references from bundled instructions if the subagent is no longer part of the design.

### 5. Package the new scripts into the template

Update [sandbox-templates/agent-builder-subagents/template.ts](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/template.ts) to copy the new batch runner file into the sandbox image alongside `smoke.js`.

Without this, the docs and worker contract would point to files that never land in the template.

### 6. Align the docs and remove stale parallel-worker wording

Update [sandbox-templates/agent-builder-subagents/EVALUATE.md](/Users/bugo/Documents/Developer/aui/agent-builder-bff/sandbox-templates/agent-builder-subagents/EVALUATE.md) so the architecture overview matches the new model:

- orchestrator runs the batch runner directly
- local fan-out inside the batch runner
- same per-scenario artifact layout for orchestrator grading

Also fix the current turn-limit mismatch while touching the docs:

- `EVALUATE.md` says `<= 6 turns`
- `validate-and-push` and `smoke.js` currently use `<= 8`

The docs should align to the actual enforced contract.

## Implementation Notes

- Preserve per-scenario summary filenames and JSON shape to avoid rewriting grading logic.
- Keep `smoke.js` focused on one scenario; do not mix batch logic into it unless there is a strong reason after implementation review.
- Sort discovered payload files deterministically in `run-batch.js` so logs and failures are reproducible.
- Fail closed: if a payload is malformed or a child process produces missing/invalid output, the batch runner should still emit that scenario's summary as `ERROR` rather than silently skipping it.
- Keep artifact names scenario-specific so local parallelism cannot clobber files.
- Remove dead subagent instructions instead of documenting both designs at once.

## Validation After Implementation

- Confirm the orchestrator docs run the batch runner directly.
- Confirm stale evaluator/subagent references are removed or intentionally retained with a clear reason.
- Confirm the template copies `run-batch.js`.
- Confirm the batch runner still emits `<scenario_id>.json` files with the exact summary fields the orchestrator grading section expects.
- Confirm all turn-limit references are consistent.
