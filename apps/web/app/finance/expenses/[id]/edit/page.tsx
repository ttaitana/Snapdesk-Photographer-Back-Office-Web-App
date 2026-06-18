import { ExpenseEditClient } from "./expense-edit-client";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExpenseEditClient id={id} />;
}
