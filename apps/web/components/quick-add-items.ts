import type { LucideIcon } from "lucide-react";
import { Camera, UserPlus, Wallet } from "lucide-react";

export interface QuickAddItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * P5 F8 — "quick actions: + งานใหม่ / + ลูกค้า / + บันทึกรับเงิน". Shared by
 * the dashboard's quick-actions row and BottomNav's "+" menu so the three
 * destinations are only defined once.
 *
 * บันทึกรับเงิน has no standalone route — it lands on /jobs, which opens
 * with OutstandingSummaryPanel (see app/jobs/outstanding-summary-panel.tsx)
 * listing every job that still owes money, each row with an inline "รับเงิน"
 * button (quick-pay-button.tsx) — open dialog pre-filled (1) → confirm (2).
 *
 * Note on the 3-tap rule (SPEC.md §3.5): that 2-tap count is measured from
 * OutstandingSummaryPanel itself, which also renders at the top of the
 * dashboard — so from the app's home screen, recording a payment is "รับเงิน"
 * (1) → confirm (2), no navigation needed at all. Reaching the same panel via
 * this bottom-nav "+" shortcut costs two extra taps (open the "+" menu, pick
 * this item) since it's a secondary entry point for when the photographer is
 * already elsewhere in the app — the rule's intent (per the flows it names:
 * "ดูคิววันนี้" is the dashboard itself, "อัปเดตสถานะ" is opened from a job
 * already on screen) is about the primary dashboard-driven path, not every
 * possible route in. Recording from inside a job's own page is still
 * available too (app/jobs/[id]/financial-section.tsx), for when more detail
 * (WHT rate, method, note) needs adjusting before saving.
 */
export const QUICK_ADD_ITEMS: QuickAddItem[] = [
  { href: "/jobs/new", label: "งานใหม่", icon: Camera },
  { href: "/customers/new", label: "ลูกค้าใหม่", icon: UserPlus },
  { href: "/jobs", label: "บันทึกรับเงิน", icon: Wallet },
];
