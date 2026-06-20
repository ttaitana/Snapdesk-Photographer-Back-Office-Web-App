import { z } from "zod";
import { cuidSchema } from "./common";
import { paymentTypeSchema } from "./enums";

export const paymentSchema = z.object({
  id: cuidSchema,
  jobId: cuidSchema,
  amount: z.number().positive(),
  whtRate: z.number().min(0).max(100).default(0),
  whtAmount: z.number().min(0).default(0),
  netReceived: z.number().nullable().optional(),
  type: paymentTypeSchema,
  paidAt: z.coerce.date(),
  method: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const paymentInputSchema = z.object({
  teamId: cuidSchema,
  jobId: cuidSchema,
  amount: z.number().positive("จำนวนเงินต้องมากกว่า 0"),
  whtRate: z.number().min(0).max(100).default(0),
  type: paymentTypeSchema,
  method: z.string().optional(),
  note: z.string().optional(),
});
export type PaymentInput = z.infer<typeof paymentInputSchema>;

// P4 F3 — financial tracking summaries. Not persisted; computed on read by
// @snapdesk/core/payments from Job.totalPrice + the sum of its Payments.

export const jobFinancialSummarySchema = z.object({
  jobId: cuidSchema,
  totalPrice: z.number().nonnegative(),
  paid: z.number().nonnegative(),
  outstanding: z.number(),
});
export type JobFinancialSummary = z.infer<typeof jobFinancialSummarySchema>;

/** One row in the team-wide outstanding list (task #13's /jobs summary
 * panel) — only jobs with outstanding > 0 are included by the service.
 * teamId is included (P10 3-tap rule fix, TASKS.md) so the dashboard/jobs
 * quick-pay button can call createPaymentAction directly from this list
 * without an extra round trip to resolve the caller's team. */
export const teamOutstandingJobSchema = z.object({
  jobId: cuidSchema,
  teamId: cuidSchema,
  title: z.string(),
  customerId: cuidSchema,
  totalPrice: z.number().nonnegative(),
  paid: z.number().nonnegative(),
  outstanding: z.number(),
});
export type TeamOutstandingJob = z.infer<typeof teamOutstandingJobSchema>;

export const teamOutstandingSummarySchema = z.object({
  totalOutstanding: z.number(),
  jobs: z.array(teamOutstandingJobSchema),
});
export type TeamOutstandingSummary = z.infer<typeof teamOutstandingSummarySchema>;
