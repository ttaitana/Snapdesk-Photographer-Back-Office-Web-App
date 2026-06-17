# Snapdesk — Photographer Back-Office

Quotation, payment tracking, shooting schedule, income/tax summary, and QR work-delivery for photographers. See `SPEC.md` for the full design/architecture spec and `TASKS.md` for the build backlog (P0–P10).

## Stack

pnpm workspaces + Turborepo · Next.js 16 (App Router, React 19) · TypeScript · Prisma/PostgreSQL · Tailwind + shadcn/ui · zod

> Originally scaffolded against Next.js 14 per SPEC.md; upgraded to 16 before
> real feature work started (14 hit EOL Oct 2025). One consequence for future
> phases: `params`, `searchParams`, `cookies()`, and `headers()` must all be
> `await`ed — synchronous access was removed in Next 16.

## Structure

```
apps/web        Next.js app
packages/core   domain/service layer (never imports apps/*)
packages/types  shared zod schemas
packages/db     Prisma client + schema
```

## Setup

```bash
nvm use              # Node 22, see .nvmrc
corepack enable
pnpm install
cp .env.example .env # fill in DATABASE_URL at minimum
pnpm db:generate
pnpm dev              # http://localhost:3000
```

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm build
```

All three run through Turborepo across every package. CI (`.github/workflows/ci.yml`) runs the same three on every push/PR.
