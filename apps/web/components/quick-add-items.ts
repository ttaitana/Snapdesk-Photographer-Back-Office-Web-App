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
 * บันทึกรับเงิน has no standalone route — payments are recorded from a
 * per-job dialog (see app/jobs/[id]/financial-section.tsx), so this entry
 * lands on /jobs for the photographer to pick which job to record against.
 */
export const QUICK_ADD_ITEMS: QuickAddItem[] = [
  { href: "/jobs/new", label: "งานใหม่", icon: Camera },
  { href: "/customers/new", label: "ลูกค้าใหม่", icon: UserPlus },
  { href: "/jobs", label: "บันทึกรับเงิน", icon: Wallet },
];
