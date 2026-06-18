import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { TeamSwitcher } from "@/app/team/team-switcher";
import { SidebarNav } from "@/components/sidebar-nav";
import { BottomNav } from "@/components/bottom-nav";

/**
 * Shared header + nav chrome for every logged-in section (team/*, jobs/* —
 * P3 onward). Callers still do their own session/team guard before
 * rendering this — it has no auth logic of its own.
 *
 * P5 F8 (TASKS.md: "responsive: bottom nav (mobile) / sidebar (desktop)").
 * SidebarNav renders md: and up; BottomNav is fixed and md:hidden — see
 * those two components for why their link sets differ (replaces the old
 * flat TeamNav, which had no responsive behavior at all). pb-24 on <main>
 * on small screens keeps page content clear of the fixed bottom nav.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen bg-bg p-6 pb-24 md:p-10 md:pb-10">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <Link href="/dashboard" className="font-heading text-3xl uppercase text-ink md:text-4xl">
            Snapdesk
          </Link>
          <div className="flex items-center gap-3">
            <TeamSwitcher />
            <LogoutButton />
          </div>
        </header>

        <div className="flex gap-6">
          <SidebarNav />
          <div className="min-w-0 flex-1 space-y-6">{children}</div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
