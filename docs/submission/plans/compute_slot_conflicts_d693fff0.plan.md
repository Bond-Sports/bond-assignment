---
name: Compute slot conflicts
overview: "Implement conflict computation in getSlots: overlapping slots on the same resource, found via a sort-by-start sweep within each resource group."
todos:
  - id: sorted-query
    content: Order slots by resourceId, start in the DB query and group via Map
    status: pending
  - id: sweep-conflicts
    content: Implement forward-scan sweep to populate conflicts per resource group
    status: pending
  - id: shallow-conflicts
    content: Ensure conflict entries are shallow (no nested conflicts / circular refs)
    status: pending
isProject: false
---

# Compute Slot Conflicts in getSlots

## Definition
Two slots conflict when they belong to the **same resource** and their time intervals overlap as half-open intervals: `a.start < b.end && b.start < a.end`. Equal endpoints (back-to-back bookings) are not conflicts. `BlockingDependency` is ignored for now.

Since `start`/`end` are ISO-8601 strings, lexicographic string comparison is chronologically correct — no `Date` parsing needed.

## Algorithm (in [server/src/slots/slots.service.ts](server/src/slots/slots.service.ts))
1. Fetch slots ordered in the DB: `order: { resourceId: 'ASC', start: 'ASC' }` — this groups resources contiguously and pre-sorts each group by start time.
2. Group into `ResourceSlotsDto[]` using a `Map<number, ResourceSlotsDto>` instead of the current `result.find(...)` per slot (removes the accidental O(n²) lookup).
3. Per resource group, sweep the sorted slots: for slot `i`, scan forward `j = i+1, i+2, ...` while `slots[j].start < slots[i].end`; each such pair conflicts, so add each slot to the other's `conflicts` array, then stop at the first non-overlap.
   - The early break is safe: slots are sorted by start, so once `slots[j].start >= slots[i].end`, every later slot starts even later and cannot overlap `i`.
   - Nuance vs. the pure "compare neighbor" idea: slot `i` can overlap several following slots (e.g. a long slot spanning three short ones), so the forward scan is needed — but it still only visits actual conflicts, so total work is O(n log n + number of conflicting pairs).
4. Conflict entries are shallow copies of the slot data **without** their own `conflicts` arrays, to avoid circular references when serializing to JSON.

## Structure
- Extract a small private helper, e.g. `computeConflicts(sortedSlots: SlotDto[]): void`, so the same logic is reusable later by `addSlot` / `updateSlot` for their 409 checks.
- No changes needed to DTOs — `SlotDto.conflicts?: SlotDto[]` already fits.