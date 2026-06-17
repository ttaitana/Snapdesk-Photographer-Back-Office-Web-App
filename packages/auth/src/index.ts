// Server-only entry point. Deliberately does NOT re-export client.ts here:
// that file pulls in "better-auth/react", and bundling it together with
// this file (which pulls in @snapdesk/db / Prisma) would let server-only
// code leak into client bundles. Import client hooks from
// "@snapdesk/auth/client" instead (see package.json's "./*" export map).
export { createAuth, type Auth, type CreateAuthConfig } from "./auth";
export { toTeam, toTeamMember, toTeamInvite } from "./team-mapping";
