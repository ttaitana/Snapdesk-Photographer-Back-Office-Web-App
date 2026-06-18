import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { resolveTeamContext } from "@snapdesk/core";
import { AppShell } from "@/components/app-shell";

/**
 * Shared shell for every /finance/* route (expenses CRUD + summary — P6 F7,
 * TASKS.md). Same session + team-context guard as app/customers/layout.tsx.
 */
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
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
