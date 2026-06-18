"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getMonthlyIncomeComparisonAction } from "./actions";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

/** P5 F8 — "กราฟรายรับเดือนนี้ vs เดือนก่อน (Recharts)". Required by name in
 * TASKS.md, so this is the one chart in the app built with it rather than
 * plain markup. Data comes from getMonthlyIncomeComparisonAction
 * (app/dashboard/actions.ts), which sums Payment.amount per calendar month. */
export function IncomeChart() {
  const query = useQuery({
    queryKey: ["monthly-income-comparison"],
    queryFn: () => getMonthlyIncomeComparisonAction(),
  });

  if (query.isLoading) {
    return (
      <div className="panel space-y-3 p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="panel p-5">
        <p className="text-sm text-destructive">โหลดกราฟรายรับไม่สำเร็จ ลองรีเฟรชหน้านี้</p>
      </div>
    );
  }

  const { thisMonth, lastMonth } = query.data;
  const data = [
    { name: "เดือนก่อน", amount: lastMonth },
    { name: "เดือนนี้", amount: thisMonth },
  ];
  const diff = thisMonth - lastMonth;
  const diffColor = diff > 0 ? "text-success" : diff < 0 ? "text-danger" : "text-muted-foreground";

  return (
    <div className="panel space-y-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-heading text-lg uppercase text-ink">รายรับเดือนนี้ vs เดือนก่อน</h3>
        <p className={`text-sm font-medium ${diffColor}`}>
          {diff > 0 ? "+" : ""}฿{formatCurrency(diff)} จากเดือนก่อน
        </p>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--ink)" fontSize={12} />
            <YAxis stroke="var(--ink)" fontSize={12} tickFormatter={(value: number) => formatCurrency(value)} />
            <Tooltip
              formatter={(value: number) => [`฿${formatCurrency(value)}`, "รายรับ"]}
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
    </div>
  );
}
