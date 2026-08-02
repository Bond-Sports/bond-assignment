# Code Evaluation Report

## Executive Summary

Maor Geter completed Phases 1–2 such that all mandatory GET e2e tests pass. Phase 3 was not attempted. On inspection the file still carries duplicated sort/init patterns and leaves indexing/assembly inside a large `getSlots()`, while transcripts show the candidate could not explain the Cursor-authored algorithms at all. Score reflects that: passing tests are not enough when DRY, structure, and ownership are weak.

**Overall Score: 5.1/10**

**Candidate:** Maor Geter (resume attached)

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
| `GET /slots` e2e tests pass | Complete |

### Phase 3 — Write-path conflicts (bonus)

| Requirement | Status |
|-------------|--------|
| Phase attempted | No |
| `addSlot()` creates slot or rejects with 409 | Not attempted |
| `updateSlot()` updates slot or rejects with 409 | Not attempted |
| Self-exclusion on update | Not attempted |
| 404 for non-existent slot | Not attempted |
| `POST` / `PUT` e2e tests pass | Not attempted (4 expected failures on conflict/404 paths) |

---

## Detailed Evaluation

### File Structure (6/10)

Some private methods exist (`recordSameResourceConflicts`, `recordBlockingConflicts`, `findEndInsertIndex`, `toSlotDto`), but they were introduced by the agent as part of an opaque sweep/merge design — not candidate-driven factoring of clear responsibilities.

`getSlots()` remains a catch-all: parallel fetch, two map initializations, conflict recording loops, relevant-slot assembly, sort, and DTO mapping all sit in one method. Obvious helpers (`groupSlotsByResource`, `buildBlockerIdsByResource`, `sortSlotsByStart`) were never extracted. Unused `HttpException` / `HttpStatus` imports remain.

### Business Logic (7/10)

**Correct on seed / e2e:**
- Same-resource sweep treats adjacent slots as non-conflicting (`end <= start`).
- Blocking is one-directional; Lane 4 (no own slots) still gets blocker slots.
- Conflicts keyed once by slot id and reused across columns.
- Resource-indexed access (not all-vs-all).

**Issues:**
1. **`recordBlockingConflicts` two-pointer is not generally correct** when blockers are sorted by start: a later-starting blocker that already ended can still be scanned into the conflict list. Counterexample: blockers `[10:00–10:30, 10:15–10:20]` vs blocked `10:25–10:35`. Seed → 0 false positives, so e2e passes.
2. **Today filter removed** (`manager.find(Slot)` loads everything). Diverges from “today’s slots + overnight” once data grows.
3. No named overlap predicate — correctness is buried in two algorithms.

Efficiency Business Logic cap (≤ 7.5) not applied: once-per-slot map + indexed candidates.

### DRY Compliance (4/10)

Concrete duplications in the submitted file:

| Duplication | Where |
|-------------|--------|
| `(a, b) => a.start.localeCompare(b.start) \|\| a.id - b.id` | Response assembly + same-resource sort + two blocking sorts (4×) |
| “For each resource, set map entry to `[]`” | `slotsByResourceId` and `blockerIdsByResourceId` |
| Overlap rule | Re-implemented differently in sweep vs two-pointer — no shared `overlaps(a, b)` |
| Slot field projection | Outer `toSlotDto` fields vs nested conflict object fields (same shape, two literals) |

Candidate did not pull shared sorting, map seeding, or overlap checking into helpers. The private methods that exist do not address these DRY misses; they duplicate the sort pattern themselves.

### SOLID Principles (6/10)

- **SRP:** Weak — `getSlots()` still mixes data loading, graph indexing, conflict computation orchestration, view assembly, and mapping.
- **DIP:** Fine — `EntityManager` injected.
- **OCP:** Blocking edges from DB are data-driven, but conflict detection is tightly coupled to two hard-coded algorithms with no shared overlap abstraction.

### Additional Quality (7/10)

TypeScript is fine (no `any`); ORM usage is safe. Unused Nest HTTP imports. ISO string compare is acceptable for this format. Slight ding for dead imports and for shipping algorithms the candidate could not reason about.

### AI Usage & Ownership (2/10)

Transcripts (`docs/submission/transcripts/164660c5-…jsonl`):

| Turn | Signal |
|------|--------|
| “improve getSlots… return conflicts” / “…improve n^2… and add Blocking” | Agent designed the solution |
| “REMOVE ALL RELATED TO DAYSTART…” | Light pushback only |
| “explain in hebrew all getSlots() … so i wil be able to describe it” | Strong negative — studying output for interview |
| “explain getslots steps” / explain sweep block / “why there is loop inside loop?” | Did not understand Cursor’s code |

Classification: **agent-driven; candidate cannot explain the solution.** Anchors → **2/10**.

---

## Scoring

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| File Structure | 10% | 6/10 | 0.60 |
| Business Logic | 25% | 7/10 | 1.75 |
| DRY Compliance | 15% | 4/10 | 0.60 |
| SOLID Principles | 15% | 6/10 | 0.90 |
| Additional Quality | 10% | 7/10 | 0.70 |
| AI Usage & Ownership | 25% | 2/10 | 0.50 |
| **Total** | **100%** | | **5.1/10** |

**Score caps applied:**
- AI Usage & Ownership ≤ 4 → overall would be capped at 6.5; weighted total is already **5.1**, so cap does not raise or further lower.
- Phase 3 not attempted → scored on Phases 1–2 only.

**E2E note:** Node 22. All GET `/slots` tests passed; four POST/PUT conflict/404 tests failed as expected for untouched stubs.

---

## Recommendations

### High Priority
1. Extract shared helpers: `overlaps`, `sortSlotsByStart`, `groupSlotsByResource`, `buildBlockerMap` — eliminate the 4× sort and dual map-init duplication.
2. Replace the incorrect blocking two-pointer (or add a true active-by-end structure) and unit-test nested non-overlapping blockers.
3. Do not advance without a live whiteboard of overlap + one-directional blocking with no file open — transcripts show zero ownership of the shipped algorithms.

### Medium Priority
4. Slim `getSlots()` to orchestration only; move indexing/assembly into named helpers.
5. Restore today + overnight filtering.

### Low Priority
6. Remove unused `HttpException` / `HttpStatus` imports.
7. Phase 3 remains an optional stretch.

---

## Conclusion

**Recommendation: FAIL**

Tests pass for the mandatory GET path, but the submission shows duplicated logic, under-extracted structure, a latent blocking bug, and — decisive for this bar — no real understanding of the Cursor-written code. Fail the take-home.
