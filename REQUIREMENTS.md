# Slot Conflict Detection — Assignment

## Goal

Build a **Slot Management & Conflict Detection API** for a sports facility scheduling system. The API allows viewing, creating, and updating time-bound bookings (slots), with each slot annotated with its **conflicts** — taking into account **blocking dependencies** between resources.

Think of it like a swimming facility: the **Pool** is the parent resource, and **Lane 1**, **Lane 2**, **Lane 3** are sub-resources. When the entire Pool is booked, all Lanes are blocked. When a Lane is booked, other dependent Lanes may also be blocked.

---

## Domain Model

### Resources

A bookable space (e.g., Pool, Lane 1, Lane 2, Lane 3).

| Column | Type    | Description   |
| ------ | ------- | ------------- |
| id     | integer | Primary key   |
| name   | text    | Resource name |

### Slots

A time-bound booking on a specific resource.

| Column      | Type    | Description                            |
| ----------- | ------- | -------------------------------------- |
| id          | integer | Primary key                            |
| name        | text    | Booking title                          |
| start       | text    | Start datetime (`YYYY-MM-DDThh:mm:ss`) |
| end         | text    | End datetime (`YYYY-MM-DDThh:mm:ss`)   |
| resource_id | integer | FK to Resources                        |

### Blocking Dependencies

Defines which resources block other resources. If resource A **blocks** resource B, then any slot on A conflicts with overlapping slots on B.

| Column               | Type    | Description                        |
| -------------------- | ------- | ---------------------------------- |
| id                   | integer | Primary key                        |
| blocking_resource_id | integer | The resource that causes the block |
| blocked_resource_id  | integer | The resource that gets blocked     |

### Seeded Dependency Graph

```
Pool ──blocks──▶ Lane 1
Pool ──blocks──▶ Lane 2
Pool ──blocks──▶ Lane 3
Lane 1 ──blocks──▶ Lane 2
Lane 2 ──blocks──▶ Lane 3
```

When checking conflicts for a slot on a given resource, look for overlapping existing slots on:

1. The **same resource** (direct overlap)
2. Any resource that **blocks** the slot's resource (upstream blockers)

### Overlap Rule

Two time ranges overlap when: `slotA.start < slotB.end AND slotA.end > slotB.start`

Adjacent (touching) slots do **not** conflict. For example, a slot ending at `T10:00:00` and another starting at `T10:00:00` are back-to-back, not overlapping.

---

## API

### `GET /slots`

Returns today's slots grouped by resource. Each entry contains a `resourceId` and a `slots` array. The `slots` array includes not only the slots belonging to that resource, but also the slots from any resource that **blocks** it — giving a complete view of all bookings that affect scheduling for that resource. Each slot includes a `conflicts` array listing its conflicting slots. Overnight slots (started yesterday, ending today) are included.

For example, since Pool blocks Lane 1, the Lane 1 entry includes both Lane 1 slots and Pool slots. Since Pool and Lane 1 both block Lane 2, the Lane 2 entry includes Lane 2, Lane 1, and Pool slots.

**Response:**

```json
[
  {
    "resourceId": 1,
    "slots": [
      {
        "id": 1,
        "name": "Morning Open Swim",
        "start": "2026-02-23T06:00:00",
        "end": "2026-02-23T08:00:00",
        "resourceId": 1,
        "conflicts": []
      }
    ]
  },
  {
    "resourceId": 2,
    "slots": [
      {
        "id": 9,
        "name": "Private Coaching - Sarah M.",
        "start": "2026-02-23T09:30:00",
        "end": "2026-02-23T11:00:00",
        "resourceId": 2,
        "conflicts": [
          {
            "id": 8,
            "name": "Swim Lessons - Beginners",
            "start": "2026-02-23T08:30:00",
            "end": "2026-02-23T10:00:00",
            "resourceId": 2,
            "conflicts": []
          },
          {
            "id": 2,
            "name": "Aqua Aerobics Class",
            "start": "2026-02-23T09:30:00",
            "end": "2026-02-23T11:00:00",
            "resourceId": 1,
            "conflicts": []
          }
        ]
      },
      {
        "id": 2,
        "name": "Aqua Aerobics Class",
        "start": "2026-02-23T09:30:00",
        "end": "2026-02-23T11:00:00",
        "resourceId": 1,
        "conflicts": []
      }
    ]
  }
]
```

In the example above, resource 2 (Lane 1) is blocked by resource 1 (Pool). So its `slots` array contains both Lane 1 slots and Pool slots. The Pool's "Aqua Aerobics Class" appears in Lane 1's slots because it affects Lane 1's availability.

### `POST /slots`

Creates a new slot. Should validate the slot and **reject with 409 Conflict** if it conflicts with any existing slots.

**Request body:**

```json
{
  "name": "New Booking",
  "start": "2026-02-23T08:00:00",
  "end": "2026-02-23T09:00:00",
  "resourceId": 2
}
```

**Response (201):** the created `SlotDto` with its `conflicts` array.

**Response (409):** if the proposed slot conflicts with existing bookings. The response body includes the conflicting slots:

```json
{
  "statusCode": 409,
  "message": "Slot conflicts with existing bookings",
  "conflicts": [
    {
      "id": 2,
      "name": "Aqua Aerobics Class",
      "start": "2026-02-23T09:30:00",
      "end": "2026-02-23T11:00:00",
      "resourceId": 1,
      "conflicts": []
    }
  ]
}
```

### `PUT /slots/:slotId`

Updates the start and end times of an existing slot. Should validate the new times and **reject with 409 Conflict** if the updated times would conflict with other existing slots.

**Request body:**

```json
{
  "start": "2026-02-23T10:00:00",
  "end": "2026-02-23T11:30:00"
}
```

**Response (200):** the updated `SlotDto` with its `conflicts` array.

**Response (409):** if the new times conflict with existing bookings. The response body includes the conflicting slots (same shape as the POST 409 response).

---

## What's Already Done

- NestJS project scaffolded (`server/`)
- SQLite database connected via TypeORM
- Entities defined: `Resource`, `Slot`, `BlockingDependency`
- DTOs: `CreateSlotDto`, `UpdateSlotTimesDto`, `SlotDto` (includes `conflicts: SlotDto[]`), `ResourceSlotsDto` (includes `resourceId` and `slots: SlotDto[]`), `BySlotIdDto`
- Controller wired: `GET /slots`, `POST /slots`, `PUT /slots/:slotId`
- Service stubs: `getSlots()`, `addSlot()`, `updateSlot()` — need conflict detection logic
- Auto-seed on startup: database file is deleted, recreated, and seeded every time the server starts
- Standalone seed script: `npm run seed` — also available for manual use
- E2E test suite covering all three endpoints
- Empty `client/` folder for future frontend

---

## What Needs To Be Done

### Step 1 — Implement `SlotsService` methods

File: `server/src/slots/slots.service.ts`

The three service methods are currently stubs. Implement them so that:

- **`getSlots()`** returns a `ResourceSlotsDto[]` — one entry per resource, each containing today's relevant slots (own + blocking resources) with their conflicts computed.
- **`addSlot()`** creates a new slot only if it has no conflicts. Returns the saved slot on success, or responds with **409** and the conflicting slots if any exist.
- **`updateSlot()`** updates a slot's time range only if the new range has no conflicts (excluding the slot itself). Returns the updated slot on success, or responds with **409** and the conflicting slots if any exist.

### Step 2 — Validate with Tests

Run the e2e test suite — all tests should pass:

```bash
cd server
npm run test:e2e
```

## Running the Project

```bash
cd server

# Start the server (DB file is deleted, recreated, and seeded on each startup)
npm run start:dev

# Run e2e tests (DB file is deleted, recreated, and seeded before tests)
npm run test:e2e

# Manual seed (optional, for standalone use)
npm run seed
```
