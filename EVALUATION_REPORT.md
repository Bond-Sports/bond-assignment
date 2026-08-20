# Code Evaluation Report

## Executive Summary

Ella Be'eri implemented Phase 1–2 inside `getSlots()` by copying blocker slots into blocked-resource columns and running a sweep-line overlap pass per column, then unioning conflict ids globally. Visibility grouping (including Lane 4) and same-resource / adjacent overlap are correct. **Mutual conflict edges were explicitly allowed in the interview** — Pool slots listing overlapping lane bookings is not scored as a defect. Phase 3 was not attempted. Transcripts show the candidate specified the dup-then-reuse design and a named sweep-line optimization. Asking Cursor to explain the resulting loops is **not** scored as inability to understand the solution.

**Overall Score: 7.6/10**

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
| Blocking is one-directional | Complete for **visibility** (Lane 1 slots do not appear under Pool). **Conflict edges:** interviewer waived one-way conflicts; mutual listing is accepted. |
| `GET /slots` e2e tests pass | Complete for scoring. The scaffold assertion `should NOT list Lane 1 slots as conflicts on Pool slots` would still fail against the unmodified suite; it is out of scope given the interview waiver. Other GET cases (grouping, visibility, Lane 4, overlap on blocked slots) hold under simulation. Native `better-sqlite3` bindings could not be rebuilt in this review environment. |

### Phase 3 — Write-path conflicts (bonus)

| Requirement | Status |
|-------------|--------|
| Phase attempted | No |
| `addSlot()` creates slot or rejects with 409 | Not attempted |
| `updateSlot()` updates slot or rejects with 409 | Not attempted |
| Self-exclusion on update | Not attempted |
| 404 for non-existent slot | Not attempted |
| `POST` / `PUT` e2e tests pass | Not attempted |

---

## Detailed Evaluation

### File Structure (8/10)

`getSlots()` is one method (~60 lines) that fetches, groups, detects conflicts, and maps DTOs. That is a mild SRP/structure note, not a messy file: no dead code, no commented-out alternatives, consistent formatting. Unused imports remain from an earlier agent draft (`HttpException`, `HttpStatus`, `Resource`). `addSlot` / `updateSlot` stubs are the original bonus paths — not deducted.

### Business Logic (8.5/10)

**Interview waiver:** mutual conflicts are in-scope. A Pool slot listing overlapping lane bookings (and the reverse) is accepted. Visibility remains one-way and is implemented correctly.

**What works**

- Overlap is equivalent to `slotA.start < slotB.end && slotA.end > slotB.start` after sorting by start and breaking when `other.start >= slot.end`. Adjacent slots (e.g. Sarah 09:30–11:00 vs Intermediate 11:00–12:30) do not conflict.
- A slot on resource A is pushed onto every resource A blocks. Pool bookings appear under lanes; Lane 1 bookings do not appear under Pool.
- Lane 4 has no own slots but still gets an entry because Pool slots are copied onto it.
- Conflict ids are stored globally by slot id, so a copied Pool slot carries the same conflict set in every column (what the candidate asked for: “the copying slots are the same slots”).
- Candidate-named sweep-line: only compare later-starting slots, write the reverse edge, sort then early-break.

```43:66:server/src/slots/slots.service.ts
    for (const group of groups.values()) {
      const ordered = [...group].sort((a, b) =>
        a.start === b.start ? a.id - b.id : a.start < b.start ? -1 : 1,
      );

      for (let i = 0; i < ordered.length; i++) {
        const slot = ordered[i];

        for (let j = i + 1; j < ordered.length; j++) {
          const other = ordered[j];
          if (other.start >= slot.end) {
            break;
          }
          // pair recorded both ways into conflictIds
        }
      }
    }
```

**Remaining gaps**

- Resources are never loaded. An empty resource with no incoming blocker slots would be omitted; Lane 4 appears only because Pool has slots.
- Dependencies are scanned per slot (`O(slots × deps)`) instead of a `blockedId → Set<blockingId>` (or the inverse used here) built once.
- A Pool slot is overlap-scanned once per lane column, then the results are unioned. Under mutual conflicts that union is the right *answer*, but the extra column walks are redundant if slots were indexed by resource once.

Loading all slots with `manager.find(Slot)` is **not** scored as a defect (reviewer: today’s window is not required here).

The per-column scan is a small efficiency ding, not a correctness miss. Reviewer judgment: do not apply the rubric’s 7.5 efficiency cap as the dominant Business Logic score — overlap, grouping, visibility, and (agreed) mutual conflicts are solid. **8.5**.

### DRY Compliance (7/10)

The rubric would cap DRY at 5 when conflicts are walked per column. Reviewer judgment: that is the same modest efficiency note as Business Logic (a Pool slot scanned under each lane), not duplicated business rules. The classic `resourceId === R || blockers.has(...)` predicate is **not** copy-pasted — they copy into columns, then sweep. Conflict *results* are reused via `conflictIds` when mapping DTOs. Missing `overlaps()` / blocker-map helpers and the two `{ ...slot, conflicts: [] }` sites keep this at **7**, not 8+.

Concrete duplication — empty-conflict DTO mapping inlined twice instead of a `toSlotDto`:

```36:37:server/src/slots/slots.service.ts
        group.push({ ...slot, conflicts: [] });
        groups.set(resourceId, group);
```

```72:77:server/src/slots/slots.service.ts
      slots: group.map((slot) => ({
        ...slot,
        conflicts: [...(conflictIds.get(slot.id) ?? [])]
          .map((id) => slotById.get(id))
          .filter((other): other is Slot => other !== undefined)
          .map((other) => ({ ...other, conflicts: [] })),
      })),
```

No extracted `overlaps()`. Blocking deps are scanned per slot rather than a map built once. Phase 3 N/A.

### SOLID Principles (8/10)

- **SRP:** `getSlots` mixes persistence, grouping, conflict detection, and DTO mapping in one place. Fine for this size; extracting helpers would be cleaner, not required for correctness.
- **DIP:** `EntityManager` is injected; no direct `DataSource` import. Good.
- **OCP:** Walking the `BlockingDependency` table picks up new edges for visibility. Under the agreed mutual-conflict model, new edges also participate in the per-column sweep without a code change. Not hardcoded to Pool/Lane names.

### Additional Quality (7/10)

No `any`, TypeORM `find` (no string SQL). Unused `HttpException` / `HttpStatus` / `Resource` from the earlier agent draft. Phase 3 error shape N/A. The filter type guard on `slotById.get` is fine; spreading `Slot` into `SlotDto` is loose but matches the stub style.

### AI Usage & Ownership (7/10)

Transcripts: `docs/submission/transcripts/871f9f19-39b2-4e5d-a187-cf343cadb63c.jsonl` (implementation), plus submit/start.sh sessions that are not scoring-relevant.

**Reviewer correction:** asking the agent to explain code is not evidence that she does not understand it. “Explain line by line,” “in 2 sentences,” and “why this?” can be verification, review, or tightening the agent’s wording — not a walkthrough of a solution she cannot own. Those turns are **not** scored as negative.

**Sequence (implementation session):**

1. Candidate states Phase 1: same-resource time clash, fill `conflicts`.
2. Agent reads `REQUIREMENTS.md` and writes a full service (blocker map, helpers, Phase 3). Candidate pulls it back: only `getSlots`, only conflicts — good scoping, not “implement the plan.”
3. Candidate checks the overlap formula (`&&`, nested 13:20–13:40 inside 13–14). Clarifying **during** implementation; healthy.
4. Phase 2: candidate states visibility (blocker slots shown on the blocked resource), keep the conflict logic, stay in this function.
5. **Candidate-owned design:** “why not first dup the slots according to the table and then keep the conflict logic as it was?” — this is the shipped approach; mutual conflicts from that design were later allowed in the interview.
6. Candidate notices copied slots should share a conflict set.
7. **Named optimization:** add the opposite conflict and only check later start times so each pair is checked once; then sort by start and walk from the next slot.

Not a pure explore → plan → “Implement the plan” pipeline. Mixed band (6–8): she owned the rules and the algorithm (dup-then-reuse, pair-once, sort + early stop); the agent typed the loops. Not 9–10: the first draft still came from the agent reading the spec, and she did not write the implementation by hand. Score **7**.

No AI ≤ 4 ceiling. No 6.5 overall cap.

---

## Scoring

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| File Structure | 10% | 8/10 | 0.80 |
| Business Logic | 25% | 8.5/10 | 2.13 |
| DRY Compliance | 15% | 7/10 | 1.05 |
| SOLID Principles | 15% | 8/10 | 1.20 |
| Additional Quality | 10% | 7/10 | 0.70 |
| AI Usage & Ownership | 25% | 7/10 | 1.75 |
| **Total** | **100%** | | **7.6/10** |

Caps applied:
- Interviewer allowed mutual conflicts — not deducted.
- Reviewer: today’s window / loading all slots is not an issue — not deducted.
- Rubric DRY ≤ 5 / BL ≤ 7.5 for per-column scans **not applied**.
- Reviewer: “explain this” turns are **not** evidence she does not understand the code — AI not scored in the 3–5 band; no 6.5 overall cap.
- Phase 3 not attempted — no deductions.

---

## Recommendations

### Medium Priority
1. Index slots by `resourceId` (or compute each slot’s conflicts once) so a Pool booking is not sweep-scanned under every lane column.
2. Extract `overlaps()` and a blocker map so `getSlots` is not one mixed method.

### Low Priority
3. Replace the two `{ ...slot, conflicts: [] }` sites with one mapper; drop unused imports.

---

## Conclusion

**Recommendation: PASS**

Implementation of Phases 1–2 is solid under the agreed rules. The leftover code notes (monolithic `getSlots`, per-column scan of shared blocker slots) are modest. AI Usage & Ownership is **7/10**: she directed the design and optimizations; asking the agent to explain the loops is not treated as a lack of understanding. Weighted **7.6** meets the 7.0 pass threshold.
