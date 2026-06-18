"use server";

// Thin Server Actions for the income/expense summary page — P6 F7
// "สรุปตามช่วงเวลา" (TASKS.md), Expense + Summary sub-phase. Delegate straight
// to @snapdesk/core; no business logic here. Same pattern as
// app/finance/expenses/actions.ts.

import {
  getFinanceSummary as getFinanceSummaryService,
  getFinanceExportData as getFinanceExportDataService,
  type FinanceExportData,
} from "@snapdesk/core";
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

/** Backs the "export raw CSV" button (TASKS.md task #25) — returns every
 * Payment/Expense field for the year plus the ส่วนแบ่ง (split) column; the
 * client builds the actual CSV text (with the UTF-8 BOM prefix) and
 * triggers the download, same division of labor as the PDF/Excel tax
 * export (server assembles data, client renders the file). */
export async function getFinanceExportDataAction(options: {
  year?: number;
  view: "team" | "member";
  memberId?: string;
}): Promise<FinanceExportData> {
  const context = await requireActionContext();
  return getFinanceExportDataService(context, options);
}
