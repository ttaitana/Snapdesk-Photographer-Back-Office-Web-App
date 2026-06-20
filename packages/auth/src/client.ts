import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

/**
 * No `baseURL` passed — Better Auth's client defaults to same-origin
 * relative requests, which is correct as long as the route handler lives at
 * `/api/auth/[...all]` inside the same Next.js app that imports this
 * client (apps/web). If a second app ever needs this client (e.g. a future
 * apps/worker dashboard), pass `baseURL` explicitly there instead of
 * changing this default.
 */
export const authClient = createAuthClient({
  // `schema.organization.additionalFields` must mirror the server-side
  // organization({ schema: { organization: { additionalFields: ... } } })
  // config in packages/auth/src/auth.ts — the client plugin only infers
  // businessName/taxId into organizationApi.update()'s `data` type (and
  // ActiveOrganization/$Infer types) when told about them here too; better
  // Auth does not introspect the server config at the type level.
  plugins: [
    organizationClient({
      schema: {
        organization: {
          additionalFields: {
            businessName: { type: "string", required: false, input: true },
            taxId: { type: "string", required: false, input: true },
            revenueBasis: {
              type: "string",
              required: false,
              input: true,
              defaultValue: "cash",
            },
          },
        },
      },
    }),
  ],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  // P9 — Calendar Sync (F4). Both are core better-auth client methods (not
  // plugin-gated — see account.mjs's /link-social and /unlink-account
  // routes), so no plugin registration was needed above, just exposing
  // them here. Settings → Integrations page calls:
  //   linkSocial({ provider: "google" | "microsoft", scopes: CALENDAR_OAUTH_SCOPES[provider], callbackURL: "/settings/integrations" })
  // to connect, and unlinkAccount({ providerId: provider }) to disconnect —
  // see @snapdesk/integrations' CALENDAR_OAUTH_SCOPES for the scopes
  // constant and packages/core/src/calendar-sync's disconnectProvider for
  // why that core function deliberately does NOT call unlinkAccount itself
  // (this package can't import @snapdesk/auth, so the Settings page Server
  // Action must call both).
  linkSocial,
  unlinkAccount,
} = authClient;

/** `authClient.organization.*` — create/update team, invite/remove members,
 * accept invitations, switch active team (`setActive`). Exported as its own
 * binding since "organization" reads oddly next to this project's "team"
 * vocabulary; callers should prefer the team service in `@snapdesk/core`
 * once it exists (P1 task: team-context resolver) rather than calling this
 * directly from UI components. */
export const organizationApi = authClient.organization;
export const useActiveOrganization = authClient.useActiveOrganization;
export const useListOrganizations = authClient.useListOrganizations;
