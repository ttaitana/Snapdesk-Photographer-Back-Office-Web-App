# @snapdesk/auth

Better Auth configuration — login/session/OAuth + the `organization` plugin
(renamed to Team/TeamMember/TeamInvite). See `packages/db/prisma/schema.prisma`
for the full set of naming decisions baked into this package (why Better Auth
instead of Auth.js, why role strings are lowercase, why `activeOrganizationId`
lives on the session, etc.) — that schema file is the canonical explanation,
this README just points at it so the reasoning isn't duplicated/drifted.

## Rule (same boundary as `packages/core`/`packages/db`/`packages/types`)

This package must never import from `apps/*`. It takes everything it needs
(secret, base URL, OAuth credentials, Resend API key) as plain config passed
in by the caller — `apps/web` is the only place that reads `process.env`
(via `apps/web/lib/env.ts`) and wires that into `createAuth(...)`.

## Structure

```
src/
  auth.ts           # createAuth(config) — the betterAuth() instance factory
  client.ts         # createAuthClientFor(...) — React hooks (useSession, signIn, organization client plugin)
  team-mapping.ts   # translates Better Auth's organization/member/invitation
                     # field names (organizationId, logo, ...) into this
                     # project's Team/TeamMember/TeamInvite shape from
                     # @snapdesk/types — nothing outside this package (or
                     # @snapdesk/core, which calls into it) should ever see
                     # Better Auth's raw field names.
  email/
    invite-email.ts # Resend-backed sendInvitationEmail implementation + HTML template
  index.ts
```

`apps/web` calls `createAuth({ secret, baseURL, google, microsoft, resend })`
once (e.g. in `lib/auth.ts`) and re-exports the resulting singleton for the
`/api/auth/[...all]` route handler, middleware, and server components to
import.

## Two entry points — don't mix them

- `@snapdesk/auth` (`src/index.ts`) — server-only. Pulls in `@snapdesk/db`
  (Prisma). Import from server components, route handlers, middleware.
- `@snapdesk/auth/client` (`src/client.ts`) — pulls in `better-auth/react`.
  Import from `"use client"` components only.

These are kept as separate files/exports on purpose: re-exporting both from
one barrel would let the Prisma-touching server code get pulled into client
bundles the moment any client component imports the package.
