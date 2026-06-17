import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { resolveTeamContext } from "@snapdesk/core";
import { LogoutButton } from "@/components/logout-button";
import { TeamNav } from "./team-nav";
import { TeamSwitcher } from "./team-switcher";

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

  return (
    <main className="relative min-h-screen bg-bg p-6 md:p-10">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <Link href="/dashboard" className="font-heading text-3xl uppercase text-ink md:text-4xl">
            Snapdesk
          </Link>
          <div className="flex items-center gap-3">
            <TeamSwitcher />
            <LogoutButton />
          </div>
        </header>

        <TeamNav />

        {children}
      </div>
    </main>
  );
}
