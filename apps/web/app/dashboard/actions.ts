"use server";

// Thin Server Actions for the dashboard — P5 F8 (TASKS.md). Same pattern as
// app/jobs/actions.ts and app/jobs/payments-actions.ts. The dashboard's
// shoot-queue cards and outstanding-total card don't need new actions —
// they reuse listJobsAction (app/jobs/actions.ts) and
// getTeamOutstandingSummaryAction (app/jobs/payments-actions.ts) directly.

import {
  getMonthlyIncomeComparison as getMonthlyIncomeComparisonService,
  getFollowUpJobs as getFollowUpJobsService,
} from "@snapdesk/core";
import type { MonthlyIncomeComparison, FollowUpJobs } from "@snapdesk/types";

import { requireActionContext } from "@/lib/require-action-context";

/** P5 F8 — "กราฟรายรับเดือนนี้ vs เดือนก่อน". */
export async function getMonthlyIncomeComparisonAction(): Promise<MonthlyIncomeComparison> {
  const context = await requireActionContext();
  return getMonthlyIncomeComparisonService(context);
}

/** P5 F8 — "งานที่ต้องตามต่อ". */
export async function getFollowUpJobsAction(): Promise<FollowUpJobs> {
  const context = await requireActionContext();
  return getFollowUpJobsService(context);
}
