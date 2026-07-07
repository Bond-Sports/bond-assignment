---
name: Slot Time Conflict Detection
overview: "Add time-overlap conflict detection to getSlots in slots.service.ts: detect overlapping slots (e.g. 11:00-12:00 vs 11:30-12:30) and populate each slot's conflicts array before returning."
todos:
  - id: overlap-helper
    content: Add a slotsOverlap(a, b) helper in slots.service.ts using strict inequalities (a.start < b.end && b.start < a.end) so touching slots do not conflict
    status: pending
  - id: populate-conflicts
    content: In getSlots, for each slot populate its conflicts array with overlapping slots from its candidate set (same resource + blocking resources), excluding itself by id
    status: pending
isProject: false
---

## Goal

In [server/src/slots/slots.service.ts](server/src/slots/slots.service.ts), compute time conflicts for each slot and fill its `conflicts` array, then return the grouped result.

## Core idea: half-open overlap test

Two slots conflict when their time ranges overlap but do NOT merely touch. Because `start`/`end` are fixed-format strings (`YYYY-MM-DDTHH:mm:ss`), lexical string comparison is correct (works across day boundaries for overnight slots too).

```ts
const DATE_TIME_FORMAT = 'YYYY-MM-DDThh:mm:ss';

function slotsOverlap(a: SlotDto, b: SlotDto): boolean {
  return a.start < b.end && b.start < a.end;
}
```

- `11:00-12:00` vs `11:30-12:30`: `11:00 < 12:30` and `11:30 < 12:00` -> true (conflict).
- `08:00 end` vs `08:00 start` (touching): `08:00 < 08:00` -> false (no conflict). Matches the e2e test `should allow creating an adjacent (touching) slot without conflict`.

## Applying it in `getSlots`

The existing loop already groups slots by resource and pushes each with `conflicts: []`. Extend it so that for each slot we scan the other slots that are candidates for conflict and push overlapping ones:

- A slot conflicts with another slot in its candidate set when `slotsOverlap` is true and it is not itself (exclude by `id`).
- Candidate set for a slot owned by resource `R`: slots of `R` plus slots of resources that block `R` (from `BlockingDependency`, matching `blockedResourceId === R`). This is what the e2e tests at lines 150-199 expect (Pool slots appear as conflicts on Lane 1, but not vice-versa).
- For a request strictly limited to same-resource time conflicts, the candidate set is just the other slots of the same resource; the overlap test is identical either way.

Sketch:

```ts
for (const slot of resource.slots) {
  slot.conflicts = candidateSlotsFor(slot).filter(
    (other) => other.id !== slot.id && slotsOverlap(slot, other),
  );
}
```

## Notes

- Keep the overlap helper as a small named function (no inline magic literals; touching-vs-overlapping is the only subtlety, so a brief JSDoc on the helper is warranted).
- The same `slotsOverlap` helper is reusable by `addSlot`/`updateSlot` for the 409 conflict checks, but that is out of scope for this change unless you want it included.