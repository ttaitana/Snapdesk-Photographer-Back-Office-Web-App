# @snapdesk/core

Domain/service layer. Pure business logic — no Next.js, no React, no `apps/*` imports.

Rule (enforced by root `eslint.config.js`): this package may depend on
`@snapdesk/types` and `@snapdesk/db`, but **must never import from `apps/*`**.
That's what lets it move to a standalone backend later without a rewrite.

## Structure

```
src/
  team-context/   # resolve active team + membership check (P1, done)
  services/        # customers, jobs, payments — start P2
    teams/
    customers/
    jobs/
    payments/
  index.ts
```

Each service exposes plain async functions that take a Prisma client (or use
the shared `@snapdesk/db` client) and always scope queries by `teamId`.

### team-context (P1)

`resolveTeamContext({ userId, activeTeamId })` / `requireTeamContext(...)` —
re-verifies DB membership rather than trusting the session's
`activeOrganizationId` cookie value, and is the one place that turns a
Better Auth session into a `{ teamId, role }` the rest of `@snapdesk/core`
can scope queries by.

Note: this module takes plain `{ userId, activeTeamId }`, **not** a Better
Auth `Session` object — `@snapdesk/core` does not depend on `@snapdesk/auth`
at all, even though that's technically allowed by the import-boundary rule
above (auth is a package, not an app). Keeping core ignorant of *how* a
session was obtained means it stays usable from a future worker/cron context
that has no Better Auth instance in scope. The caller (apps/web — see
`apps/web/lib/auth.ts` and `auth.api.getSession(...).session.activeOrganizationId`)
does that translation.
