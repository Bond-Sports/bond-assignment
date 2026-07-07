---
name: Slot conflict algorithm
overview: Per-resource interval overlap only for `populateSlotConflicts` — group by resourceId, sort by start, sweep with early termination. Blocking dependencies (Pool/Lanes) deferred.
todos:
  - id: conflict-predicate
    content: Add isConflict(a, b) — same resourceId, different id, slotsOverlap
    status: pending
  - id: group-by-resource
    content: Group slots by resourceId before comparing (skip cross-resource pairs entirely)
    status: pending
  - id: sorted-sweep
    content: Within each resource bucket, sortBy start + (i,j) sweep with early break; add both directions on overlap
    status: pending
  - id: sync-overlap
    content: Make slotsOverlap synchronous (no await, no I/O)
    status: pending
  - id: shallow-conflict-refs
    content: Use omit(other, 'conflicts') in addToConflicts — never push live slot references
    status: pending
isProject: false
---

# Slot Conflict Detection Algorithm (per-resource only)

## Scoped conflict definition

For now, **ignore `BlockingDependency`** (Pool/Lane graph). A slot **A** lists slot **B** as a conflict when:

1. **Same resource:** `A.resourceId === B.resourceId`
2. **Not self:** `A.id !== B.id`
3. **Time overlap** (touching is OK): `A.start < B.end && A.end > B.start`

Conflicts are **symmetric** within a resource — if A conflicts with B, B conflicts with A.

> **Note:** Full assignment e2e tests expect cross-resource blocking later ([REQUIREMENTS.md](REQUIREMENTS.md), [slots.e2e-spec.ts](server/test/slots.e2e-spec.ts)). This plan covers `populateSlotConflicts` only; blocking can be layered on in a follow-up.

Existing `slotsOverlap` already implements rule 3:

```60:62:server/src/slots/slots.service.ts
  async slotsOverlap(slotA: SlotDto, slotB: SlotDto): Promise<boolean> {
    return slotA.start < slotB.end && slotA.end > slotB.start;
  }
```

---

## Recommended algorithm: group by resource + sorted sweep

### Step 1 — Group slots by `resourceId`

```ts
const byResource = groupBy(slots, s => s.resourceId);
```

Only compare slots inside the same bucket. If `populateSlotConflicts` receives a mixed list (own + blocker slots for GET /slots), cross-resource pairs are never evaluated.

### Step 2 — Conflict predicate

```ts
function isConflict(a: SlotDto, b: SlotDto): boolean {
  return a.id !== b.id && slotsOverlap(a, b);
}
```

`resourceId` equality is guaranteed by bucketing; no blockers map needed.

### Step 3 — Sort + sweep within each bucket

```ts
for (const resourceSlots of Object.values(byResource)) {
  const sorted = sortBy(resourceSlots, s => s.start);

  for (let i = 0; i < sorted.length; i++) {
    sorted[i].conflicts = [];
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].start >= sorted[i].end) break;

      if (isConflict(sorted[i], sorted[j])) {
        addToConflicts(sorted[i], sorted[j]);
        addToConflicts(sorted[j], sorted[i]);
      }
    }
  }
}
```

**Why the pair sweep**

- Overlapping intervals sorted by `start` always appear as `(i, j)` with `i < j` once.
- `break` when `sorted[j].start >= sorted[i].end` — no later slot can overlap `sorted[i]`.
- Bidirectional `addToConflicts` keeps symmetry without a second pass.

**Why not the current nested `for-of` over all slots**

The draft in [slots.service.ts](server/src/slots/slots.service.ts) compares every pair including self, and lacks early termination. Fixing self (`a.id !== b.id`) is enough for correctness; the sweep adds pruning.

### Step 4 — `addToConflicts` (avoid circular references)

**Never push the live slot object** into `conflicts`. If A conflicts with B and you do `a.conflicts.push(b)` where `b` is the same in-memory `SlotDto`, then `b.conflicts` may already contain `a` → a cyclic object graph. `JSON.stringify` on the response will throw or nest infinitely.

Use lodash `omit` to strip `conflicts` and get a new object (lodash is already used for `sortBy` / `groupBy`):

```ts
private addToConflicts(target: SlotDto, other: SlotDto): void {
  target.conflicts ??= [];
  target.conflicts.push(omit(other, 'conflicts'));
}
```

`omit(other, 'conflicts')` returns a plain object with the same scalar fields (`id`, `name`, `start`, `end`, `resourceId`) and no nested `conflicts` key — equivalent to manually listing fields, less boilerplate.

No separate `toConflictDto` helper or new DTO class needed. `conflicts` stays typed as `SlotDto[]` in [slots.dto.ts](server/src/slots/types/dtos/slots.dto.ts).

**Rules**

| Do | Don't |
|----|-------|
| `push(omit(other, 'conflicts'))` | `push(other)` — shares reference, pulls in `other.conflicts` |
| Return the same omitted shape in 409 bodies | Reuse the parent `SlotDto` instance in the conflict list |

Symmetric overlap (A↔B) is fine: A holds a new object with B's fields, B holds a new object with A's fields — no pointers back.

---

## Simpler alternative: naive O(n²) per bucket

With ~8 slots per resource in seed data, this is equally fine:

```ts
for (const resourceSlots of Object.values(byResource)) {
  for (const slot of resourceSlots) {
    slot.conflicts = resourceSlots
      .filter(other => other.id !== slot.id && slotsOverlap(slot, other))
      .map(other => omit(other, 'conflicts'));
  }
}
```

Prefer the sweep if you want to keep the `sortBy` structure you started; prefer naive if clarity matters more at this scale.

---

## Gaps in current draft to fix

- **Self-conflict:** loop includes `slot === otherSlot` → must skip same `id`
- **`await` on `slotsOverlap`:** make it synchronous
- **Cross-resource pairs:** if input array mixes resources, filter by `resourceId` (bucketing handles this)

---

## Deferred (not in this scope)

- `BlockingDependency` / `blockersOf` map
- Directed conflicts (Pool blocks Lane 1 one-way)
- `addSlot` / `updateSlot` 409 validation (can reuse `isConflict` + same-resource filter when implemented)
