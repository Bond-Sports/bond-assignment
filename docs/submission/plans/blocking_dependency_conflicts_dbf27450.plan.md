---
name: Blocking dependency conflicts
overview: Extend getSlots so each blocked resource's group also contains the slots of its blocking resources, and conflicts are computed across the merged list — only for pairs involving the group's own resource.
todos:
  - id: parallel-fetch
    content: Fetch slots and blocking dependencies with Promise.all, build blocked-to-blocking map
    status: completed
  - id: merge-groups
    content: Merge copies of blocking resources' slots into each blocked group, sorted by start
    status: completed
  - id: filtered-sweep
    content: Pass ownResourceId to computeConflicts and only record pairs involving it
    status: completed
  - id: verify-api
    content: "Verify via GET /slots: lane groups include Pool slots, own-only conflict pairs, Lane 4 group present"
    status: completed
isProject: false
---

# Blocking Dependencies in getSlots

## Behavior
- `BlockingDependencies` is directed: `blockingResourceId` blocks `blockedResourceId` (seed: Pool blocks Lanes 1-4; Lanes 2 and 3 block each other, which needs no special handling).
- Each blocked resource's group includes **copies** of its blocking resources' slots, keeping their original `resourceId` so the client can tell them apart.
- Conflicts are computed on the merged, start-sorted list, but only for pairs where **at least one slot belongs to the group's own resource**. Two borrowed slots overlapping each other (e.g. a Pool slot vs a Lane 3 slot inside Lane 2's group) are not recorded there — that pair shows up in its own group. Conflicts stay symmetric and back-to-back is still not a conflict.
- Each borrowed slot is a fresh copy per group with its own `conflicts` array (Pool's slots appear in several groups; they must not share state).

## Changes in [server/src/slots/slots.service.ts](server/src/slots/slots.service.ts)

1. **Fetch concurrently**: replace the single query with `Promise.all` of `manager.find(Slot, { order: { resourceId: 'ASC', start: 'ASC' } })` and `manager.find(BlockingDependency)` (independent queries).
2. **Build lookup**: `Map<blockedResourceId, blockingResourceId[]>` from the dependency rows.
3. **Group own slots** by `resourceId` into a `Map<number, Slot[]>` (each group already start-sorted by the DB).
4. **Merge per group**: for each group, concat its own slots with copies of each blocking resource's slots, then sort by `start` (string compare is chronologically correct for ISO-8601). O(m log m) per group where m is the merged size; group sizes are small, so this beats a hand-rolled k-way merge on readability at negligible cost.
5. **Extend the sweep**: `computeConflicts(sortedSlots, ownResourceId)` keeps the same forward-scan-with-early-break, but records a pair only when `current.resourceId === ownResourceId || next.resourceId === ownResourceId`. The early break stays valid regardless of the filter, so complexity remains O(m + overlapping pairs).

## Open point (will implement as described unless you object)
A resource with no slots of its own but with a blocking dependency (Lane 4 in the seed: zero slots, blocked by Pool) currently gets no group at all. The plan builds groups from the union of resource ids that have slots and blocked resource ids whose blockers have slots, so Lane 4's group appears containing Pool's slots (each with empty conflicts, since Lane 4 has nothing to conflict with).