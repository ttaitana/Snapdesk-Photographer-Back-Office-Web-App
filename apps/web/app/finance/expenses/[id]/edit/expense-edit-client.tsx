"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";

import { getExpenseAction } from "../../actions";
import { ExpenseForm } from "../../expense-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Client wrapper for /finance/expenses/[id]/edit (task #7) — same shape as
 * package-edit-client.tsx.
 */
export function ExpenseEditClient({ id }: { id: string }) {
  const expenseQuery = useQuery({
    queryKey: ["expense", id],
    queryFn: () => getExpenseAction(id),
  });

  const expense = expenseQuery.data;

  if (expenseQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="panel space-y-3 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (expenseQuery.isError || !expense) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={Search}
          title="ไม่พบรายจ่ายนี้"
          description="รายจ่ายนี้อาจถูกลบ หรือไม่อยู่ในทีมของคุณ"
          action={
            <Button asChild variant="primary">
              <Link href="/finance/expenses">กลับไปที่รายจ่าย</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="panel space-y-4 p-5">
        <h2 className="font-heading text-2xl uppercase text-ink">แก้ไขรายจ่าย</h2>
        <ExpenseForm mode="edit" expense={expense} />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/finance/expenses"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" />
      กลับไปที่รายจ่าย
    </Link>
  );
}
