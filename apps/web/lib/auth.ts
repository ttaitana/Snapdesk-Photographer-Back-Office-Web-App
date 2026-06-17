import { createAuth } from "@snapdesk/auth";

import { env } from "./env";

/**
 * Server-only Better Auth singleton. This is the one place in apps/web that
 * reads process.env (via lib/env.ts) and hands concrete values into
 * @snapdesk/auth's createAuth() — packages/auth itself never touches
 * process.env directly (see packages/auth/README.md and the ESLint
 * dependency-boundary rule that blocks packages/* importing from apps/*).
 *
 * Do NOT import this file from a "use client" component — it pulls in
 * @snapdesk/db (Prisma) via @snapdesk/auth's server entrypoint. Client
 * components should import from "@snapdesk/auth/client" instead (see
 * apps/web/lib/auth-client.ts for a same-app re-export).
 */
export const auth = createAuth({
  secret: env.AUTH_SECRET,
  baseURL: env.APP_URL,

  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),

  ...(env.MS_CLIENT_ID && env.MS_CLIENT_SECRET
    ? {
        microsoft: {
          clientId: env.MS_CLIENT_ID,
          clientSecret: env.MS_CLIENT_SECRET,
          tenantId: env.MS_TENANT_ID,
        },
      }
    : {}),

  // RESEND_API_KEY is optional in lib/env.ts so the app still boots without
  // it (see the comment there) — if it's unset, invite emails will throw
  // when actually sent (packages/auth/src/email/invite-email.ts), not here.
  resend: {
    apiKey: env.RESEND_API_KEY ?? "",
    emailFrom: env.EMAIL_FROM,
  },
});
