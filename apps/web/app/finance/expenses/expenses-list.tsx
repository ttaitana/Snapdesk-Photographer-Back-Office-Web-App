"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, Pencil, Trash2 } from "lucide-react";

import { listExpensesAction, deleteExpenseAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";

/**
 * List view for /finance/expenses (task #7, TASKS.md P6 F7: "บันทึก
 * รายจ่าย + แนบใบเสร็จ (URL)"). No detail page in scope — same precedent as
 * package-list.tsx: rows expose edit/delete directly.
 */
export function ExpensesList() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const expensesQuery = useQuery({
    queryKey: ["expenses"],
    queryFn: () => listExpensesAction(),
  });

  async function handleDelete(id: string, category: string) {
    if (!window.confirm(`ลบรายจ่าย "${category}" ใช่หรือไม่?`)) return;
    setDeletingId(id);
    try {
      await deleteExpenseAction(id);
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } finally {
      setDeletingId(null);
    }
  }

  const expenses = expensesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl uppercase text-ink">รายจ่าย</h2>
        <Button asChild variant="primary" size="sm">
          <Link href="/finance/expenses/new">+ บันทึกรายจ่าย</Link>
        </Button>
      </div>

      {expensesQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel flex items-center justify-between gap-3 p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : expensesQuery.isError ? (
        <p className="text-sm text-destructive">โหลดข้อมูลรายจ่ายไม่สำเร็จ ลองรีเฟรชหน้านี้</p>
      ) : expenses.length > 0 ? (
        <ul className="space-y-3">
          {expenses.map((expense) => (
            <li
              key={expense.id}
              className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-ink">{expense.category}</p>
                  <span className="shrink-0 text-sm font-medium text-ink">
                    ฿{formatCurrency(expense.amount)}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {expense.spentAt.toLocaleDateString("th-TH")}
                  {expense.note ? ` · ${expense.note}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {expense.receiptUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={expense.receiptUrl} target="_blank" rel="noreferrer">
                      <Receipt className="h-3.5 w-3.5" />
                      ใบเสร็จ
                    </a>
                  </Button>
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/finance/expenses/${expense.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    แก้ไข
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deletingId === expense.id}
                  onClick={() => handleDelete(expense.id, expense.category)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Receipt}
          title="ยังไม่มีรายจ่าย"
          description="เริ่มบันทึกรายจ่ายแรกของทีม"
          action={
            <Button asChild variant="primary">
              <Link href="/finance/expenses/new">+ บันทึกรายจ่าย</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
