import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

/**
 * Catch-all route for every Better Auth endpoint (sign-in, sign-up,
 * sign-out, OAuth callbacks, organization/invite endpoints, etc.) — Better
 * Auth's client (@snapdesk/auth/client) talks to this same-origin path by
 * default. See lib/auth.ts for where secrets/config actually come from.
 */
export const { GET, POST } = toNextJsHandler(auth);
