---
name: Add Prisma ORM
overview: Add Prisma ORM to the project with a Postgres datasource (e.g. Supabase), an AuiTurn model for turn storage, and a singleton client suitable for Next.js. This sets up type-safe DB access and makes the planned turn-storage fix use Prisma instead of a raw Supabase server client.
todos: []
isProject: false
---

# Add Prisma ORM to the project

## Scope

- Install and configure Prisma with Postgres.
- Define the `AuiTurn` model (for AUI agent turn storage) so it’s ready to use in [lib/aui-turns.ts](lib/aui-turns.ts).
- Add a singleton Prisma Client for Next.js (avoid multiple instances in dev).
- Document `DATABASE_URL` (Supabase Postgres or any Postgres).

## 1. Install Prisma

```bash
npm install prisma @prisma/client
```

- `prisma` (CLI, typically devDep): migrations, generate, studio.
- `@prisma/client` (dep): generated client used at runtime in API routes.

Add `prisma` to `devDependencies` if you prefer the CLI only in dev.

## 2. Initialize Prisma

```bash
npx prisma init
```

This creates:

- `**prisma/schema.prisma**` – datasource and generator (and models).
- `**.env**` – Prisma will add `DATABASE_URL`; the project already has `.env.template`, so add `DATABASE_URL` there and keep actual values in `.env` (gitignored).

## 3. Schema configuration

`**prisma/schema.prisma`:

- **Datasource:** `provider = "postgresql"`, `url = env("DATABASE_URL")`. For Supabase: use the **direct** connection string (Settings → Database → Connection string → Direct; not the pooler unless you add `?pgbouncer=true` and use Prisma’s pooling docs for your setup).
- **Generator:** `provider = "prisma-client-js"`.

**Model for turn storage** (aligned with [lib/aui-turns.ts](lib/aui-turns.ts) and the turn-storage plan):

```prisma
model AuiTurn {
  turnId    String   @id @map("turn_id")
  runtimeId String   @map("runtime_id")
  mode      String   // "plan" | "build"
  message   String   @db.Text
  status    String   // "queued" | "running" | "completed" | "failed"
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  result    Json?    @db.JsonB
  error     String?  @db.Text

  @@map("aui_turns")
}
```

Using `@@map("aui_turns")` keeps the table name consistent with the earlier plan. `createdAt`/`updatedAt` are `DateTime`; when reading in `getTurn` you’ll map to the existing `AUIStoredTurn` shape (`createdAt`/`updatedAt` as numbers via `.getTime()` if the API expects that).

## 4. Environment variable

- `**.env.template`: add `DATABASE_URL=` with a short comment (e.g. “Postgres connection string; use Supabase direct URL if using Supabase Postgres”).
- **Local:** set `DATABASE_URL` in `.env` to your Supabase (or other Postgres) direct URL.

## 5. Prisma Client singleton (Next.js)

Create `**lib/db.ts**` (or `lib/prisma.ts`):

- Import `PrismaClient` from `@prisma/client`.
- In development, attach to `globalThis` and reuse the same instance (avoid “too many connections” and multiple clients during HMR). Pattern:

```ts
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- Use `import { prisma } from '@/lib/db'` in API routes and in [lib/aui-turns.ts](lib/aui-turns.ts) when you switch turn storage to Prisma.

## 6. First migration and generate

- Run `npx prisma migrate dev --name add_aui_turns` to create the migration and table.
- Run `npx prisma generate` (migrate dev runs it automatically). Commit `prisma/migrations/` and `prisma/schema.prisma`.

## 7. Optional: npm scripts

In `**package.json**` add:

- `"db:generate": "prisma generate"`
- `"db:migrate": "prisma migrate dev"`
- `"db:studio": "prisma studio"`

so the team can run generate/migrate/studio without remembering the full `npx prisma` commands.

## 8. Integration with turn storage (next step)

After this is in place, [lib/aui-turns.ts](lib/aui-turns.ts) can be refactored to:

- Use `prisma` from `@/lib/db` when `DATABASE_URL` (or a feature flag) is set.
- `createTurn` → `prisma.auiTurn.create({ data: { ... } })`.
- `markTurnRunning` / `markTurnCompleted` / `markTurnFailed` → `prisma.auiTurn.update({ where: { turnId }, data: { ... } })`.
- `getTurn` → `prisma.auiTurn.findUnique({ where: { turnId } })` and map the row to `AUIStoredTurn` (camelCase, optional `createdAt`/`updatedAt` as numbers). Return `undefined` if not found.

That refactor is a separate change; this plan only adds Prisma and the `AuiTurn` model so that refactor is straightforward.

## Summary

| Step      | Action                                                                               |
| --------- | ------------------------------------------------------------------------------------ |
| Install   | `prisma`, `@prisma/client`                                                           |
| Init      | `npx prisma init` → `prisma/schema.prisma`, `.env`                                   |
| Schema    | Postgres datasource + `AuiTurn` model with `@@map("aui_turns")`                      |
| Env       | `DATABASE_URL` in `.env.template` and `.env` (Supabase direct URL or other Postgres) |
| Singleton | `lib/db.ts` exporting `prisma` with global reuse in dev                              |
| Migrate   | `npx prisma migrate dev --name add_aui_turns`                                        |
| Scripts   | Optional: `db:generate`, `db:migrate`, `db:studio`                                   |

No changes to API routes or [lib/aui-turns.ts](lib/aui-turns.ts) in this step; those come when you implement the Supabase/Prisma-backed turn storage using this client and model.
