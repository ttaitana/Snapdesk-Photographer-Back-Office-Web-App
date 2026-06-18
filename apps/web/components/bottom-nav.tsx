"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { BOTTOM_NAV_LINKS } from "./nav-links";
import { QUICK_ADD_ITEMS } from "./quick-add-items";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Mobile-only bottom nav — P5 F8 (TASKS.md: "responsive: bottom nav (mobile)
 * / sidebar (desktop)"). Fixed to the viewport bottom and hidden md: and up
 * (SidebarNav takes over there). AppShell adds matching bottom padding on
 * <main> so page content never sits underneath this bar.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t-2 border-ink bg-card px-2 py-2 md:hidden">
        {BOTTOM_NAV_LINKS.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-muted-foreground"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-accent text-accent-foreground">
            <Plus className="h-4 w-4" />
          </span>
          เพิ่ม
        </button>
      </nav>

      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มใหม่</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            {QUICK_ADD_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setQuickAddOpen(false)}
                  className="flex items-center gap-3 rounded-md border-2 border-ink p-3 text-sm font-medium text-ink hover:bg-secondary"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
