# Code Review Template — Slot Conflict Detection Assignment

Use this template to evaluate candidate submissions for the Bond Slot Conflict
Detection assignment consistently. The candidate implements `SlotsService`
methods in `server/src/slots/slots.service.ts`.

---

## Quick Start

1. Read `REQUIREMENTS.md` in the assignment root
2. Run `npm run test:e2e` — all tests should pass
3. Start the server (`npm run start:dev`) and open the client to visually verify
4. Run through the **Review Checklist** below
5. Calculate the **Weighted Score**
6. Generate **Candidate Feedback** and **Internal Report**

---

## Assignment Context

**What's provided:** NestJS scaffold, entities, DTOs, controller, seed data,
e2e tests, React calendar UI.

**What the candidate implements:** `SlotsService.getSlots()`, `addSlot()`,
`updateSlot()` — all in a single file.

**Domain model:**
- Resources: Pool, Lane 1, Lane 2, Lane 3
- Blocking dependencies: Pool → all Lanes, Lane 2 ↔ Lane 3
- Blocking is one-directional: Pool blocks Lane 1, but Lane 1 does NOT block Pool

**Key rules:**
- Overlap: `slotA.start < slotB.end AND slotA.end > slotB.start`
- Adjacent (touching) slots do NOT conflict
- Conflicts include: same-resource overlaps + upstream blocker overlaps
- `GET /slots` groups by resource, includes blocking resource slots in each entry
- `POST /slots` rejects with 409 if conflicts exist
- `PUT /slots/:slotId` rejects with 409, excludes self from conflict check

---

## Review Checklist

### 1. Assignment Compliance (Pass/Fail)

| Requirement | Pass |
|-------------|------|
| `getSlots()` returns slots grouped by resource | [ ] |
| `getSlots()` includes blocking resource slots in each entry | [ ] |
| `getSlots()` computes conflicts for each slot (same resource + upstream blockers) | [ ] |
| Blocking is one-directional (blocker conflicts on blocked slots, not the reverse) | [ ] |
| `addSlot()` saves when no conflicts, rejects 409 with conflicting slots when conflicts exist | [ ] |
| `updateSlot()` updates when no conflicts, rejects 409 when conflicts exist | [ ] |
| `updateSlot()` excludes the slot itself from conflict check (self-exclusion) | [ ] |
| Adjacent (touching) slots are allowed (strict `<` / `>`, not `<=` / `>=`) | [ ] |
| `updateSlot()` returns 404 for non-existent slot | [ ] |
| All e2e tests pass | [ ] |

### 2. File Structure (Score: __/10)

| Criteria | Check |
|----------|-------|
| Service file is clean and well-organized | [ ] |
| No dead code, commented-out alternatives, or scratch work | [ ] |
| Helper functions / query builders properly extracted | [ ] |
| Consistent formatting (ran Prettier/ESLint) | [ ] |
| No typos in comments or variable names | [ ] |

**Common issues to look for:**
- Commented-out alternative solutions left in the file
- Monolithic methods doing too much (fetch + compute + group + pull-in all in one)
- Utility functions inlined rather than extracted

### 3. Business Logic (Score: __/10)

| Criteria | Check |
|----------|-------|
| Overlap rule correctly implemented (`<` / `>`, not `<=` / `>=`) | [ ] |
| Blocker map correctly built (blockedResourceId → Set of blockingResourceIds) | [ ] |
| Conflicts include same-resource AND upstream blocker overlaps | [ ] |
| Blocking is one-directional (no reverse conflicts) | [ ] |
| Resources with no own slots still get entries if they have blocking deps | [ ] |
| `start < end` validation on input | [ ] |
| Transaction wrapping check-then-save in addSlot/updateSlot | [ ] |
| Efficient data access (see below) | [ ] |

**Efficiency — what to look for:**
- Does the conflict loop only check relevant resources (same resource + its
  blockers), or does it brute-force ALL slots against ALL slots regardless of
  resource? The candidate should group or index slots by resource to avoid
  checking pairs that can never conflict.
- Does the candidate load all data into memory on every request, or use
  targeted queries where appropriate?
- Are there redundant DB round-trips (e.g., fetching the same entity or
  relation twice)?

**Architecture — what to look for:**
- Does the candidate use the DB as the source of truth, or do they maintain
  an in-memory cache? If they use a cache, do they understand the tradeoffs
  (cache invalidation, multi-instance divergence, crash recovery, unsafe
  mutation before confirming writes)?
- Is the check-then-save pattern wrapped in a transaction to prevent race
  conditions under concurrent requests?

### 4. DRY Compliance (Score: __/10)

| Criteria | Check |
|----------|-------|
| Conflict detection logic not duplicated between getSlots/addSlot/updateSlot | [ ] |
| Overlap check extracted to a reusable function | [ ] |
| Blocker resolution logic shared (not copy-pasted per method) | [ ] |
| No redundant DB queries (e.g., fetching same data twice) | [ ] |

**Common DRY violations in this assignment:**
- Two parallel conflict detection implementations (e.g., in-memory for reads
  vs. SQL for writes) — a logic change requires updating two places
- Copy-pasted slot-to-DTO mapping instead of a shared mapper
- Repeated blocker map construction across methods

### 5. SOLID Principles (Score: __/10)

| Principle | Criteria | Check |
|-----------|----------|-------|
| **SRP** | Service methods have clear, focused responsibilities | [ ] |
| **DIP** | `EntityManager` / repositories injected, not imported directly | [ ] |
| **OCP** | Conflict detection is extensible (e.g., new blocking rules) | [ ] |

**Red flags:**
- Direct `DataSource` or DB module imports in the service
- Business logic mixed into the controller
- Tightly coupled conflict detection that can't accommodate new resource types
  or blocking rules without rewriting

### 6. Additional Quality (Score: __/10)

| Criteria | Check |
|----------|-------|
| Proper TypeScript usage (no `any` abuse) | [ ] |
| Parameterized queries (no SQL injection risk) | [ ] |
| Clean error responses (409 body matches expected shape, 404 for missing slots) | [ ] |
| No unnecessary null checks or dead branches | [ ] |

---

## Scoring Formula

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| File Structure | 15% | __/10 | __ |
| Business Logic | 30% | __/10 | __ |
| DRY Compliance | 20% | __/10 | __ |
| SOLID Principles | 25% | __/10 | __ |
| Additional Quality | 10% | __/10 | __ |
| **Total** | **100%** | | **__/10** |

**Pass threshold**: 7.0/10

---

## Output Templates

### Candidate Feedback (Short Version)

Save as `[CANDIDATE_REPO]/CANDIDATE_FEEDBACK.md`:

```markdown
# Code Review Feedback

**Overall Score: X.X/10**

## Pros

- [Key strength 1]
- [Key strength 2]
- [Key strength 3]

## Cons

- [Main issue 1]
- [Main issue 2]

## Conclusion

[1-2 sentences summarizing overall quality and recommendation. Do not repeat the full list of cons.]
```

### Internal Report (Detailed Version)

Save as `[CANDIDATE_REPO]/EVALUATION_REPORT.md`:

```markdown
# Code Evaluation Report

## Executive Summary

[2-3 sentences describing overall assessment]

**Overall Score: X.X/10**

---

## Assignment Compliance

| Requirement | Status |
|-------------|--------|
| `getSlots()` returns slots grouped by resource with conflicts | Complete/Incomplete |
| `getSlots()` includes blocking resource slots in each entry | Complete/Incomplete |
| `addSlot()` creates slot or rejects with 409 | Complete/Incomplete |
| `updateSlot()` updates slot or rejects with 409 | Complete/Incomplete |
| Self-exclusion on update | Complete/Incomplete |
| Adjacent (touching) slots allowed | Complete/Incomplete |
| E2E tests pass | Complete/Incomplete |

---

## Detailed Evaluation

### File Structure (X/10)
[Analysis with specific examples]

### Business Logic (X/10)
[Analysis — overlap logic, blocker resolution, efficiency, edge cases]

### DRY Compliance (X/10)
[List violations found]

### SOLID Principles (X/10)
[Per-principle assessment]

---

## Recommendations

### High Priority
1. [Critical fix needed]

### Medium Priority
2. [Improvement suggestion]

### Low Priority
3. [Nice to have]

---

## Conclusion

**Recommendation: PASS/FAIL**

[Justification for the decision]
```

---

## Review Process

1. **Run tests**: `cd server && npm run test:e2e` — all should pass
2. **Start server**: `npm run start:dev` and open the React client to visually
   verify conflict indicators and blocking resource slots in each column
3. **Read `slots.service.ts`** — this is the only file the candidate modifies
4. **Trace the conflict logic** for a concrete example:
   - Pick a slot on a blocked resource that overlaps with a slot on a blocking resource
   - Verify the blocking resource's slot appears in the blocked slot's conflicts
   - Verify the reverse does NOT happen (one-directional blocking)
5. **Check edge cases**:
   - What happens if a resource has no own slots but has blocking deps?
   - What happens with `start >= end`?
   - Can two concurrent addSlot requests create conflicting slots?
6. **Check efficiency**: Does the conflict loop only check relevant resources,
   or does it brute-force all slots against all slots?
7. **If candidate discussed alternative approaches** (e.g., in-memory cache):
   assess whether they understand the tradeoffs and limitations
8. **Score each category** using the checklist
9. **Calculate weighted total**
10. **Write feedback** using templates above

---

## Common Grep Commands for Review

```bash
# The candidate only modifies this file
cat server/src/slots/slots.service.ts

# Check for commented-out code
grep -c "^//" server/src/slots/slots.service.ts

# Check for 'any' usage
grep -r ": any" server/src/ --include="*.ts"

# Check if they use transactions
grep -r "transaction" server/src/slots/ --include="*.ts"

# Check if they group slots by resource (Map usage)
grep -r "new Map" server/src/slots/ --include="*.ts"

# Check for OnModuleInit (in-memory cache pattern)
grep -r "OnModuleInit" server/src/slots/ --include="*.ts"
```

---

## File Locations

- **Assignment scaffold**: `bond-assignment/`
- **Candidate submission**: copied into a candidate-specific folder
- **Candidate Feedback**: `[CANDIDATE_REPO]/CANDIDATE_FEEDBACK.md`
- **Internal Report**: `[CANDIDATE_REPO]/EVALUATION_REPORT.md`
