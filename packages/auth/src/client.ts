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
  plugins: [organizationClient()],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
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
