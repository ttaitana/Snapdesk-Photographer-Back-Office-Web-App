// Expenses service — P6 F7 "รายรับ-รายจ่าย" (TASKS.md), Expense + Summary
// sub-phase.
//
// Unlike Payment, Expense carries its own `teamId` column, so this follows
// the simpler customers/packages CRUD pattern (see ../customers) rather than
// payments' requireJobInTeam-via-parent-only pattern. The one place that
// pattern still shows up here is `jobId`: when an expense is linked to a
// job, we still confirm that job belongs to the caller's team before
// linking it, so a leaked/guessed jobId from another team can't be used to
// attach an expense to it.
//
// `createdById` is always the calling user (context.userId) — never
// accepted from client input, same convention as Job.createdById (P2).

import { prisma } from "@snapdesk/db";
import {
  expenseSchema,
  expenseInputSchema,
  updateExpenseInputSchema,
  type Expense,
  type ExpenseInput,
  type UpdateExpenseInput,
} from "@snapdesk/types";
import type { TeamContext } from "../team-context";
import { TeamContextError } from "../team-context";
import { decimalToNumber } from "../lib/decimal";

function toExpense(row: {
  id: string;
  teamId: string;
  createdById: string;
  jobId: string | null;
  category: string;
  amount: { toNumber(): number };
  spentAt: Date;
  note: string | null;
  receiptUrl: string | null;
  createdAt: Date;
}): Expense {
  return expenseSchema.parse({
    ...row,
    amount: decimalToNumber(row.amount),
  });
}

/** Throws if `jobId` doesn't exist or doesn't belong to context.teamId. */
async function requireJobInTeam(context: TeamContext, jobId: string): Promise<void> {
  const job = await prisma.job.findFirst({
    where: { id: jobId, teamId: context.teamId },
    select: { id: true },
  });

  if (!job) {
    throw new TeamContextError("ไม่พบงานนี้ในทีมของคุณ");
  }
}

export interface ListExpensesFilter {
  jobId?: string;
  category?: string;
  /** Inclusive lower/upper bound on spentAt — used by the finance-summary
   * service to pull a single period's worth of rows. */
  spentFrom?: Date;
  spentTo?: Date;
}

export async function listExpenses(
  context: TeamContext,
  filter: ListExpensesFilter = {}
): Promise<Expense[]> {
  const rows = await prisma.expense.findMany({
    where: {
      teamId: context.teamId,
      ...(filter.jobId !== undefined && { jobId: filter.jobId }),
      ...(filter.category !== undefined && { category: filter.category }),
      ...((filter.spentFrom !== undefined || filter.spentTo !== undefined) && {
        spentAt: {
          ...(filter.spentFrom !== undefined && { gte: filter.spentFrom }),
          ...(filter.spentTo !== undefined && { lt: filter.spentTo }),
        },
      }),
    },
    orderBy: { spentAt: "desc" },
  });

  return rows.map(toExpense);
}

export async function getExpense(
  context: TeamContext,
  id: string
): Promise<Expense | null> {
  const row = await prisma.expense.findFirst({
    where: { id, teamId: context.teamId },
  });

  return row ? toExpense(row) : null;
}

export async function createExpense(
  context: TeamContext,
  input: ExpenseInput
): Promise<Expense> {
  const parsed = expenseInputSchema.parse({ ...input, teamId: context.teamId });

  if (parsed.jobId) {
    await requireJobInTeam(context, parsed.jobId);
  }

  const row = await prisma.expense.create({
    data: {
      teamId: context.teamId,
      createdById: context.userId,
      jobId: parsed.jobId || null,
      category: parsed.category,
      amount: parsed.amount,
      spentAt: parsed.spentAt ?? new Date(),
      note: parsed.note || null,
      receiptUrl: parsed.receiptUrl || null,
    },
  });

  return toExpense(row);
}

export async function updateExpense(
  context: TeamContext,
  input: UpdateExpenseInput
): Promise<Expense | null> {
  const parsed = updateExpenseInputSchema.parse({ ...input, teamId: context.teamId });

  if (parsed.jobId) {
    await requireJobInTeam(context, parsed.jobId);
  }

  // updateMany + a team-scoped where, rather than update-by-id, so an
  // expense belonging to another team can never be modified even if its id
  // leaked into a request — see TeamContext security note in schema.prisma.
  const result = await prisma.expense.updateMany({
    where: { id: parsed.id, teamId: context.teamId },
    data: {
      ...(parsed.jobId !== undefined && { jobId: parsed.jobId || null }),
      ...(parsed.category !== undefined && { category: parsed.category }),
      ...(parsed.amount !== undefined && { amount: parsed.amount }),
      ...(parsed.spentAt !== undefined && { spentAt: parsed.spentAt }),
      ...(parsed.note !== undefined && { note: parsed.note || null }),
      ...(parsed.receiptUrl !== undefined && { receiptUrl: parsed.receiptUrl || null }),
    },
  });

  if (result.count === 0) return null;
  return getExpense(context, parsed.id);
}

export async function deleteExpense(context: TeamContext, id: string): Promise<boolean> {
  const result = await prisma.expense.deleteMany({
    where: { id, teamId: context.teamId },
  });

  return result.count > 0;
}
