---
name: getSlots conflicts
overview: Implement `getSlots()` so each resource returns today's relevant slots (own + blockers) with per-slot conflict arrays, matching REQUIREMENTS.md and the existing GET /slots e2e tests. Leave `addSlot` / `updateSlot` untouched.
todos: []
isProject: false
---

# Implement `getSlots` conflicts

Only change [`server/src/slots/slots.service.ts`](server/src/slots/slots.service.ts) — `getSlots()`.

## Behavior (from REQUIREMENTS + e2e)

```mermaid
flowchart TD
  load[Load resources deps and todays slots] --> group[For each resource R