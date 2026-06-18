import { z } from "zod";
import { cuidSchema } from "./common";
import { summaryPeriodSchema, summaryViewSchema } from "./enums";

// P6 F7 — "สรุปตามช่วงเวลา (เดือน/ไตรมาส/ปี): รายรับ/รายจ่าย/กำไรสุทธิ + กราฟตามหมวด",
// "2 มุมมองสลับได้: ทีม / รายคน". Not persisted; computed on read by
// @snapdesk/core/finance-summary from existing Payment/Expense/JobAssignment
// data, same convention as dashboard.ts's summary schemas.

export const financeSummaryInputSchema = z.object({
  teamId: cuidSchema,
  period: summaryPeriodSchema.default("month"),
  /** Any date inside the period to report on; defaults to now (server-side)
   * when omitted. Lets the UI page back/forward through past periods. */
  referenceDate: z.coerce.date().optional(),
  view: summaryViewSchema.default("team"),
  /** Required when view = "member" unless the caller wants "my own" —
   * the service defaults this to the caller's own userId. Ignored when
   * view = "team". */
  memberId: cuidSchema.optional(),
});
export type FinanceSummaryInput = z.infer<typeof financeSummaryInputSchema>;

export const expenseCategoryTotalSchema = z.object({
  category: z.string(),
  amount: z.number().nonnegative(),
});
export type ExpenseCategoryTotal = z.infer<typeof expenseCategoryTotalSchema>;

/** Only populated for OWNER/ADMIN viewing view="team" — "OWNER/ADMIN เห็นของ
 * ทุกคน". MEMBER callers never get this array populated (their own row is
 * exposed separately via the member view instead), enforced in
 * @snapdesk/core, not here. */
export const memberIncomeTotalSchema = z.object({
  userId: cuidSchema,
  name: z.string(),
  income: z.number().nonnegative(),
});
export type MemberIncomeTotal = z.infer<typeof memberIncomeTotalSchema>;

export const financeSummarySchema = z.object({
  period: summaryPeriodSchema,
  rangeStart: z.coerce.date(),
  rangeEnd: z.coerce.date(),
  view: summaryViewSchema,
  /** Echoes the member this summary is scoped to when view = "member". */
  memberId: cuidSchema.nullable().optional(),

  totalIncome: z.number().nonnegative(),
  totalExpense: z.number().nonnegative(),
  netProfit: z.number(),

  expensesByCategory: z.array(expenseCategoryTotalSchema),

  /** Per-member income breakdown — only present for view="team" requests
   * made by an OWNER/ADMIN caller. */
  memberBreakdown: z.array(memberIncomeTotalSchema).optional(),
});
export type FinanceSummary = z.infer<typeof financeSummarySchema>;
