# Code Evaluation Report

## Executive Summary

The candidate implemented `getSlots()` only (Phase 3 stubs left as-is). Same-resource overlap, blocker-slot inclusion, Lane 4’s empty-resource entry, and two-way conflict highlighting all work. The real defect is that conflict is computed per column, so the same slot can show a conflict icon in one resource and not in another. Transcripts show an agent-driven session that ends with the candidate asking the agent to explain the shipped method, including why `.map` has nested `return`s.

**Overall Score: 5.0/10**

---

## Assignment Compliance

### Phase 1 — Same-resource conflicts (mandatory)

| Requirement | Status |
|-------------|--------|
| `getSlots()` returns slots grouped by resource with conflicts | Complete |
| Same-resource overlaps listed as conflicts | Complete |
| Adjacent (touching) slots allowed | Complete |

Verified: Lane 1 `Private Coaching - Sarah M.` (09:30–11:00) conflicts with `Swim Lessons - Beginners` (08:30–10:00). `Lap Swim - Intermediate` starts at 11:00 and is not listed as a conflict (strict `<` / `>`).

### Phase 2 — Blocking dependencies (mandatory)

| Requirement | Status |
|-------------|--------|
| `getSlots()` includes blocking resource slots in each entry | Complete |
| Upstream blocker overlaps listed as conflicts | Complete |
| Blocking is one-directional | Accepted as two-directional |
| `GET /slots` e2e tests pass | 10/11; the failing test is the scaffold one-directional assertion (not counted) |

Lane 1 includes Pool slots; Lane 2 includes Pool + Lane 3; Lane 4 (no own slots) includes Pool. Lane 1’s `Early Bird Lap Swim` lists `Morning Open Swim` (Pool). Pool’s own `Aqua Aerobics Class` lists overlapping lane slots. Two-way conflict is accepted.

**Actual defect (not covered by e2e):** the same slot id does not carry a stable conflict sign. Live data: `Aqua Aerobics Class` has conflicts on Pool and on Lane 1, and `conflicts: []` on Lane 4 (no icon). Calendar confirmed: Pool/Lane 1 show the warning; Lane 4’s copy of the same booking does not.

Cause: `buildConflicts` takes `groupResourceId`, and the downstream loop only runs when `slot.resourceId === resourceId`. Conflict is a function of the column, not of the slot.

### Phase 3 — Write-path conflicts (bonus)

| Requirement | Status |
|-------------|--------|
| Phase attempted | No |
| `addSlot()` creates slot or rejects with 409 | Not attempted |
| `updateSlot()` updates slot or rejects with 409 | Not attempted |
| Self-exclusion on update | Not attempted |
| 404 for non-existent slot | Not attempted (`findOneOrFail` → 500) |
| `POST` / `PUT` e2e tests pass | Not attempted (4 expected failures; not counted against the candidate) |

---

## Detailed Evaluation

### File Structure (6/10)

`slots.service.ts` is the only candidate file. `buildConflicts` is extracted; `Promise.all` loads slots and dependencies; `slotsByResource` / blocker maps are built before the response loop. No commented-out alternatives.

Issues: `getSlots` still owns indexing, two blocker maps, visibility assembly, `buildConflicts`, and a second downstream loop. Unused imports (`HttpException`, `HttpStatus`, `Resource`) — none of these were in the original stub. Scaffold `TODO`s in `addSlot` / `updateSlot` are acceptable because Phase 3 was skipped.

### Business Logic (6/10)

**What is correct**

- Overlap: `other.start < slot.end && other.end > slot.start` in `buildConflicts`.
- `blockingIdsByResource`: blocked resource → Set of blocking resource ids.
- Own slots + blockers (and, two-way, blocked resources) can appear as conflicts. Two-directional highlighting is accepted.
- Visibility: column slots = own + blockers. Lane 4 appears via `blockingIdsByResource.keys()`.
- Index by `resourceId` (not a full all-vs-all scan of every slot against every other slot).

**What is wrong**

A slot is one booking. Its conflict sign must be the same everywhere it is rendered. This code computes conflicts inside the per-resource loop and keys the candidate set on the column:

```73:79:server/src/slots/slots.service.ts
          const conflicts = this.buildConflicts(
            slot,
            resourceId,
            slotsByResource,
            blockingIdsByResource,
          );
```

```175:177:server/src/slots/slots.service.ts
    if (groupBlockingIds.has(slot.resourceId)) {
      addCandidates(slotsByResource.get(groupResourceId) ?? []);
    }
```

On Lane 1, a Pool slot picks up that lane’s overlapping bookings. On Lane 4, the group has no own slots, so the same Pool slot gets an empty list.

A second path only runs on the slot’s **home** column:

```81:81:server/src/slots/slots.service.ts
          if (slot.resourceId === resourceId) {
```

So the original Pool row and the copies on other columns are not even using the same rule. Result: `Aqua Aerobics Class` conflicts on Pool and Lane 1, not on Lane 4.

**Efficiency (cap applies):** conflicts recomputed per column; full `manager.find(Slot)` with no today filter. Candidate never flagged it. Skill cap: Business Logic cannot exceed 7.5; scored 6 because the column-keyed candidate set is also a correctness bug (inconsistent sign), not only wasted work.

No in-memory cache. Phase 3 not scored.

### DRY Compliance (4/10)

Named `buildConflicts` is not enough. Skill: score ≤ 5 if relevance is duplicated **or** conflicts are recomputed per column with no reuse.

**1. Per-column recomputation (and inconsistent sign)** — `buildConflicts(...)` is called inside `relevantSlots.map` for every resource group, with `groupResourceId` as an argument. There is no `Map<slotId, SlotDto[]>` computed once and reused. That is why the same slot can have a different `conflicts` array (and icon) on Lane 4 vs Pool.

**2. Duplicated “same resource or blockers” assembly**

Visibility (column R):

```64:69:server/src/slots/slots.service.ts
      const relevantSlots = [
        ...(slotsByResource.get(resourceId) ?? []),
        ...[...blockingIds].flatMap(
          (blockingId) => slotsByResource.get(blockingId) ?? [],
        ),
      ];
```

Conflict candidates (slot S):

```171:174:server/src/slots/slots.service.ts
    addCandidates(slotsByResource.get(slot.resourceId) ?? []);
    for (const blockingId of slotBlockingIds) {
      addCandidates(slotsByResource.get(blockingId) ?? []);
    }
```

No shared helper. The third branch (`groupBlockingIds.has(slot.resourceId)`) is column-specific and is what splits the same slot’s conflict list.

**3. Overlap inlined twice** — not extracted to `slotsOverlap`:

- `buildConflicts`: `other.start < slot.end && other.end > slot.start`
- downstream skip: `other.start >= slot.end || other.end <= slot.start`

**4. DTO mapping inlined three times** — `buildConflicts` `.map`, the downstream `conflicts.push({ id, name, start, end, resourceId })`, and `return { ...slot, conflicts }` (entity spread). `updateSlot` also returns `{ ...slot, conflicts: [] }` (scaffold; Phase 3 not scored).

DRY capped at 5 by the per-column rule; 4 reflects the extra home-column loop and missing overlap helper.

### SOLID Principles (6/10)

- **SRP:** Controller stays thin. `getSlots` still mixes fetch, indexing, visibility, two conflict strategies, and DTO assembly. `buildConflicts` is a start; the home-column loop was bolted on afterward.
- **DIP:** `EntityManager` is injected. No direct `DataSource` import. Unused `Resource` import is leftover, not a DIP break.
- **OCP:** Blocker maps would absorb new dependency rows. Passing `groupResourceId` into conflict detection couples “who this slot conflicts with” to “which column we are painting,” which does not extend cleanly.

### Additional Quality (6/10)

No `any`, no raw SQL. TypeORM `find` is parameterized. Nested conflict objects omit `conflicts` (avoids recursive JSON).

Deductions: unused imports; `{ ...slot, conflicts }` can leak entity fields (the agent suggested an explicit mapper; the candidate did not take it). No `start < end` validation (Phase 3 only). Phase 3 error shapes not scored.

### AI Usage & Ownership (3/10)

Transcripts reviewed in order: `docs/submission/transcripts/b3695cf8-...jsonl` (implementation) and `d4be0043-...jsonl` (run client/server + overlapping prompts). Two `/submit-and-clean-assignment` files are submission-only.

**Sequence (implementation chat):**

1. “change only `getSlots` — return all slots, add overlapped times to conflicts” — wrong/incomplete spec; agent still read REQUIREMENTS.md.
2. “how can you improve this method?” — vague. Agent named scoped conflicts, blocker grouping, `Map`, `slotsOverlap`, DTO mapper.
3. “now every resource is a conflict, why?” — candidate did not see that their first prompt was global time-only.
4. “fix the bug” / “fix it” — agent implemented Phase 2 (one-way blockers). Candidate did not specify the algorithm.
5. “rollback” — no named simpler design; agent restored global overlap.
6. “only slots of same resourceId and overlapping time” — Phase 1, after the agent had already implemented it.
7. “how can you improve” again → agent proposed grouping with a `Map` → “implement only first one”. Candidate did not name the technique.
8. “fetch all blocking-dependencies and print here” — exploration, not a design.
9. Quoted REQUIREMENTS: “if there is any resource that **blocks** the slot’s resource (upstream blockers), add it as a conflict.”
10. Repeated “add also the blocking as a conflict” / “if the blocking makes a conflict, add its slot” — mixing `slots` vs `conflicts`.
11. “add the blocking icon also to Pool’s original slot” — wanted the same conflict visible on Pool (two-way, acceptable). The agent keyed conflict candidates on `groupResourceId`, so copies of that Pool slot still get a different list per column. Candidate did not catch that the sign was not a property of the slot.
12. **Post-ship:** “explain me the method” → “explain me the method what did you change” → “why 2 returns?”

**Classification:** agent-driven. Candidate scoped (“change only getSlots”), restated the spec in places, and chose to apply the agent’s first improvement (the `Map`). They did not own `buildConflicts` or that conflicts must be computed once per slot id. They asked the agent to explain the finished helpers/flow, including why there are two `return`s.

**Score anchors applied:**

- Multiple post-implementation “explain this” turns → **3–4, not 5**.
- Vague “how can you improve” without a named technique is **not** candidate-owned (agent chose the `Map`).
- “rollback” with no stated alternative is not taste.
- Hard ceiling: needed the shipped method explained → AI **≤ 3**.

AI **3/10**. Overall cap 6.5 applies; weighted total is already 5.0.

---

## Scoring

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| File Structure | 10% | 6/10 | 0.60 |
| Business Logic | 25% | 6/10 | 1.50 |
| DRY Compliance | 15% | 4/10 | 0.60 |
| SOLID Principles | 15% | 6/10 | 0.90 |
| Additional Quality | 10% | 6/10 | 0.60 |
| AI Usage & Ownership | 25% | 3/10 | 0.75 |
| **Total** | **100%** | | **5.0/10** |

**Caps applied:**

- AI Usage ≤ 4 → overall capped at 6.5 (does not bind; total is 5.0).
- Per-column conflict recomputation unflagged → Business Logic cannot exceed 7.5 (does not bind; scored 6).
- Per-column recompute + duplicated relevance assembly → DRY cannot exceed 5 (scored 4).
- Phase 3 not attempted → POST/PUT failures and missing transactions not deducted.
- Two-directional conflicts accepted; the scaffold GET test `should NOT list Lane 1 slots as conflicts on Pool slots` is not treated as a review failure.
- 9.0+ not eligible (inconsistent conflict sign; transcripts do not show candidate-driven design).

E2e (Node 22, after rebuilding `better-sqlite3`): 14 passed, 5 failed. GET: 10 pass, 1 fail (scaffold one-directional; not counted). POST/PUT: 4 fail (Phase 3 not attempted). Visual: same Pool booking has a conflict icon on Pool/Lane 1 and none on Lane 4.

---

## Recommendations

### High Priority

1. Compute conflicts **once per slot id** (same resource + blockers + blocked, if two-way) and reuse that list on every column the slot appears in. `buildConflicts` must not take `groupResourceId`. After this, `Aqua Aerobics Class` has the same `conflicts` (and icon) on Pool, Lane 1, and Lane 4.

### Medium Priority

2. Extract `slotsOverlap` and a single relevance helper used by both visibility filtering and conflict finding. Drop the second home-column loop — it is a third copy of overlap + candidate gathering. Map to `SlotDto` explicitly instead of `{ ...slot, conflicts }`.

### Low Priority

3. Filter to today (including overnight). Delete unused imports. Phase 3 is optional: if attempted, reuse the same per-slot conflict helper, wrap check-then-save in a transaction, return 409 with conflicting slots, and 404 (not 500) for a missing id.

---

## Conclusion

**Recommendation: FAIL**

Pass threshold is 7.0. Score is 5.0 after caps. Grouping, overlap, and two-way highlighting work. Conflict is still computed per column, so the same slot can have a conflict sign in one resource and not in another. Transcripts show the agent designed the solution and then explained it — including nested `return`s — after the candidate shipped it. That combination cannot pass.
