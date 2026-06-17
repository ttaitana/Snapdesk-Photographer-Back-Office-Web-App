import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { TeamNav } from "@/app/team/team-nav";
import { TeamSwitcher } from "@/app/team/team-switcher";

/**
 * Shared header + nav chrome for every logged-in section (team/*, jobs/* —
 * P3 onward). Originally built inline inside app/team/layout.tsx (P1); P3
 * pulls it out here so new top-level sections (jobs, customers, ...) don't
 * re-paste the same header markup. Callers still do their own session/team
 * guard before rendering this — it has no auth logic of its own.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
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
