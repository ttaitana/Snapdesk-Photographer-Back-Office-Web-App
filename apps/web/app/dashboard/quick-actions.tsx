import Link from "next/link";

import { QUICK_ADD_ITEMS } from "@/components/quick-add-items";
import { Button } from "@/components/ui/button";

/**
 * P5 F8 — "quick actions: + งานใหม่ / + ลูกค้า / + บันทึกรับเงิน". Reuses the
 * same QUICK_ADD_ITEMS list BottomNav's "+" dialog renders
 * (components/quick-add-items.ts) — desktop sidebar users don't get that
 * dialog, so the dashboard exposes the three actions as inline buttons
 * instead, on every screen size.
 */
export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ADD_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Button key={item.href + item.label} asChild variant="primary" size="sm">
            <Link href={item.href}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
