# @snapdesk/db

Prisma schema (source of truth) + a singleton `PrismaClient` export.

## Usage

```ts
import { prisma } from "@snapdesk/db";

await prisma.team.findMany();
```

## Commands (run from repo root)

```bash
pnpm db:generate   # prisma generate
pnpm db:migrate    # prisma migrate dev
pnpm db:studio     # prisma studio
```

Requires `DATABASE_URL` in `.env` at the repo root (see `.env.example`).

## Adding models

Add new models directly to `prisma/schema.prisma` following the phase order
noted at the top of that file, then run `pnpm db:migrate` to create a
migration. Never query `prisma` directly from `apps/web` route
handlers/components — go through `@snapdesk/core` services so every query
stays scoped by `teamId`.
