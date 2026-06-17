import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { resolveTeamContext } from "@snapdesk/core";
import { AppShell } from "@/components/app-shell";

/**
 * Shared shell for every /jobs/* route (list, calendar, detail, create/edit
 * — P3 tasks #7-#10). Same session + team-context guard as
 * app/team/layout.tsx, so individual job pages can assume both already
 * exist instead of each re-checking "no session"/"no team".
 */
export default async function JobsLayout({ children }: { children: React.ReactNode }) {
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
