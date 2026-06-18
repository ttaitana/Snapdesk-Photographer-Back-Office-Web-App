// Finance summary service — P6 F7 "สรุปตามช่วงเวลา" (TASKS.md), Expense +
// Summary sub-phase.
//
// Pulls together three existing data sources for a single period
// (month/quarter/year) — nothing new is persisted, same "computed on read"
// convention as ../dashboard:
//   - Expense rows (this sub-phase) -> totalExpense + expensesByCategory
//   - Payment rows (P2/P4)          -> totalIncome, basis-dependent (below)
//   - JobAssignment splits (P4)     -> per-member income breakdown, reusing
//     calculateRevenueSplit() from ../job-assignments rather than
//     duplicating the FIXED-then-PERCENT math.
//
// Revenue recognition basis (Team.revenueBasis, "cash" default | "accrual"):
//   - cash: a payment's amount counts in whichever period its `paidAt`
//     falls in. Since a job's totalPrice may not be fully collected yet,
//     each payment is prorated across that job's assignments using the
//     SAME ratio calculateRevenueSplit() resolves for the full job total
//     (assignment.amount / jobTotal) — so once a job is fully paid, the sum
//     of every payment's prorated shares converges exactly to
//     calculateRevenueSplit()'s own per-assignment amounts.
//   - accrual: the job's ENTIRE totalPrice (and its full resolved split) is
//     recognized in whichever period the job's `shootDate` falls in,
//     regardless of how much cash has actually been collected — CANCELLED
//     jobs are excluded, same precedent as getTeamOutstandingSummary
//     (../payments).
//
// Visibility (SPEC.md F7): "MEMBER เห็นของตัวเอง+ยอดทีม, OWNER/ADMIN เห็นทุกคน".
// A MEMBER caller can request view="team" (gets team-wide totals, just like
// anyone) or view="member" for THEMSELVES only; requesting another member's
// view="member" data throws. `memberBreakdown` (every member's resolved
// income side-by-side) is only ever populated for OWNER/ADMIN callers.

import { prisma } from "@snapdesk/db";
import {
  financeSummaryInputSchema,
  financeSummarySchema,
  type FinanceSummaryInput,
  type FinanceSummary,
  type ShareType,
} from "@snapdesk/types";
import type { TeamContext } from "../team-context";
import { TeamContextError } from "../team-context";
import { decimalToNumber } from "../lib/decimal";
import { calculateRevenueSplit } from "../job-assignments";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** [gte, lt) boundary for the calendar month/quarter/year containing
 * `referenceDate`, in server local time — same half-open convention as
 * ../dashboard's monthRange. */
function getPeriodRange(
  period: FinanceSummaryInput["period"],
  referenceDate: Date
): { gte: Date; lt: Date } {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth();

  if (period === "year") {
    return { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
  }

  if (period === "quarter") {
    const quarterStart = Math.floor(m / 3) * 3;
    return { gte: new Date(y, quarterStart, 1), lt: new Date(y, quarterStart + 3, 1) };
  }

  return { gte: new Date(y, m, 1), lt: new Date(y, m + 1, 1) };
}

type AssignmentRow = { userId: string; shareType: string; shareValue: { toNumber(): number } };

function toAssignmentInputs(assignments: AssignmentRow[]) {
  return assignments.map((a, i) => ({
    id: `a${i}`,
    userId: a.userId,
    shareType: a.shareType as ShareType,
    shareValue: decimalToNumber(a.shareValue),
  }));
}

/** Team.revenueBasis defaults to "cash" at the schema level, but Prisma's
 * generated type still allows any string that slipped in some other way —
 * narrow defensively rather than trust it blindly. */
function normalizeBasis(value: string): "cash" | "accrual" {
  return value === "accrual" ? "accrual" : "cash";
}

interface IncomeResult {
  totalIncome: number;
  /** userId -> resolved income in this period. Team-pool leftover (the
   * studio's own cut) is intentionally NOT a member and is excluded here —
   * it's implicit in totalIncome minus the sum of this map. */
  memberIncome: Map<string, number>;
}

async function getCashBasisIncome(teamId: string, range: { gte: Date; lt: Date }): Promise<IncomeResult> {
  const payments = await prisma.payment.findMany({
    where: { paidAt: range, job: { teamId } },
    select: {
      amount: true,
      job: {
        select: {
          totalPrice: true,
          assignments: { select: { userId: true, shareType: true, shareValue: true } },
        },
      },
    },
  });

  const memberIncome = new Map<string, number>();
  let totalIncome = 0;

  for (const payment of payments) {
    const amount = decimalToNumber(payment.amount);
    totalIncome += amount;

    const jobTotal = decimalToNumber(payment.job.totalPrice);
    if (jobTotal <= 0 || payment.job.assignments.length === 0) continue;

    const split = calculateRevenueSplit(jobTotal, toAssignmentInputs(payment.job.assignments));
    for (const resolved of split.assignments) {
      const ratio = resolved.amount / jobTotal;
      const prorated = amount * ratio;
      memberIncome.set(resolved.userId, (memberIncome.get(resolved.userId) ?? 0) + prorated);
    }
  }

  return { totalIncome: round2(totalIncome), memberIncome };
}

async function getAccrualBasisIncome(
  teamId: string,
  range: { gte: Date; lt: Date }
): Promise<IncomeResult> {
  const jobs = await prisma.job.findMany({
    where: { teamId, status: { not: "CANCELLED" }, shootDate: range },
    select: {
      totalPrice: true,
      assignments: { select: { userId: true, shareType: true, shareValue: true } },
    },
  });

  const memberIncome = new Map<string, number>();
  let totalIncome = 0;

  for (const job of jobs) {
    const jobTotal = decimalToNumber(job.totalPrice);
    totalIncome += jobTotal;

    if (jobTotal <= 0 || job.assignments.length === 0) continue;

    const split = calculateRevenueSplit(jobTotal, toAssignmentInputs(job.assignments));
    for (const resolved of split.assignments) {
      memberIncome.set(resolved.userId, (memberIncome.get(resolved.userId) ?? 0) + resolved.amount);
    }
  }

  return { totalIncome: round2(totalIncome), memberIncome };
}

export async function getFinanceSummary(
  context: TeamContext,
  rawInput: Omit<FinanceSummaryInput, "teamId">
): Promise<FinanceSummary> {
  const input = financeSummaryInputSchema.parse({ ...rawInput, teamId: context.teamId });

  if (input.view === "member") {
    const targetMemberId = input.memberId ?? context.userId;
    if (context.role === "member" && targetMemberId !== context.userId) {
      throw new TeamContextError("คุณเห็นได้แค่ข้อมูลของตัวเองและยอดรวมทีม");
    }
    return getMemberFinanceSummary(context, input, targetMemberId);
  }

  return getTeamFinanceSummary(context, input);
}

async function getRevenueBasis(teamId: string): Promise<"cash" | "accrual"> {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { revenueBasis: true } });
  return normalizeBasis(team?.revenueBasis ?? "cash");
}

async function getTeamFinanceSummary(
  context: TeamContext,
  input: FinanceSummaryInput
): Promise<FinanceSummary> {
  const range = getPeriodRange(input.period, input.referenceDate ?? new Date());
  const basis = await getRevenueBasis(context.teamId);

  const income =
    basis === "accrual"
      ? await getAccrualBasisIncome(context.teamId, range)
      : await getCashBasisIncome(context.teamId, range);

  const expenses = await prisma.expense.findMany({
    where: { teamId: context.teamId, spentAt: range },
    select: { category: true, amount: true },
  });

  const categoryTotals = new Map<string, number>();
  let totalExpense = 0;
  for (const expense of expenses) {
    const amount = decimalToNumber(expense.amount);
    totalExpense += amount;
    categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? 0) + amount);
  }

  let memberBreakdown: FinanceSummary["memberBreakdown"];
  if (context.role === "owner" || context.role === "admin") {
    const members = await prisma.teamMember.findMany({
      where: { organizationId: context.teamId },
      select: { userId: true, user: { select: { name: true } } },
    });

    memberBreakdown = members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      income: round2(income.memberIncome.get(m.userId) ?? 0),
    }));
  }

  return financeSummarySchema.parse({
    period: input.period,
    rangeStart: range.gte,
    rangeEnd: range.lt,
    view: "team",
    memberId: null,
    totalIncome: income.totalIncome,
    totalExpense: round2(totalExpense),
    netProfit: round2(income.totalIncome - totalExpense),
    expensesByCategory: Array.from(categoryTotals.entries()).map(([category, amount]) => ({
      category,
      amount: round2(amount),
    })),
    memberBreakdown,
  });
}

/** view="member" — "ของตัวเอง": income is this member's resolved share
 * (cash- or accrual-prorated, same as the team view); expense is narrowed to
 * expenses THIS member recorded (Expense.createdById), since expenses have
 * no other natural per-member attribution in the current schema. */
async function getMemberFinanceSummary(
  context: TeamContext,
  input: FinanceSummaryInput,
  memberId: string
): Promise<FinanceSummary> {
  const range = getPeriodRange(input.period, input.referenceDate ?? new Date());
  const basis = await getRevenueBasis(context.teamId);

  const income =
    basis === "accrual"
      ? await getAccrualBasisIncome(context.teamId, range)
      : await getCashBasisIncome(context.teamId, range);

  const memberIncome = round2(income.memberIncome.get(memberId) ?? 0);

  const expenses = await prisma.expense.findMany({
    where: { teamId: context.teamId, createdById: memberId, spentAt: range },
    select: { category: true, amount: true },
  });

  const categoryTotals = new Map<string, number>();
  let totalExpense = 0;
  for (const expense of expenses) {
    const amount = decimalToNumber(expense.amount);
    totalExpense += amount;
    categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? 0) + amount);
  }

  return financeSummarySchema.parse({
    period: input.period,
    rangeStart: range.gte,
    rangeEnd: range.lt,
    view: "member",
    memberId,
    totalIncome: memberIncome,
    totalExpense: round2(totalExpense),
    netProfit: round2(memberIncome - totalExpense),
    expensesByCategory: Array.from(categoryTotals.entries()).map(([category, amount]) => ({
      category,
      amount: round2(amount),
    })),
  });
}

// ── Raw export (TASKS.md "Export": "export raw CSV (ทุก field + คอลัมน์ส่วนแบ่ง)") ──

/** One Payment row, every field, plus a human-readable "ส่วนแบ่ง" (revenue
 * split) string — same proration ratios getCashBasisIncome resolves per
 * payment, just rendered for a person to read in a spreadsheet rather than
 * summed into a total. */
export interface IncomeExportRow {
  paymentId: string;
  jobId: string;
  jobTitle: string;
  customerName: string;
  paidAt: Date;
  type: string;
  method: string | null;
  amount: number;
  whtRate: number;
  whtAmount: number;
  netReceived: number | null;
  note: string | null;
  split: string;
}

/** One Expense row, every field. */
export interface ExpenseExportRow {
  expenseId: string;
  jobId: string | null;
  jobTitle: string | null;
  category: string;
  amount: number;
  spentAt: Date;
  note: string | null;
  receiptUrl: string | null;
  createdByName: string;
}

export interface FinanceExportData {
  year: number;
  view: "team" | "member";
  memberId: string | null;
  income: IncomeExportRow[];
  expenses: ExpenseExportRow[];
}

function formatSplit(
  jobTotal: number,
  assignments: ReturnType<typeof toAssignmentInputs>,
  names: Map<string, string>,
  onlyUserId?: string
): string {
  if (jobTotal <= 0 || assignments.length === 0) return "";
  const split = calculateRevenueSplit(jobTotal, assignments);
  const rows = onlyUserId ? split.assignments.filter((a) => a.userId === onlyUserId) : split.assignments;
  return rows
    .map((a) => {
      const pct = round2((a.amount / jobTotal) * 100);
      const name = names.get(a.userId) ?? a.userId;
      return `${name} ${pct}% (${round2(a.amount)})`;
    })
    .join("; ");
}

/** Raw ledger for the calendar year — every Payment + Expense field, plus
 * the revenue-split column the CSV/Excel export needs (TASKS.md task #25).
 * view="team": every payment/expense for the team — owner/admin only, this
 * is the raw ledger (more sensitive than the aggregate totals
 * getTeamFinanceSummary exposes to everyone).
 * view="member": payments for jobs this member is assigned to (split column
 * narrowed to just their share) + expenses they personally recorded — self
 * or owner/admin. */
export async function getFinanceExportData(
  context: TeamContext,
  options: { year?: number; view: "team" | "member"; memberId?: string }
): Promise<FinanceExportData> {
  const targetYear = options.year ?? new Date().getFullYear();
  const range = { gte: new Date(targetYear, 0, 1), lt: new Date(targetYear + 1, 0, 1) };

  if (options.view === "team" && context.role !== "owner" && context.role !== "admin") {
    throw new TeamContextError("คุณไม่มีสิทธิ์ดูข้อมูลดิบของทีม");
  }
  const targetMemberId = options.view === "member" ? options.memberId ?? context.userId : undefined;
  if (targetMemberId) {
    const isSelf = targetMemberId === context.userId;
    const isManager = context.role === "owner" || context.role === "admin";
    if (!isSelf && !isManager) {
      throw new TeamContextError("คุณไม่มีสิทธิ์ดูข้อมูลดิบของสมาชิกคนนี้");
    }
  }

  const members = await prisma.teamMember.findMany({
    where: { organizationId: context.teamId },
    select: { userId: true, user: { select: { name: true } } },
  });
  const names = new Map(members.map((m) => [m.userId, m.user.name]));

  const paymentWhere = targetMemberId
    ? { paidAt: range, job: { teamId: context.teamId, assignments: { some: { userId: targetMemberId } } } }
    : { paidAt: range, job: { teamId: context.teamId } };

  const payments = await prisma.payment.findMany({
    where: paymentWhere,
    select: {
      id: true,
      jobId: true,
      amount: true,
      whtRate: true,
      whtAmount: true,
      netReceived: true,
      type: true,
      paidAt: true,
      method: true,
      note: true,
      job: {
        select: {
          title: true,
          totalPrice: true,
          customer: { select: { name: true } },
          assignments: { select: { userId: true, shareType: true, shareValue: true } },
        },
      },
    },
    orderBy: { paidAt: "asc" },
  });

  const income: IncomeExportRow[] = payments.map((p) => ({
    paymentId: p.id,
    jobId: p.jobId,
    jobTitle: p.job.title,
    customerName: p.job.customer?.name ?? "",
    paidAt: p.paidAt,
    type: p.type,
    method: p.method,
    amount: decimalToNumber(p.amount),
    whtRate: decimalToNumber(p.whtRate),
    whtAmount: decimalToNumber(p.whtAmount),
    netReceived: p.netReceived !== null ? decimalToNumber(p.netReceived) : null,
    note: p.note,
    split: formatSplit(
      decimalToNumber(p.job.totalPrice),
      toAssignmentInputs(p.job.assignments),
      names,
      targetMemberId
    ),
  }));

  const expenseWhere = targetMemberId
    ? { teamId: context.teamId, createdById: targetMemberId, spentAt: range }
    : { teamId: context.teamId, spentAt: range };

  const expenseRows = await prisma.expense.findMany({
    where: expenseWhere,
    select: {
      id: true,
      jobId: true,
      category: true,
      amount: true,
      spentAt: true,
      note: true,
      receiptUrl: true,
      createdById: true,
      job: { select: { title: true } },
    },
    orderBy: { spentAt: "asc" },
  });

  const expenses: ExpenseExportRow[] = expenseRows.map((e) => ({
    expenseId: e.id,
    jobId: e.jobId,
    jobTitle: e.job?.title ?? null,
    category: e.category,
    amount: decimalToNumber(e.amount),
    spentAt: e.spentAt,
    note: e.note,
    receiptUrl: e.receiptUrl,
    createdByName: names.get(e.createdById) ?? "",
  }));

  return {
    year: targetYear,
    view: options.view,
    memberId: targetMemberId ?? null,
    income,
    expenses,
  };
}
