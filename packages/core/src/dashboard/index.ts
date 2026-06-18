// Dashboard service — P5 F8 (TASKS.md).
//
// Both functions here are pure read aggregations over data already owned by
// jobs/payments — nothing new is persisted. getFollowUpJobs deliberately
// calls listJobs() per status instead of querying Prisma directly:
// jobFilterSchema.status only accepts a single value (not an array), and
// reusing listJobs avoids duplicating its Decimal -> number row mapping.

import { prisma } from "@snapdesk/db";
import {
  monthlyIncomeComparisonSchema,
  followUpJobsSchema,
  type MonthlyIncomeComparison,
  type FollowUpJobs,
} from "@snapdesk/types";
import type { TeamContext } from "../team-context";
import { decimalToNumber } from "../lib/decimal";
import { listJobs } from "../jobs";

/** Avoid float noise like 333.33000000000004 in computed money fields —
 * same helper as packages/core/src/payments/index.ts. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** [gte, lt) boundary for the calendar month `monthsAgo` months before now
 * (0 = this month, 1 = last month), in server local time. */
function monthRange(monthsAgo: number): { gte: Date; lt: Date } {
  const now = new Date();
  const gte = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const lt = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return { gte, lt };
}

function sumAmount(rows: { amount: { toNumber(): number } }[]): number {
  return round2(rows.reduce((total, row) => total + decimalToNumber(row.amount), 0));
}

/**
 * P5 F8 — "กราฟรายรับเดือนนี้ vs เดือนก่อน". Sums Payment.amount (gross
 * received, same convention as getJobFinancialSummary — not netReceived
 * after WHT) for payments whose `paidAt` falls in each month. Payment has
 * no teamId of its own, so scoping goes through the parent job relation.
 */
export async function getMonthlyIncomeComparison(
  context: TeamContext
): Promise<MonthlyIncomeComparison> {
  const [thisMonthPayments, lastMonthPayments] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: monthRange(0), job: { teamId: context.teamId } },
      select: { amount: true },
    }),
    prisma.payment.findMany({
      where: { paidAt: monthRange(1), job: { teamId: context.teamId } },
      select: { amount: true },
    }),
  ]);

  return monthlyIncomeComparisonSchema.parse({
    thisMonth: sumAmount(thisMonthPayments),
    lastMonth: sumAmount(lastMonthPayments),
  });
}

/**
 * P5 F8 — "งานที่ต้องตามต่อ": ใบเสนอราคารอตอบ (QUOTED) and ยังไม่ส่งงาน
 * (SHOOTING/EDITING — already shot, not yet handed off). CONFIRMED jobs are
 * intentionally excluded; they show up in the dashboard's shoot-queue cards
 * instead, so including them here would just be noise.
 */
export async function getFollowUpJobs(context: TeamContext): Promise<FollowUpJobs> {
  const [awaitingQuoteResponse, shooting, editing] = await Promise.all([
    listJobs(context, { status: "QUOTED" }),
    listJobs(context, { status: "SHOOTING" }),
    listJobs(context, { status: "EDITING" }),
  ]);

  return followUpJobsSchema.parse({
    awaitingQuoteResponse,
    notDelivered: [...shooting, ...editing],
  });
}
