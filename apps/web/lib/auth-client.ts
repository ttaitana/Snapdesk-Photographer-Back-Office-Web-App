/**
 * Same-app convenience re-export of @snapdesk/auth/client, so app code can
 * write `from "@/lib/auth-client"` like every other app-local module instead
 * of reaching across the package boundary directly. No logic lives here —
 * see packages/auth/src/client.ts for the real implementation and why it's
 * kept separate from the server entrypoint (lib/auth.ts).
 */
export {
  authClient,
  useSession,
  signIn,
  signUp,
  signOut,
  linkSocial,
  unlinkAccount,
  organizationApi,
  useActiveOrganization,
  useListOrganizations,
} from "@snapdesk/auth/client";
