# @snapdesk/core

Domain/service layer. Pure business logic — no Next.js, no React, no `apps/*` imports.

Rule (enforced by root `eslint.config.js`): this package may depend on
`@snapdesk/types` and `@snapdesk/db`, but **must never import from `apps/*`**.
That's what lets it move to a standalone backend later without a rewrite.

## Structure (filled in starting P2)

```
src/
  services/
    teams/
    customers/
    jobs/
    payments/
  team-context/   # resolve active team + membership check (P1)
  index.ts
```

Each service exposes plain async functions that take a Prisma client (or use
the shared `@snapdesk/db` client) and always scope queries by `teamId`.
