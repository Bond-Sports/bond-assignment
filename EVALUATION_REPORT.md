# Code Evaluation Report

## Executive Summary

Tomer Naeim submitted a complete Phases 1–3 implementation in `server/src/slots/slots.service.ts`. The conflict model is correct, helpers are genuinely reused, and all 19 e2e tests pass. Transcripts plus the interview show he did **not** own that code: he had no answer on `O(n²)`, asked Cursor to optimize, reverted the sweep-line because he did not understand it, then asked the agent to explain the leftover helpers, why slots conflict, and every endpoint flow. Interviewer override: AI ≤ 3, overall capped at 6.5.

**Overall Score: 6.5/10**

---

## Assignment Compliance

### Phase 1 — Same-resource conflicts (mandatory)

| Requirement | Status |
|-------------|--------|
| `getSlots()` returns slots grouped by resource with conflicts | Complete |
| Same-resource overlaps listed as conflicts | Complete |
| Adjacent (touching) slots allowed | Complete |

Verified against live `GET /slots`: Lane 1 “Private Coaching - Sarah M.” (09:30–11:00) lists “Swim Lessons - Beginners” (08:30–10:00). “Lap Swim - Intermediate” starts at 11:00, adjacent to Sarah, and has `conflicts: []`.

### Phase 2 — Blocking dependencies (mandatory)

| Requirement | Status |
|-------------|--------|
| `getSlots()` includes blocking resource slots in each entry | Complete |
| Upstream blocker overlaps listed as conflicts | Complete |
| Blocking is one-directional | Complete |
| `GET /slots` e2e tests pass | Complete |

Live traces:

- Lane 1 “Early Bird Lap Swim” (06:30–08:00) lists Pool “Morning Open Swim” (06:00–08:00).
- The Pool column’s “Morning Open Swim” has `conflicts: []` (Lane 1 does not block Pool).
- The copy of “Morning Open Swim” under Lane 1 also has `conflicts: []` — conflicts are keyed by slot id, not by column.
- Lane 2 “Kids Swim Camp” lists Lane 3 “Toddler Splash Time” (Lane 2 ↔ Lane 3).
- Lane 4 has 0 own slots and 7 Pool slots.

### Phase 3 — Write-path conflicts (bonus)

| Requirement | Status |
|-------------|--------|
| Phase attempted | Yes |
| `addSlot()` creates slot or rejects with 409 | Complete |
| `updateSlot()` updates slot or rejects with 409 | Complete |
| Self-exclusion on update | Complete |
| 404 for non-existent slot | Complete |
| `POST` / `PUT` e2e tests pass | Complete |

`throwIfConflicts` raises `HttpException` with the conflict array; the global filter returns that body as 409. `findConflicts` skips `other.id === candidate.id`. Missing slot → `HttpStatus.NOT_FOUND`.

---

## Detailed Evaluation

### File Structure (9/10)

Single-file change as required. Module-level helpers (`slotsOverlap`, `relevantResourceIds`, `collectSlots`, `indexSlotsByResource`, `indexBlockersByResource`, `findConflicts`, `toConflictDto`) sit above a thin `SlotsService`. No dead code, commented-out alternatives, or leftover unit-spec from the session (those were reverted). JSDoc on helpers/methods. Interfaces use the `I` prefix (`ITimeRange`, `IConflictCandidate`, `IConflictIndexes`). Formatting is consistent.

Minor: DTO mapping is inline `{ ...slot, conflicts }` rather than a named `toSlotDto`, but the file stays readable.

### Business Logic (7.5/10)

**Correctness (strong):**

```34:36:server/src/slots/slots.service.ts
function slotsOverlap(a: ITimeRange, b: ITimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}
```

Blocker index is `blockedResourceId → blockingResourceId[]` (`indexBlockersByResource`). Candidates for a slot are own resource + upstream blockers only (`relevantResourceIds`). Pool never receives Lane slots; Lane conflicts never appear on Pool slots.

Conflicts are computed **once per slot id** before the per-resource map:

```136:155:server/src/slots/slots.service.ts
    const conflictsBySlotId = new Map<number, SlotDto[]>();
    for (const slot of slots) {
      conflictsBySlotId.set(
        slot.id,
        findConflicts(slot, slotsByResource, blockersByResource),
      );
    }

    return resources.map((resource) => {
      const groupedSlots = collectSlots(
        relevantResourceIds(resource.id, blockersByResource),
        slotsByResource,
      );

      return {
        resourceId: resource.id,
        slots: groupedSlots.map((slot) => ({
          ...slot,
          conflicts: conflictsBySlotId.get(slot.id) ?? [],
        })),
      };
    });
```

Slots are indexed by `resourceId`; `findConflicts` only walks own + blocker buckets — not all-vs-all.

**Gaps (efficiency cap applied):**

- **Full-table load:** `this.manager.find(Slot)` with no today/overnight predicate. Spec: “Returns today's slots… Overnight slots (started yesterday, ending today) are included.” Seed-only data makes tests pass; historical rows would leak into the calendar.
- **No transaction** around Phase 3 check-then-save. Two concurrent `addSlot`s can both see an empty conflict set and both save.
- **No `start < end` validation** on create/update.

The indexes that remain in the file were introduced by Cursor during that optimization pass; the candidate did not design them. They also did **not** flag the full-table load. Per the scoring cap, Business Logic cannot exceed **7.5**. The `O(n²)` discussion is scored under AI ownership, not here — the shipped conflict rules are still correct.

### DRY Compliance (8/10)

The usual failure modes are **absent**.

Relevance is one helper, used for both column visibility and conflict candidates:

```54:59:server/src/slots/slots.service.ts
function relevantResourceIds(
  resourceId: number,
  blockersByResource: Map<number, number[]>,
): number[] {
  return [resourceId, ...(blockersByResource.get(resourceId) ?? [])];
}
```

Call site 1 — `findConflicts`:

```111:114:server/src/slots/slots.service.ts
  const candidates = collectSlots(
    relevantResourceIds(candidate.resourceId, blockersByResource),
    slotsByResource,
  );
```

Call site 2 — `getSlots` grouping:

```145:148:server/src/slots/slots.service.ts
      const groupedSlots = collectSlots(
        relevantResourceIds(resource.id, blockersByResource),
        slotsByResource,
      );
```

`loadConflictIndexes` + `findConflicts` + `throwIfConflicts` are shared across `getSlots` / `addSlot` / `updateSlot`. No parallel SQL write-path. No per-column recomputation.

Remaining duplication: success responses use `{ ...saved, conflicts: [] }` / `{ ...slot, conflicts: [] }` instead of `toConflictDto` / a `toSlotDto`. Named helpers exist; this is not the “duplicated `blockers.has`” failure. Score 8 (8+ is warranted; not 9 because of the mapper split).

### SOLID Principles (8/10)

| Principle | Assessment |
|-----------|------------|
| **SRP** | Fetch/index vs overlap vs HTTP mapping are split into helpers. Service methods stay short. `HttpException` from the service is Nest-typical, slightly mixes transport with domain. |
| **DIP** | `EntityManager` is constructor-injected. No direct `DataSource` / DB module import in the service. |
| **OCP** | New blocking edges are data (`BlockingDependency` rows). `relevantResourceIds` / `findConflicts` do not hard-code Pool/Lane ids. |

Controller stays a pass-through. No new resource types would require rewriting the conflict kernel.

### Additional Quality (8/10)

- No `any`, no `@ts-ignore`. Small typed interfaces for the conflict kernel.
- TypeORM `find` / `save` / `findOne` — no string-concatenated SQL.
- 409 body is the conflict array (via `HttpException` + existing filter). 404 message is a named constant.
- Nested conflicts omit a nested `conflicts` array (`toConflictDto`).
- Spreading the TypeORM entity into the DTO can leak extra enumerable fields; unused here because relations are not loaded.

Phase 3 input/`start < end` and transactions are scored under Business Logic, not here.

### AI Usage & Ownership (3/10)

Transcripts reviewed: `docs/submission/transcripts/f3461b54-*.jsonl` (main implementation), plus sqlite rebuild / submit chats.

**Interviewer override (≤ 3):** In discussion of `O(n²)` the candidate had no answer and was asked to think about it. He then used Cursor to “make it better,” did not understand Cursor’s solution, and reverted it. That is “could not explain the code Cursor wrote.”

The transcript matches that interview beat-for-beat — he did **not** own the algorithm; he let Cursor implement it and then tried to understand (or undo) the result.

**Performance episode (not independent design):**

1. After the interviewer prompt, not before: *“lets think about the complexty of this segmant @slots.service.ts (82-97) can we make it more efficent?”*
2. Cursor diagnosed `O(r · n + n²)`, added maps **and** a sweep-line (`O(c log c + overlaps)`).
3. Candidate: *“it too complex i think no?”* — revert. Cursor kept the maps and restored a nested overlap loop. This was not a reasoned “sweep-line is overkill for tens of slots”; he did not understand the change.
4. Immediately after the revert: *“explain to me the full flow”* on the **remaining** `slots.service.ts` (54–85) — indexes, blocker map, candidate set, overlap filter. He still needed the simpler leftover explained.
5. Then: *“explain why this are with conflict”* (calendar warnings), then at the end *“explain to me all the differrnt endpoints flows.”*

**He scoped work to the agent; he did not design it.**

- Opening prompt (polished English vs later turns — likely another model) asked for a plan, then “implement.”
- Reverts were “you made a mess” / “too complex,” not design corrections with an alternative.
- Phase 2/3 prompts are requirement restatements: “BlockingDependency table,” “morning open swim should apper,” “block the update when conflict,” “do not reapit the same code.” Cursor chose the helpers.
- “fix the test's where the conflict exsisting” = change tests to match code, then revert.

**Classification:** agent-driven. Candidate could not walk `findConflicts` / complexity / the sweep-line, and needed the shipped solution explained. Score **3**. Hard ceiling for a pure plan→implement pipeline would be ≤ 4; the interviewer override is **≤ 3**.

---

## Scoring

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| File Structure | 10% | 9/10 | 0.90 |
| Business Logic | 25% | 7.5/10 | 1.88 |
| DRY Compliance | 15% | 8/10 | 1.20 |
| SOLID Principles | 15% | 8/10 | 1.20 |
| Additional Quality | 10% | 8/10 | 0.80 |
| AI Usage & Ownership | 25% | 3/10 | 0.75 |
| Uncapped total | 100% | | 6.73 |
| **Total (after cap)** | **100%** | | **6.5/10** |

**Caps applied:**

- Business Logic capped at **7.5** — full-table slot load; candidate did not flag it.
- **AI ≤ 3** (interviewer: could not explain Cursor’s code) → overall **capped at 6.5**.
- DRY cap of 5 does **not** apply — relevance + conflict computation are each defined once (by the agent).

E2e on this machine: `19 passed, 19 total` under Node 22 after rebuilding `better-sqlite3`. Failures under Node 24 were a native-addon ABI mismatch, not assignment logic.

---

## Recommendations

### High Priority

1. Filter `GET /slots` to today plus overnight (`end` today / `start` yesterday). Do not `find()` the entire `Slots` table.
2. Wrap Phase 3 conflict check + save in a transaction (and consider a unique overlap constraint or `SELECT … FOR UPDATE` equivalent for SQLite).
3. Do not treat a Cursor revert as an architecture decision. If he cannot explain maps vs sweep-line vs nested overlap, he does not own the performance work.

### Medium Priority

4. Reject `start >= end` on create/update (DTO validator or service guard).
5. Map through a single `toSlotDto` instead of spreading entities / `{ ...saved, conflicts: [] }`.

### Low Priority

6. Targeted queries (slots for own + blocker resource ids only) would beat loading every slot then grouping in memory.

---

## Conclusion

**Recommendation: FAIL**

The code is green and well factored because Cursor wrote it. The candidate did not have an `O(n²)` answer, outsourced the fix, reverted what he did not understand, and then asked the agent to explain the remaining flow, the conflicts, and the endpoints. Interviewer override (AI ≤ 3) caps the overall at **6.5**, below the 7.0 pass line. Strong signal that he cannot maintain this without the agent in the loop.
