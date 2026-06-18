import { ExpensesList } from "./expenses-list";

/**
 * P6 ("F7 รายรับ-รายจ่าย") — list view of expenses (task #7, TASKS.md:
 * "บันทึกรายจ่าย + แนบใบเสร็จ (URL)"). Session + team-context checks already
 * happened in app/finance/layout.tsx.
 */
export default function ExpensesPage() {
  return <ExpensesList />;
}
