# syntax=docker/dockerfile:1
#
# apps/worker production image (P10 task #8, TASKS.md). Build from the
# MONOREPO ROOT — see docker-compose.yml's `context: .` /
# `dockerfile: apps/worker/Dockerfile`, same reasoning as apps/web/Dockerfile.
#
# Unlike apps/web there's no Next-style "standalone" trace step for a plain
# tsx process, so this image just ships the installed monorepo as-is
# (including devDependencies — tsx itself is one, per apps/worker/package.json
# "start": "tsx src/index.ts"). Heavier than strictly necessary; an easy
# follow-up would be compiling to plain JS with tsc/tsup and dropping
# devDependencies, but that's unverified extra surface this pass didn't add.
#
# Also reused as-is by docker-compose.yml's one-off `migrate` service
# (`pnpm --filter @snapdesk/db migrate:deploy`) — it already has the whole
# repo + pnpm installed, which the apps/web image's pruned runner stage
# does not.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/integrations/package.json packages/integrations/package.json
COPY packages/queue/package.json packages/queue/package.json
COPY packages/tax-th/package.json packages/tax-th/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
# Needed for `pnpm --filter @snapdesk/db migrate:deploy` (the migrate
# service) and for @snapdesk/db's generated client that apps/worker imports
# at runtime. A real DATABASE_URL is supplied at container start by
# docker-compose.yml — `prisma generate` only reads the schema, not the DB.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/snapdesk_build"
RUN pnpm db:generate

FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker
COPY --from=builder --chown=worker:nodejs /repo /repo
USER worker
CMD ["pnpm", "--filter", "@snapdesk/worker", "start"]
