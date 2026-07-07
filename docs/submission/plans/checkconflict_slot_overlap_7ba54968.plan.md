---
name: checkConflict slot overlap
overview: "Add a reusable `checkConflict` function that takes a slot DTO (with start, end, resourceId) and optional excludeSlotId, queries the DB for overlapping slots on the same resource and blocking resources, and returns an array of conflicting SlotDtos (id, name, start, end, resourceId, conflicts: []). Use it in getSlots, addSlot, and updateSlot. Overlap uses strict inequalities only so touching slots do not conflict."
todos: []
isProject: false
---

# checkConflict for slot overlap detection

## Overlap rule (strict only)

Two ranges overlap **only** when both conditions hold (no equals):

- `proposed.start < existing.end`
- `proposed.end > existing.start`

So touching slots (e.g. one ends at `T10:00:00`, another starts at `T10:00:00`) do **not** conflict.

---

## 1. Add `checkConflict` in [server/src/slots/slots.service.ts](server/src/slots/slots.service.ts)

**Signature:**

- **Input:** A “slot-like” object with at least `start`, `end`, `resourceId` (e.g. `CreateSlotDto`, or merged `UpdateSlotTimesDto` + resourceId from DB). Optional second arg: `excludeSlotId?: number` (for update: exclude the slot being updated).
- **Output:** `Promise<SlotDto[]>` — conflicting slots from the DB, each shaped as `{ id, name, start, end, resourceId, conflicts: [] }`.

**Logic:**

1. Resolve “candidate” resource IDs for conflict check:
   - Same resource: `resourceId`.
   - Resources that **block** this resource: from `BlockingDependency` where `blockedResourceId = resourceId` → collect `blockingResourceId`s.
   - Candidate set = `[resourceId, ...blockingResourceIds]`.
2. Load all slots where `resource_id IN (candidateIds)` and (for GET/addSlot) optionally filter to “today” if needed for the caller; for `checkConflict` itself, no date filter — compare by time range only.
3. Exclude the slot with `id === excludeSlotId` when provided (update case).
4. For each remaining DB slot, test overlap with **strict** comparison:
   - `proposed.start < dbSlot.end && proposed.end > dbSlot.start`.
5. Map matching slots to `SlotDto` (id, name, start, end, resourceId, conflicts: []) and return.

**Helper:** Consider a small pure function for the overlap test, e.g. `rangesOverlap(aStart, aEnd, bStart, bEnd)` using only `<` and `>`.

---

## 2. Use `checkConflict` in the three flows

- **Create (`addSlot`):** Call `checkConflict(createSlot)`. If result length > 0, throw/return a 409 response with the conflicting SlotDtos (per [REQUIREMENTS.md](REQUIREMENTS.md) and e2e: 409 body is the array of conflicts). Otherwise save and return the new slot with `conflicts: []` (or run check again after save for consistency).
- **Update (`updateSlot`):** Load the slot by `slotId` to get `resourceId`. Call `checkConflict({ start: updateSlot.start, end: updateSlot.end, resourceId }, slotId)`. If conflicts.length > 0, 409 with that array. Otherwise update and return the updated slot (with conflicts populated if desired).
- **Get (`getSlots`):** For each resource (and its “relevant” slots per REQUIREMENTS — own + blocking resources’ slots, filtered by today/overnight), for each slot call `checkConflict` with that slot’s start/end/resourceId and `excludeSlotId: slot.id` so the slot doesn’t conflict with itself. Set `slot.conflicts` to the returned array.

---

## 3. 409 response shape

- Controller/service must return **409** with response body = **array of conflicting SlotDtos** (not `{ conflicts: [...] }`), so that e2e’s `body.length` and `for (const conflict of body)` pass ([server/test/slots.e2e-spec.ts](server/test/slots.e2e-spec.ts)).

---

## 4. GET response shape vs e2e

- REQUIREMENTS: GET returns `ResourceSlotsDto[]` (grouped by resource).
- E2e currently expects a flat `SlotDto[]`. Either:
  - Implement GET as grouped and change e2e to use a flattened list for assertions, e.g. `const slots = body.flatMap((r: any) => r.slots)`; or
  - Implement GET as a flat list and align docs to that.

Recommendation: implement GET as **grouped** per REQUIREMENTS and adjust e2e to flatten when asserting.

---

## 5. Edge cases (covered)

- **Touching slots:** Handled by using strict `<` and `>` in the overlap check — no conflict.
- **Update:** Same slot excluded via `excludeSlotId` so it never conflicts with itself.
- **Create:** No id yet; no exclude. All overlapping existing slots on candidate resources are conflicts.
- **Blocking direction:** Only slots on the slot’s resource and on resources that **block** that resource (BlockingDependency where `blocked_resource_id = slot.resourceId`) are considered.

---

## Summary

- Add `checkConflict(proposed, excludeSlotId?)` using strict overlap and candidate resources (same + blockers).
- Use it in addSlot (reject with 409 on conflicts), updateSlot (same, with excludeSlotId), and getSlots (per-slot conflicts with excludeSlotId = slot.id).
- 409 body = array of SlotDtos. GET = ResourceSlotsDto[] with e2e flattened for assertions if needed.