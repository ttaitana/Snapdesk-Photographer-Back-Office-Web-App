"use client";

import type { MemberIncomeTotal } from "@snapdesk/types";
import { formatCurrency } from "@/lib/utils";

/**
 * P6 F7 — "OWNER/ADMIN เห็นทุกคน" per-member income breakdown, only ever
 * populated by getFinanceSummary for view="team" + owner/admin caller (task
 * #8, TASKS.md). Plain table — no chart needed for a name/amount list.
 */
export function MemberBreakdownTable({ members }: { members: MemberIncomeTotal[] }) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">ยังไม่มีสมาชิกในทีม</p>;
  }

  const sorted = [...members].sort((a, b) => b.income - a.income);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ink/20 text-left text-muted-foreground">
          <th className="py-1.5 font-normal">สมาชิก</th>
          <th className="py-1.5 text-right font-normal">รายรับ</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((member) => (
          <tr key={member.userId} className="border-b border-ink/10 last:border-0">
            <td className="py-1.5 text-ink">{member.name}</td>
            <td className="py-1.5 text-right font-medium text-ink">฿{formatCurrency(member.income)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
