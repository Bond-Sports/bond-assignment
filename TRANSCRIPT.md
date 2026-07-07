# Change-Focused Transcript

## Scope and Constraints
- Implement slot conflict logic while keeping method signatures unchanged.
- Start with `getSlots`, then implement `addSlot` and `updateSlot`.
- Keep conflict checks optimized using start-sorted slot scans.
- Blocking dependencies apply one-directionally (`blocking -> blocked`).

## Key Decisions
- Overlap rule: `A.start < B.end && B.start < A.end` (adjacent slots are not conflicts).
- Same-resource conflicts are bidirectional.
- Blocking conflicts are one-directional (blocked slot records blocker slot).
- Use direct dependency edges from `BlockingDependencies` (no transitive closure).
- Reuse one shared overlap scanning helper to avoid duplication.

## `getSlots` Implementation
- Load `Slot`, `BlockingDependency`, and `Resource` in parallel.
- Sort slots by `start ASC, id ASC`.
- Group slots by `resourceId`.
- Build conflict map in two passes:
  - same-resource overlaps
  - blocking-resource overlaps
- Build each resource entry with:
  - own slots
  - blocker slots (resources that block this resource)
  - conflicts attached from precomputed conflict map
- Keep all entries present, including resources with no own slots.

## Optimization Applied
- Centralized overlap scan in `collectOverlappingSlots(...)`.
- For sorted slots:
  - skip candidates fully in the past (`slot.end <= candidate.start`)
  - break once future slots cannot overlap (`slot.start >= candidate.end`)
- Blocking pass uses a moving pointer (`blockingIndex`) so old blocker slots are not rescanned.

## `addSlot` Implementation
- Build candidate from `CreateSlotDto`.
- Query only relevant slots:
  - same resource
  - direct blocking resources
- Reuse shared overlap helper.
- If conflicts exist: throw `409` with conflicting slots.
- If no conflicts: save and return created slot with `conflicts: []`.

## `updateSlot` Implementation
- Load slot by id.
- If not found: throw `404`.
- Build candidate with new times and original `resourceId`.
- Reuse same conflict finder with `excludeSlotId` to avoid self-conflict.
- If conflicts exist: throw `409`.
- If no conflicts: save and return updated slot with `conflicts: []`.

## Clarifications Discussed
- One-directional blocking was confirmed by assignment behavior and tests.
- Overnight time overlap works with full ISO datetime comparison.
- Explicit “today-only” filtering was noted as not added.
- Transitive blocking (`A->B->C` implies `A->C`) was discussed and intentionally not added.

## Test Outcomes
- Final full e2e run: all tests pass.
- Result: `19 passed, 19 total`.

## Final State
- Conflict detection logic is implemented for:
  - `getSlots`
  - `addSlot`
  - `updateSlot`
- Shared conflict scanning is reused across read and write paths.
