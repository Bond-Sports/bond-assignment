---
name: smoke-scenario-first-message
overview: Replace the orchestrator-authored multi-turn smoke payload with a lean scenario-driven shape (scenario ≤24 words + first_message), and move user-message generation for turns 2..N into smoke.js so the runner itself drives a realistic multi-turn conversation, mirroring the evaluations repo's user-sim concept without its weight.
todos:
  - id: smoke_js
    content: "Rewrite smoke.js: load payload.json arg, validate scenario (≤24 words) + first_message, run seeded turn, then user-sim loop via Anthropic API until ###STOP###/escalation/MAX_TURNS=7; preserve existing stdout JSON and NDJSON progress contracts."
    status: pending
  - id: run_batch
    content: Update run-batch.js to spawn `node smoke.js <payload.json>` and carry scenario/role/first_message/expected into the summary file.
    status: pending
  - id: skill_md
    content: "Update validate-and-push/SKILL.md step 4: new payload shape, scenario-level grading rules, mention auto user-sim so the orchestrator no longer authors turn arrays."
    status: pending
  - id: evaluate_md
    content: Update EVALUATE.md post-push-smoke-test section to describe the scenario + first_message contract and in-runner user-sim.
    status: pending
isProject: false
---

## Background (from research)

The evaluations repo at `/Users/bugo/Documents/Developer/aui/evaluations/src/runner.ts` generates user messages auto by:

- Each `Test` has `guidelines` (persona behavior) + `userInfo` (profile) + `turns[]` where any turn's `user` can be the string `"auto"`.
- When a turn is `"auto"`, the runner calls `adapter.generateUserMessage(userSimPrompt(...))` — the prompt is built from the user profile, guidelines, and the full conversation so far.
- The simulated user can emit `###STOP###` on its own line to end the conversation.
- If fewer than `MIN_TURNS = 7` are authored, the runner pads with `{ user: "auto" }` entries.
- Judge and user-sim call the same `AgentAdapter` interface, so the same LLM can do both.

Our current smoke flow ([validate-and-push/SKILL.md](sandbox-templates/agent-builder-smoke-test/.opencode/skills/validate-and-push/SKILL.md) step 4) requires the orchestrator LLM to author every `turn.text` literal up-front. [run-batch.js](sandbox-templates/agent-builder-smoke-test/.opencode/skills/aui-evals/scripts/run-batch.js) passes those literals as positional args to [smoke.js](sandbox-templates/agent-builder-smoke-test/.opencode/skills/aui-evals/scripts/smoke.js), which only POSTs them. No LLM-in-the-loop. That is the "generating only the first user questions" problem — the orchestrator can only plan ahead, it cannot react to the agent.

`ANTHROPIC_API_KEY` is already propagated into the E2B sandbox as an env var by [session-manager.ts](src/lib/session-manager.ts#L172), so `smoke.js` can call Anthropic in-process. No new plumbing.

## New payload contract

One scenario = one payload file. Replace the `turns[]` array with a scenario descriptor plus a single seed turn.

```json
{
  "run_id": "<RUN_ID>",
  "scenario_id": "<kebab-case slug>",
  "scenario": "<free-form, \u2264 24 words, describes persona + goal + any constraints>",
  "role": "POSITIVE | NEGATIVE | SETUP",
  "first_message": "<the literal first user message>",
  "expected": "<one short sentence \u2014 grading key for the orchestrator>",
  "agent_folder": "agents/<folder>",
  "summary_file": "/home/user/project/.eval-runs/<RUN_ID>/<scenario_id>.json"
}
```

Rationale for 24-word cap: forces the scenario to be a persona/goal sentence (good user-sim prompt input), not a full turn-by-turn script. Enforced in smoke.js.

## Summary file shape (unchanged envelope, richer turns)

The per-scenario summary file stays orchestrator-graded. The `turns[]` array now contains the real dialogue (seed + auto-generated) plus agent replies:

```json
{
  "run_id": "...", "scenario_id": "...", "scenario": "...", "role": "POSITIVE",
  "first_message": "...", "expected": "...", "agent_id": "...", "task_id": "...",
  "playground_url": "...",
  "execution_status": "OK | SKIPPED | ERROR",
  "execution_reason": "<string or null>",
  "turns": [
    { "index": 0, "source": "seed",      "user": "...", "status": 200, "reply": "...", "escalated": false, "executed_workflows": [...] },
    { "index": 1, "source": "auto",      "user": "<user-sim generated>", "status": 200, "reply": "...", "escalated": false, "executed_workflows": [...] },
    { "index": 2, "source": "auto_stop", "user": "###STOP###", "status": null, "reply": null, "escalated": false, "executed_workflows": [] }
  ]
}
```

Grading in step 4e of the SKILL continues to work: check transport on each turn, then grade the transcript as a whole against `expected` (one scenario-level key instead of per-turn keys). The role is scenario-level too.

## File-by-file changes

- [sandbox-templates/agent-builder-smoke-test/.opencode/skills/aui-evals/scripts/smoke.js](sandbox-templates/agent-builder-smoke-test/.opencode/skills/aui-evals/scripts/smoke.js)
  - New arg contract: `node smoke.js <payload.json>`. Drop the positional-turns interface.
  - Load payload, validate shape (scenario \u2264 24 words, first_message non-empty, role in allowed set). On invalid payload: `SKIPPED` with factual reason.
  - Keep the existing `create task \u2192 POST /message` plumbing for each user turn.
  - User-sim loop (turns 2..MAX_TURNS):
    1. Build prompt from `scenario` + full conversation history (`USER: ...\n\nAGENT: ...`) \u2014 same shape as `userSimPrompt` in evaluations repo, with `scenario` filling the role of `guidelines` and no `userInfo`.
    2. Call Anthropic `messages` endpoint with `process.env.ANTHROPIC_API_KEY`, model from `process.env.EVAL_LLM_MODEL` (fallback `claude-haiku-4-5-20251001`, matching [env.ts](src/lib/env.ts#L49)). Timeout 15s.
    3. Strip any leading `USER:` / `AGENT:` echo (same cleanup as evaluations runner).
    4. If the sim returns `###STOP###` on its own line, record a synthetic `auto_stop` turn and break.
    5. Otherwise send it to the agent via the existing `/message` call and append both user + agent turns to the transcript.
  - Constants: `MAX_TURNS = 7` (cap, no hard minimum). Stop early on `###STOP###`, agent escalation (`CONVERSATION_FORWARDING*`), transport error, or hitting the cap.
  - Missing `ANTHROPIC_API_KEY` in the sandbox = `SKIPPED` with reason `user-sim disabled: ANTHROPIC_API_KEY not set` (fail-closed, same as missing sandbox metadata).
- [sandbox-templates/agent-builder-smoke-test/.opencode/skills/aui-evals/scripts/run-batch.js](sandbox-templates/agent-builder-smoke-test/.opencode/skills/aui-evals/scripts/run-batch.js)
  - Spawn smoke.js with `[SMOKE_SCRIPT, payloadPath]` instead of `[SMOKE_SCRIPT, ...turnTexts]`.
  - `buildSummary`: carry `scenario`, `role`, `first_message`, `expected` from the payload through to the summary file (replaces today's `scenario_goal` + per-turn `role`/`expected`).
  - Error-path `writeErrorSummary`: same fields, empty `turns`.
- [sandbox-templates/agent-builder-smoke-test/.opencode/skills/validate-and-push/SKILL.md](sandbox-templates/agent-builder-smoke-test/.opencode/skills/validate-and-push/SKILL.md)
  - Step 4a: scenario matrix entries become `{ scenario_id, scenario (\u2264 24 words), role, first_message, expected }`. Drop the per-turn array and the 8-turn cap language; add "the runner auto-generates follow-up user messages via a user simulator" line.
  - Step 4b: payload JSON block updated to the new shape above.
  - Step 4e grading rules: scenario-level instead of per-turn. A scenario FAILs if any agent turn returns non-200, if any `reply` is empty, if `role !== "NEGATIVE"` and any turn escalates, if the full transcript contradicts `expected` for POSITIVE, or if the transcript does not enforce `expected` for NEGATIVE. Keep "ambiguous = FAIL". The two-sided rule, shard rules, and aggregate rules (4f/4g) are unchanged.
- [sandbox-templates/agent-builder-smoke-test/EVALUATE.md](sandbox-templates/agent-builder-smoke-test/EVALUATE.md)
  - Update the "post-push smoke test" architecture section to describe the new payload + user-sim loop. Nothing else in this file changes.

## What this deliberately does NOT change

- `test_questions.json` schema and [src/lib/test-runner.ts](src/lib/test-runner.ts) \u2014 separate system, still single-turn today; not touched in this plan.
- Smoke grading owner: still the orchestrator, not an in-process LLM judge.
- The single-batch-invocation contract, parallelism, and run directory layout.
- Sandbox template build (no new dependencies \u2014 we use native `fetch` against the Anthropic API, same as [src/lib/test-runner.ts](src/lib/test-runner.ts#L120)).

## Open item to confirm before implementation

If you actually wanted `test_questions.json` (the per-agent file driven by VOA/v3 prompts, consumed by `POST /api/sessions/:id/evaluate`) updated to the same shape, say so \u2014 it's a parallel, smaller change (schema JSON + `TestQuestion` type + `runTests`), done the same way. Not included here.
