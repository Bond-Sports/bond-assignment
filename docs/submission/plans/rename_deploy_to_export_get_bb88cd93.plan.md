---
name: Rename deploy to export GET
overview: Move the export endpoint from `POST /api/sessions/[id]/deploy` to `GET /api/sessions/[id]/export` with proper REST semantics, then update the frontend caller.
todos:
  - id: create-export-route
    content: Create `src/app/api/sessions/[id]/export/route.ts` as a GET handler with the archive logic
    status: completed
  - id: delete-deploy-route
    content: Delete `src/app/api/sessions/[id]/deploy/route.ts`
    status: completed
  - id: update-frontend-fetch
    content: Update the fetch call in `app-shell.tsx` to use GET on `/api/sessions/{id}/export`
    status: completed
isProject: false
---

# Rename deploy route to GET /sessions/{id}/export

This is a retrieval-only operation (archive the project and return bytes). It should be a GET on a noun resource, not a POST on a verb path.

### 1. Create new route file

**New file:** `src/app/api/sessions/[id]/export/route.ts`

Move the handler from the deploy route, changing `export async function POST` to `export async function GET`. The `_request` param stays as `NextRequest` (unused but required by Next.js route signature).

### 2. Delete old route

**Delete:** `src/app/api/sessions/[id]/deploy/route.ts`

### 3. Update frontend

**File:** [src/components/app-shell.tsx](src/components/app-shell.tsx) line 178

Change:

```typescript
const res = await fetch(`/api/sessions/${session.id}/deploy`, {
  method: "POST",
});
```

to:

```typescript
const res = await fetch(`/api/sessions/${session.id}/export`);
```

GET is the default fetch method, so no `method` option needed.
