import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

/**
 * P5 F8. Unlike app/jobs/layout.tsx and app/customers/layout.tsx, this layout
 * guards on session presence only — NOT team context. Those layouts redirect
 * to /dashboard?error=no-team when resolveTeamContext() returns null, and
 * /dashboard IS this route, so repeating that check here would redirect to
 * itself forever. dashboard/page.tsx resolves team context itself instead
 * and renders an inline error Card when it's missing.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
