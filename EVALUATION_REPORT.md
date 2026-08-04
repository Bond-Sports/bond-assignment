# Code Evaluation Report

## Executive Summary

Niv Cohen’s `getSlots` passes all mandatory e2e checks, but the implementation duplicates the core “same resource or blocker” relevance predicate and recomputes conflicts per resource column. Transcripts show an agent-driven pipeline with no evidence the candidate understood the helpers Cursor wrote — AI ownership is scored accordingly and pulls the overall result below the pass line.

**Overall Score: 5.9/10**

---

## Assignment Compliance

### Phase 1 — Same-resource conflicts (mandatory)

| Requirement | Status |
|-------------|--------|
| `getSlots()` returns slots grouped by resource with conflicts | Complete |
| Same-resource overlaps listed as conflicts | Complete |
| Adjacent (touching) slots allowed | Complete |

### Phase 2 — Blocking dependencies (mandatory)

| Requirement | Status |
|-------------|--------|
| `getSlots()` includes blocking resource slots in each entry | Complete |
| Upstream blocker overlaps listed as conflicts | Complete |
| Blocking is one-directional | Complete |
| Resources with no own slots still get entries if they have blocking deps | Complete |
| `GET /slots` e2e tests pass | Complete |

### Phase 3 — Write-path conflicts (bonus)

| Requirement | Status |
|-------------|--------|
| Phase attempted | No |
| `addSlot()` creates slot or rejects with 409 | Not attempted |
| `updateSlot()` updates slot or rejects with 409 | Not attempted |
| Self-exclusion on update | Not attempted |
| 404 for non-existent slot | Not attempted |
| `POST` / `PUT` e2e tests pass | Not attempted |

E2E: **15 passed, 4 failed** — failures are Phase 3 only; not scored against the candidate.

---

## Detailed Evaluation

### File Structure (8/10)

Single-file change in `slots.service.ts`. Helpers are named and ordered cleanly; no scratch code. Scaffold TODOs remain on untouched Phase 3 stubs. Structure looks tidy largely because the agent factored it that way — still a clean file on inspection.

### Business Logic (7/10)

**Correct for Phases 1–2:** overlap uses `<` / `>`; blocker map is `blocked → Set<blocking>`; conflicts are one-directional; Lane 4 works.

**Efficiency / completeness issues:**
- Conflicts recomputed inside `resources.map → visibleSlots.map` — a Pool slot under Lanes 1–4 recalculates the same set repeatedly.
- No index by `resourceId`; every filter/conflict pass scans all slots.
- Today/overnight filter removed after candidate asked to “just compare ISO” — seed-only data still passes tests, but the API contract is not enforced.

Efficiency issues were not flagged by the candidate → Business Logic capped at 7.5; scored **7** given the recomputation plus missing today filter.

### DRY Compliance (4.5/10)

**Concrete duplications (must cite):**

1. **Relevance predicate duplicated** — visibility in `getSlots`:

```ts
slot.resourceId === resource.id || blockers.has(slot.resourceId)
```

and again inside `findConflicts`:

```ts
const isSameResource = other.resourceId === candidate.resourceId;
const isBlocker = blockers.has(other.resourceId);
```

Same rule, two implementations. Should be one helper (e.g. `isRelevantToResource`).

2. **Conflict computation applied repeatedly** — `findConflicts(slot, …)` called per appearance in each resource column instead of once per `slot.id` and reused.

3. **DTO mapping inconsistency** — `toSlotDto` exists, but `updateSlot` (scaffold) still returns `{ ...slot, conflicts: [] }` inline. Minor given Phase 3 skip, but shows incomplete reuse discipline.

Named helpers (`overlaps`, `buildBlockersByBlocked`) do **not** offset the duplicated relevance + recomputation. Cap: DRY ≤ 5 when relevance is duplicated → **4.5**.

### SOLID Principles (7.5/10)

`EntityManager` injected (DIP). Blocker rules come from DB rows (reasonable OCP). SRP is only middling: `getSlots` still owns fetch + visibility + conflict mapping, and the duplicated relevance logic shows the abstraction boundary was not really owned by the candidate.

### Additional Quality (7.5/10)

Decent TypeScript (`ITimeRange`, no `any`), TypeORM finds are safe. No write-path error shaping (Phase 3 not attempted). Quality is “agent-clean,” not candidate-hardened.

### AI Usage & Ownership (3/10)

Transcripts (`docs/submission/transcripts/*.jsonl`) + plan:

| Turn | What happened |
|------|----------------|
| Explore agent prompt | Candidate outsourced codebase understanding |
| Vague problem statement | Overlap + BlockingDependency mentioned; no algorithm |
| “no need for e2e or testing” | Skipped verification |
| Agent writes full plan | Helpers, getSlots, add/update 409 |
| “Implement the plan” ×2 | Blind execution |
| “change only the getSlots function” | Scope tweak after agent also did Phase 3 — not design ownership |
| “just compare ISO…” | Surface tweak that removed the today filter |

**No turn shows the candidate reviewing or explaining the finished helpers.** Session shape is classic agent pipeline: explore → plan → implement. Candidate did not catch duplicated relevance logic or per-column recomputation.

**Interviewer/reviewer assessment:** candidate did not understand the code Cursor wrote at all → AI **≤ 3** per skill override.

This is not “mixed 6–8.” Stating the problem once and shipping agent output is agent-driven without ownership.

---

## Scoring

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| File Structure | 10% | 8.0/10 | 0.80 |
| Business Logic | 25% | 7.0/10 | 1.75 |
| DRY Compliance | 15% | 4.5/10 | 0.68 |
| SOLID Principles | 15% | 7.5/10 | 1.13 |
| Additional Quality | 10% | 7.5/10 | 0.75 |
| AI Usage & Ownership | 25% | 3.0/10 | 0.75 |
| **Total** | **100%** | | **5.9/10** |

**Score caps applied:**
- AI ≤ 4 → overall capped at 6.5 (raw 5.9 already below cap).
- Business Logic efficiency ceiling 7.5 (scored 7).
- DRY ≤ 5 for duplicated relevance predicate (scored 4.5).
- Phase 3 not attempted — not deducted.

---

## Recommendations

### High Priority
1. Extract a single `isRelevantToResource(slot, resourceId, blockersByBlocked)` used by both visibility filtering and conflict finding.
2. Compute conflicts once per slot id (`Map<id, SlotDto>`), then assemble each resource column from that map.

### Medium Priority
3. Index slots by `resourceId` before filtering/conflict checks.
4. Restore today + overnight filtering for `GET /slots`.

### Low Priority
5. If doing Phase 3 later: reuse `findConflicts`, 409 body, self-exclusion, 404 mapping, transaction around check-then-save — and be able to explain each step without the agent.

---

## Conclusion

**Recommendation: FAIL**

Mandatory GET behavior works, but duplicated relevance/conflict logic and lack of ownership of the agent-written solution put the weighted score at **5.9/10**, below the 7.0 pass threshold. Clean-looking helpers from Cursor are not a substitute for understanding or DRY design.
