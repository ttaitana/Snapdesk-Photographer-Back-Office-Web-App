import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { resolveTeamContext } from "@snapdesk/core";
import { AppShell } from "@/components/app-shell";

/**
 * Shared shell for every /customers/* route (list, create/edit, detail — P3
 * "F5 CRM" tasks #11-#12). Same session + team-context guard as
 * app/jobs/layout.tsx, so individual customer pages can assume both already
 * exist.
 */
export default async function CustomersLayout({ children }: { children: React.ReactNode }) {
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
