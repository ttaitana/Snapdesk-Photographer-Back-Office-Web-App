import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Camera, Users, Wallet, Package, Settings, UserCog, Receipt, Link2 } from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Shared nav destinations — P5 F8 (TASKS.md: "responsive: bottom nav
 * (mobile) / sidebar (desktop)"). Replaces the old flat TeamNav list
 * (app/team/team-nav.tsx, now deleted) with an icon-augmented version used
 * by both SidebarNav (desktop) and BottomNav (mobile, subset below).
 */
// Typed as a fixed-length tuple (not NavLink[]) so indexed access below
// stays `NavLink`, not `NavLink | undefined` — tsconfig has
// noUncheckedIndexedAccess on, which would otherwise flag NAV_LINKS[0].
export const NAV_LINKS: [
  NavLink, NavLink, NavLink, NavLink, NavLink, NavLink, NavLink, NavLink, NavLink
] = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/jobs", label: "คิวถ่าย", icon: Camera },
  { href: "/customers", label: "ลูกค้า", icon: Users },
  { href: "/finance", label: "การเงิน", icon: Wallet },
  { href: "/packages", label: "แพ็กเกจ", icon: Package },
  { href: "/team/tax", label: "ภาษี", icon: Receipt },
  { href: "/team/settings", label: "ตั้งค่าทีม", icon: Settings },
  { href: "/team/members", label: "สมาชิก", icon: UserCog },
  // P9 — Calendar Sync (F4): connect/disconnect Google/Outlook, pick which
  // calendars to sync into. Personal (per-user), not team data — lives under
  // /team/* anyway to reuse team/layout.tsx's session+team guard, same as
  // every other settings-ish page.
  { href: "/team/integrations", label: "การเชื่อมต่อ", icon: Link2 },
];

/**
 * Mobile bottom-nav slots. SPEC.md's IA calls for Dashboard / คิวงาน /
 * ลูกค้า / การเงิน / เพิ่ม(+) — now that P6's /finance summary page exists,
 * it takes this slot (แพ็กเกจ moved to desktop-sidebar-only, same tier as
 * ตั้งค่าทีม/สมาชิก). "เพิ่ม" isn't a route here; BottomNav renders it as a
 * button that opens QuickAddMenu instead.
 */
export const BOTTOM_NAV_LINKS: NavLink[] = [NAV_LINKS[0], NAV_LINKS[1], NAV_LINKS[2], NAV_LINKS[3]];
