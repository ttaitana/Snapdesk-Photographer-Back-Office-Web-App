# syntax=docker/dockerfile:1
#
# apps/web production image (P10 task #8, TASKS.md). Build from the
# MONOREPO ROOT, not this folder — see docker-compose.yml's
# `context: .` / `dockerfile: apps/web/Dockerfile`. apps/web depends on
# workspace packages (@snapdesk/core, @snapdesk/types, ...) via pnpm
# symlinks, so `pnpm install` needs the whole repo, not just apps/web/.
#
# Deliberately NOT using `turbo prune` for a smaller install context: this
# mirrors the exact, already-proven build command CI runs
# (.github/workflows/ci.yml: `pnpm install --frozen-lockfile` then
# `pnpm turbo run build`) rather than a second, unverified pruned-install
# path. There's no Docker daemon available to actually build/run this image
# in the environment this was written in — correctness over a leaner image.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- deps: installed once; cached as long as lockfile/manifests don't change
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

# ---- builder: full source, then the same db:generate -> build CI does
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Next needs *a* DATABASE_URL to run `prisma generate` and typecheck during
# the build — same dummy-value trick as CI (.github/workflows/ci.yml). Real
# values are injected at container start (docker-compose.yml's
# environment:), never baked into the image.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/snapdesk_build"
RUN pnpm db:generate
RUN pnpm --filter @snapdesk/web build

# ---- runner: only the traced standalone output, nothing else from the repo
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public
USER nextjs
ENV PORT=3000
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
