import { headers } from "next/headers";
import { requireTeamContext, type TeamContext } from "@snapdesk/core";

import { auth } from "./auth";

/**
 * Server-only helper for thin Server Actions (P2 — TASKS.md).
 *
 * Resolves session + active TeamContext the same way every team-scoped page
 * already does (see app/team/settings/page.tsx), but throws instead of
 * redirecting — Server Actions are usually invoked from client-side
 * mutations (e.g. a TanStack Query `mutationFn`), where a thrown error
 * surfaces through `onError`/`isError` rather than a page navigation.
 *
 * Every action in app/customers/actions.ts, app/jobs/actions.ts, and
 * app/jobs/payments-actions.ts calls this first and passes the resulting
 * context into the matching @snapdesk/core service — never a client-
 * supplied teamId.
 */
export async function requireActionContext(): Promise<TeamContext> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("กรุณาเข้าสู่ระบบ");
  }

  return requireTeamContext({
    userId: session.user.id,
    activeTeamId: session.session.activeOrganizationId,
  });
}

/**
 * P9 — Calendar Sync. Same session check as requireActionContext, but skips
 * requireTeamContext entirely — calendar connections are a PERSONAL resource
 * keyed by userId alone, not team-scoped (see packages/core/src/calendar-sync's
 * file header). Used only by app/team/integrations/actions.ts; every other
 * action in this app is team-scoped and should keep using
 * requireActionContext above.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("กรุณาเข้าสู่ระบบ");
  }
  return session.user.id;
}
