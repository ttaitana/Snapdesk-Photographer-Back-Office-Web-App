import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { resolveTeamContext } from "@snapdesk/core";
import { AppShell } from "@/components/app-shell";

/**
 * Shared shell for every /team/* page (settings, members, switcher — tasks
 * #22/#24/#26). Resolves the session + active team ONCE here and redirects
 * before rendering any child route, so individual pages don't each need
 * their own "no session" / "no team" guard clauses — they can assume both
 * exist (though they still re-fetch the context themselves since Next.js
 * layouts can't pass data down to page props; see resolveTeamContext's own
 * doc comment on why it re-checks DB membership rather than trusting the
 * session cookie).
 */
export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const context = await resolveTeamContext({
    userId: session.user.id,
    activeTeamId: session.session.activeOrganizationId,
  });
  if (!context) {
    redirect("/dashboard?error=no-team");
  }

  return <AppShell>{children}</AppShell>;
}
