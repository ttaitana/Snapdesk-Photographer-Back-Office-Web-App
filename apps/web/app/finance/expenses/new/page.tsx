import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ExpenseForm } from "../expense-form";

export default function NewExpensePage() {
  return (
    <div className="space-y-4">
      <Link
        href="/finance/expenses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับไปที่รายจ่าย
      </Link>
      <div className="panel space-y-4 p-5">
        <h2 className="font-heading text-2xl uppercase text-ink">บันทึกรายจ่ายใหม่</h2>
        <ExpenseForm mode="create" />
      </div>
    </div>
  );
}
