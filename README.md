# Snapdesk — Photographer Back-Office

A secretary-in-a-box for photographers: shooting-schedule queue, quotations,
deposit/balance payment tracking with automatic withholding-tax calculation,
income/tax summaries, work history, and QR-code work delivery links for
customers. See `SPEC.md` for the full design/architecture spec and
`TASKS.md` for the build backlog (P0–P10, the phase plan this app was built
against).

## Stack

pnpm workspaces + Turborepo · Next.js 16 (App Router, React 19) · TypeScript
· Prisma/PostgreSQL · Redis + BullMQ (background jobs) · Better Auth ·
Tailwind + shadcn/ui · zod

> Originally scaffolded against Next.js 14 per SPEC.md; upgraded to 16 before
> real feature work started (14 hit EOL Oct 2025). One consequence for future
> phases: `params`, `searchParams`, `cookies()`, and `headers()` must all be
> `await`ed — synchronous access was removed in Next 16.
>
> SPEC.md also says "Auth.js (NextAuth)" for auth — switched to Better Auth
> (the Auth.js team's own successor project) before writing any P1 code; see
> the note at the top of `packages/db/prisma/schema.prisma`.

## Structure

```
apps/web              Next.js app — everything the photographer/customer sees
apps/worker           BullMQ worker process — reminders, QR-scan webhooks, calendar sync
packages/core         domain/service layer (never imports apps/*)
packages/types        shared zod schemas (runtime validation + inferred TS types)
packages/db           Prisma client + schema, migrations
packages/auth         Better Auth config shared by apps/web and apps/worker
packages/queue        BullMQ queue/worker factory + queue name constants
packages/integrations Google/Microsoft Calendar + Drive/OneDrive clients
packages/tax-th       Thailand PIT/VAT/WHT calculation rules
```

## Prerequisites

- Node 22 (see `.nvmrc`) and pnpm 9.12.0 (see `packageManager` in `package.json`)
- A running PostgreSQL instance
- A running Redis instance (only needed for `apps/worker` and any feature
  that enqueues a background job — shoot reminders, calendar sync, QR-scan
  webhooks; the rest of the app works without it)

Don't have Postgres/Redis installed locally? The quickest path is Docker:

```bash
docker run -d --name snapdesk-pg -e POSTGRES_PASSWORD=pass -e POSTGRES_USER=user \
  -e POSTGRES_DB=snapdesk -p 5432:5432 postgres:16
docker run -d --name snapdesk-redis -p 6379:6379 redis:7
```

(`docker-compose.yml` for the full stack — web + worker + Postgres + Redis —
is covered separately; see the **Deployment** section below.)

## Setup

```bash
nvm use                # Node 22, see .nvmrc
corepack enable        # gives you the exact pnpm version package.json pins
pnpm install
cp .env.example .env    # fill in DATABASE_URL at minimum — see "Environment variables" below
pnpm db:generate        # generates the Prisma client (packages/db)
pnpm db:migrate         # applies migrations to DATABASE_URL (dev only — see note below)
pnpm dev                # turbo runs apps/web (:3000) AND apps/worker together
```

Open http://localhost:3000. The first account you register becomes the
owner of a new team (organization).

`pnpm db:migrate` runs `prisma migrate dev`, which is interactive/dev-only —
it can prompt to reset the database if it detects drift. For CI or a
production deploy, use `pnpm --filter @snapdesk/db migrate:deploy` instead
(non-interactive, applies pending migrations only — see **Deployment**).

### Environment variables

`.env.example` is the single source of truth and is commented inline with
where each value is used and how to obtain it (Resend API keys, Google/MS
OAuth client setup, etc.) — copy it to `.env` rather than duplicating that
list here. At minimum, a local dev loop needs:

- `DATABASE_URL` — required to do anything
- `AUTH_SECRET` — required for login to work (`openssl rand -base64 32`)
- `REDIS_URL` — only required to run `apps/worker`; apps/web runs without it,
  but anything that enqueues a job (shoot reminders, calendar sync) will
  silently no-op without a worker consuming it

Everything else (Resend, Google, Microsoft, file storage) is optional and
gates a specific integration — the app runs without them, just with that
feature's UI hidden or disabled (see `apps/web/lib/env.ts` for exactly which
flags gate which features).

Both `apps/web` (via Next.js's built-in env loading) and `apps/worker` (via
`dotenv`, since a plain `tsx` process has no framework to do that for it)
read from the same root `.env` file — there's no separate `apps/web/.env`.

## Available scripts

Run from the repo root; Turborepo fans each out to every workspace package
that defines it.

| Script | What it does |
| --- | --- |
| `pnpm dev` | Runs every package's `dev` task (apps/web + apps/worker) |
| `pnpm build` | Production build of every package |
| `pnpm lint` / `pnpm lint:fix` | ESLint across the monorepo |
| `pnpm typecheck` | `tsc --noEmit` across the monorepo |
| `pnpm test` | Runs test suites where defined |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm db:generate` | Regenerate the Prisma client after a schema change |
| `pnpm db:migrate` | Create + apply a dev migration (interactive) |
| `pnpm db:studio` | Open Prisma Studio against `DATABASE_URL` |

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm build
```

All three run through Turborepo across every package. CI
(`.github/workflows/ci.yml`) runs the same three on every push/PR, against a
dummy `DATABASE_URL` (real secrets are injected at deploy time, not in CI).

## Progressive Web App

`apps/web` ships a manifest + service worker (`apps/web/public/sw.js`,
registered by `<RegisterServiceWorker>` in the root layout) so it can be
installed to a home screen and shows a cached "today's queue" at `/offline`
when the network is unreachable mid-shoot. See task #1 in `TASKS.md` for
what's cached and what isn't (this is a queue-viewing fallback, not full
offline editing).

## Deployment

See `DEPLOYMENT.md` for running the full stack (web + worker + Postgres +
Redis) via Docker, plus notes on what each service needs in production
(migrations on deploy, persistent Redis for the queue, etc.).

## Further reading

- `SPEC.md` — product spec: features, data model, UX rules (e.g. the
  "3-tap rule" for the most frequent flows), visual style
- `TASKS.md` — phase-by-phase build backlog (P0–P10) this app was built
  against, with checkboxes for what's done
