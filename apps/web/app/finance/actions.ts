"use server";

// Thin Server Actions for the income/expense summary page — P6 F7
// "สรุปตามช่วงเวลา" (TASKS.md), Expense + Summary sub-phase. Delegate straight
// to @snapdesk/core; no business logic here. Same pattern as
// app/finance/expenses/actions.ts.

import { getFinanceSummary as getFinanceSummaryService } from "@snapdesk/core";
import type { FinanceSummary, SummaryPeriod, SummaryView, TeamRole } from "@snapdesk/types";

import { requireActionContext } from "@/lib/require-action-context";

export type FinanceSummaryParams = {
  period?: SummaryPeriod;
  referenceDate?: Date;
  view?: SummaryView;
  /** Owner/admin only — which member's view="member" data to fetch. Ignored
   * (defaults to the caller) for a "member"-role caller, enforced in
   * @snapdesk/core's getFinanceSummary. */
  memberId?: string;
};

export async function getFinanceSummaryAction(
  params: FinanceSummaryParams = {},
): Promise<FinanceSummary> {
  const context = await requireActionContext();
  return getFinanceSummaryService(context, {
    period: params.period ?? "month",
    referenceDate: params.referenceDate,
    view: params.view ?? "team",
    memberId: params.memberId,
  });
}

/**
 * Lets the summary page decide whether to show the "ดูรายคน" member picker
 * and the memberBreakdown table, without duplicating @snapdesk/core's
 * owner/admin visibility rule client-side (SPEC.md F7: "MEMBER เห็นของตัวเอง
 * +ยอดทีม, OWNER/ADMIN เห็นทุกคน") — the page just asks for the caller's own
 * role.
 */
export async function getMyTeamRoleAction(): Promise<TeamRole> {
  const context = await requireActionContext();
  return context.role;
}
