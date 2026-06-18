import { z } from "zod";
import { jobSchema } from "./job";

// P5 F8 — Dashboard summaries. Not persisted; computed on read by
// @snapdesk/core/dashboard from existing Job/Payment data, same convention
// as payment.ts's jobFinancialSummarySchema/teamOutstandingSummarySchema.

/** "กราฟรายรับเดือนนี้ vs เดือนก่อน" — sum of Payment.amount received in the
 * current calendar month vs the previous one (server local time). */
export const monthlyIncomeComparisonSchema = z.object({
  thisMonth: z.number().nonnegative(),
  lastMonth: z.number().nonnegative(),
});
export type MonthlyIncomeComparison = z.infer<typeof monthlyIncomeComparisonSchema>;

/** "งานที่ต้องตามต่อ" — jobs needing the photographer's attention:
 * awaitingQuoteResponse = QUOTED (sent, customer hasn't confirmed yet);
 * notDelivered = SHOOTING/EDITING (already shot, not yet handed off). Jobs
 * that haven't been shot yet (CONFIRMED) are covered by the dashboard's
 * shoot-queue cards instead, so they're deliberately excluded here. */
export const followUpJobsSchema = z.object({
  awaitingQuoteResponse: z.array(jobSchema),
  notDelivered: z.array(jobSchema),
});
export type FollowUpJobs = z.infer<typeof followUpJobsSchema>;
