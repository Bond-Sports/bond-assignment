---
name: getSlots conflict computation
overview: Reimplement SlotsService.getSlots to load all resources and slots, group each resource with its own slots, and flag conflicts only between time-overlapping slots of the same resource.
todos:
  - id: helpers
    content: Add private helpers (overlaps, toConflictDto) to SlotsService
    status: pending
  - id: rewrite-getslots
    content: Rewrite getSlots to load resources and slots in parallel, group by resourceId, and compute same-resource conflicts per slot
    status: pending
  - id: verify
    content: Run server e2e tests and review which GET /slots assertions pass/fail
    status: pending
isProject: false
---

## Goal

Rewrite `getSlots` in [server/src/slots/slots.service.ts](server/src/slots/slots.service.ts) so that it:
1. Loads all resources and all slots.
2. Groups each resource's slot list to contain only its own slots.
3. For each slot, compares its `start`/`end` against other slots of the same resource and flags time overlaps as conflicts.
4. Returns one `ResourceSlotsDto` per resource with conflict-annotated slots.

## Domain rules

- Conflict scope: a slot's `conflicts` are only other slots with the same `resourceId` whose times overlap.
- Overlap is strict: `a.start < b.end && b.start < a.end` (touching/adjacent ranges do not conflict). `start`/`end` are `YYYY-MM-DDThh:mm:ss` strings, so lexicographic comparison is correct.
- Every resource appears, even with no slots (empty `slots` array).
- Blocking dependencies are not used.

## Data flow

```mermaid
flowchart TD
  load["Load all resources and all slots (Promise.all)"] --> conflicts["For each slot: conflicts = same-resourceId slots that overlap (computed once per slot)"]
  conflicts --> group["For each resource: collect its own slots with conflicts attached"]
  group --> out["Return ResourceSlotsDto per resource"]
end
```

## Implementation in `slots.service.ts`

Add small private helpers (JSDoc only, no inline comments):
- `private overlaps(a: Slot, b: Slot): boolean` = `a.start < b.end && b.start < a.end`.
- `private toConflictDto(slot: Slot): SlotDto` returning `{ ...slot }` without populating nested `conflicts` (avoid recursion; `conflicts` is optional on `SlotDto`).

Rewrite `getSlots`:

1. Load in parallel (per the Promise.all rule):

```ts
const [resources, slots] = await Promise.all([
  this.manager.find(Resource, { order: { id: 'ASC' } }),
  this.manager.find(Slot, { order: { id: 'ASC' } }),
]);
```

2. Precompute each slot's same-resource conflicts once (keyed by slot id):

```ts
const conflictsBySlotId = new Map<number, SlotDto[]>();
for (const slot of slots) {
  const conflicts = slots
    .filter((other) =>
      other.id !== slot.id &&
      other.resourceId === slot.resourceId &&
      this.overlaps(slot, other),
    )
    .map((other) => this.toConflictDto(other));
  conflictsBySlotId.set(slot.id, conflicts);
}
```

3. Build one `ResourceSlotsDto` per resource, selecting that resource's own slots and attaching the precomputed conflicts:

```ts
return resources.map((resource) => {
  const resourceSlots = slots
    .filter((slot) => slot.resourceId === resource.id)
    .map((slot) => ({ ...slot, conflicts: conflictsBySlotId.get(slot.id) ?? [] }));
  return { resourceId: resource.id, slots: resourceSlots };
});
```

`Resource` is already imported; no new imports are needed.

## Out of scope

`addSlot`/`updateSlot` 409 conflict checking is not part of this request and will be left as-is.

## Test impact (important)

This same-resource-only, no-blocking scope diverges from several existing e2e assertions in [server/test/slots.e2e-spec.ts](server/test/slots.e2e-spec.ts):
- Will pass: `should return one entry per resource`, `should return slots with the correct shape`, `should have at least one slot with conflicts` (same-resource overlaps exist in the seed, e.g. Lane 1 09:30 "Private Coaching" overlaps 08:30 "Swim Lessons"), `should have conflicts with the correct shape`, and `should only include conflicts from the same resource or blocking resources` (same-resource is a subset of allowed).
- Will FAIL (blocking-dependency assertions): `should include Pool slots in Lane 1 entry`, `should list a Pool slot as a conflict on an overlapping Lane 1 slot`, `should show Pool (blocker) slots inside Lane 4 entry`.

## Verification

Run `npm test` (e2e) in `server/` and confirm the per-resource/shape/conflict assertions pass; the divergence is limited to the blocking-dependency tests noted above.
