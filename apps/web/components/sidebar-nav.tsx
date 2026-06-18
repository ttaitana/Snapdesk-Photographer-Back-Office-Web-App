"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_LINKS } from "./nav-links";
import { cn } from "@/lib/utils";

/**
 * Desktop-only sidebar nav — P5 F8 (TASKS.md: "responsive: bottom nav
 * (mobile) / sidebar (desktop)"). Visible md: and up; BottomNav covers small
 * screens instead (see that component — it only carries a 4-link subset).
 */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden w-48 shrink-0 flex-col gap-1 md:flex">
      {NAV_LINKS.map((link) => {
        const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium",
              active
                ? "border-2 border-ink bg-accent text-accent-foreground shadow-hard-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
