"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ExpenseCategoryTotal } from "@snapdesk/types";
import { formatCurrency } from "@/lib/utils";

/**
 * P6 F7 — "กราฟตามหมวด" for the income/expense summary page (task #8,
 * TASKS.md). Same Recharts styling convention as
 * app/dashboard/income-chart.tsx (the only other chart in the app) — CSS
 * vars for theming, not hardcoded colors.
 */
export function CategoryBreakdownChart({ data }: { data: ExpenseCategoryTotal[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">ไม่มีรายจ่ายในช่วงนี้</p>;
  }

  const chartData = [...data]
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({ name: item.category, amount: item.amount }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" stroke="var(--ink)" fontSize={12} />
          <YAxis stroke="var(--ink)" fontSize={12} tickFormatter={(value: number) => formatCurrency(value)} />
          <Tooltip
            formatter={(value: number) => [`฿${formatCurrency(value)}`, "รายจ่าย"]}
            contentStyle={{
              background: "var(--surface)",
              border: "2px solid var(--ink)",
              borderRadius: "0.5rem",
            }}
          />
          <Bar dataKey="amount" fill="var(--primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
