# Deployment

P10 task #8 (TASKS.md): "deploy (web + worker + Postgres + Redis)". This
covers two paths — self-hosting the whole stack with Docker, or splitting
it across managed platforms. Neither has been deployed to a live, internet-
reachable environment as part of producing this guide — there's no hosting
account/credentials available here. What follows is a deployment-ready
config, written and reasoned through carefully, but **the Docker images
have not been built or run** (no Docker daemon in this environment either).
Run `docker compose build` yourself before trusting this in production, and
treat the steps below as a starting point to verify, not a guarantee.

## Option A — self-hosted, Docker Compose

Everything (`web`, `worker`, `postgres`, `redis`, plus a one-off `migrate`
step) is wired up in `docker-compose.yml` at the repo root.

```bash
cp .env.example .env        # fill in real secrets — see below
docker compose build
docker compose up -d
docker compose logs -f web worker   # watch both come up
```

`web` becomes reachable at `http://<host>:3000`. `migrate` runs
`prisma migrate deploy` (non-interactive — unlike local dev's
`prisma migrate dev`) and exits; both `web` and `worker` wait for it to
succeed before starting, via Compose's `service_completed_successfully`
condition, so a fresh stack never serves traffic against an un-migrated
database.

### Env vars in this setup

`docker-compose.yml` reads `.env` for everything (Resend, OAuth client
secrets, `AUTH_SECRET`, etc. — see `.env.example`), but **overrides**
`DATABASE_URL`/`REDIS_URL` to point at the in-compose `postgres`/`redis`
service hostnames instead of whatever `.env` has for local dev
(`localhost`), since `localhost` inside a container doesn't reach the host
or sibling containers. Don't remove that override unless you're pointing at
an external Postgres/Redis instead of the bundled ones.

Set `APP_URL` to your real public URL (used for OAuth redirect URLs and
links in transactional email) before going live — it defaults to
`http://localhost:3000` otherwise.

### Updating / redeploying

```bash
git pull
docker compose build
docker compose up -d   # migrate re-runs; no-ops if there's nothing pending
```

### Backups

`postgres` and `redis` data live in the named volumes
`snapdesk-postgres-data` / `snapdesk-redis-data`. Redis here is only a job
queue (BullMQ) — losing it loses in-flight background jobs, not customer
data, so back up Postgres and treat Redis as disposable. A simple approach:

```bash
docker compose exec postgres pg_dump -U snapdesk snapdesk > backup-$(date +%F).sql
```

## Option B — managed platforms (no server to maintain)

`apps/web` is a standard Next.js app and deploys to Vercel without the
Docker image at all (Vercel builds it directly from the repo). `apps/worker`
is a long-running process — it long-polls Redis via BullMQ — so it needs a
platform that runs persistent background services, not a serverless
function platform. Reasonable split:

- **apps/web → Vercel.** Set the project root to `apps/web`, or use a
  monorepo-aware import (Vercel auto-detects Turborepo). Set every env var
  from `.env.example` in the Vercel project settings, pointing `DATABASE_URL`
  and `REDIS_URL` at your managed Postgres/Redis (below).
- **apps/worker → Railway / Render / Fly.io** (anything that runs a
  `pnpm --filter @snapdesk/worker start`-style background worker, not just
  HTTP request/response functions). The `apps/worker/Dockerfile` in this
  repo works as-is for any of these if the platform builds from a
  Dockerfile; otherwise point its build command at
  `pnpm install --frozen-lockfile && pnpm db:generate` and start command at
  `pnpm --filter @snapdesk/worker start`.
- **Postgres + Redis** → a managed instance from the same platform as the
  worker (Railway/Render both offer both), or Neon/Supabase for Postgres and
  Upstash for Redis if you want them decoupled from the worker's host.
  Whichever you pick, run `pnpm --filter @snapdesk/db migrate:deploy` once
  against the real `DATABASE_URL` before the first deploy goes live (Vercel
  build hooks or a one-off Railway/Render job both work for this).

Either way, the database migration step is the one manual gate to remember:
**run `migrate:deploy` (not `migrate dev`) before traffic hits a new
environment**, and again after every schema change.

## Secrets

Never commit `.env` (it's already in `.gitignore`). For Option A, keep a
real `.env` only on the host running `docker compose` (or load it from
whatever secret store your host provides). For Option B, use the
platform's own secret/env-var store — don't put real secrets in
`.env.example` or anywhere in the repo.

## Health checks

`postgres`/`redis` have Compose healthchecks already (`pg_isready` /
`redis-cli ping`). There's no `/api/health` route in `apps/web` yet — if
your platform or load balancer needs one, the cheapest correct check is
hitting `/` (public, per `middleware.ts`'s `PUBLIC_PATHS`) and expecting a
200.
