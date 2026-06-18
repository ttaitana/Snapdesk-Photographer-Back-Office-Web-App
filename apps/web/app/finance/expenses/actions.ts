"use server";

// Thin Server Actions for expenses — P6 F7 "รายรับ-รายจ่าย" (TASKS.md), Expense
// + Summary sub-phase. Same pattern as app/customers/actions.ts: each action
// resolves the caller's TeamContext, then delegates straight to
// @snapdesk/core; no Prisma import here and no business logic.

import {
  listExpenses as listExpensesService,
  getExpense as getExpenseService,
  createExpense as createExpenseService,
  updateExpense as updateExpenseService,
  deleteExpense as deleteExpenseService,
  type ListExpensesFilter,
} from "@snapdesk/core";
import type { Expense, ExpenseInput, UpdateExpenseInput } from "@snapdesk/types";

import { requireActionContext } from "@/lib/require-action-context";

export async function listExpensesAction(filter?: ListExpensesFilter): Promise<Expense[]> {
  const context = await requireActionContext();
  return listExpensesService(context, filter);
}

export async function getExpenseAction(id: string): Promise<Expense | null> {
  const context = await requireActionContext();
  return getExpenseService(context, id);
}

export async function createExpenseAction(input: ExpenseInput): Promise<Expense> {
  const context = await requireActionContext();
  return createExpenseService(context, input);
}

export async function updateExpenseAction(input: UpdateExpenseInput): Promise<Expense | null> {
  const context = await requireActionContext();
  return updateExpenseService(context, input);
}

export async function deleteExpenseAction(id: string): Promise<boolean> {
  const context = await requireActionContext();
  return deleteExpenseService(context, id);
}
