import { z } from "zod";
import { cuidSchema } from "./common";
import { shareTypeSchema } from "./enums";

export const jobAssignmentSchema = z.object({
  id: cuidSchema,
  jobId: cuidSchema,
  userId: cuidSchema,
  roleOnJob: z.string().nullable().optional(),
  shareType: shareTypeSchema,
  /// Percent (0–100) when shareType is PERCENT, absolute Baht when FIXED.
  shareValue: z.number().nonnegative(),
  createdAt: z.coerce.date(),
});
export type JobAssignment = z.infer<typeof jobAssignmentSchema>;

export const jobAssignmentInputSchema = z.object({
  teamId: cuidSchema,
  jobId: cuidSchema,
  userId: cuidSchema,
  roleOnJob: z.string().optional(),
  shareType: shareTypeSchema,
  shareValue: z.number().nonnegative("สัดส่วน/จำนวนต้องไม่ติดลบ"),
});
export type JobAssignmentInput = z.infer<typeof jobAssignmentInputSchema>;

export const updateJobAssignmentInputSchema = jobAssignmentInputSchema
  .omit({ jobId: true, userId: true })
  .partial()
  .extend({
    id: cuidSchema,
    teamId: cuidSchema,
  });
export type UpdateJobAssignmentInput = z.infer<typeof updateJobAssignmentInputSchema>;

/**
 * One resolved row in a job's revenue split — what calculateRevenueSplit()
 * (packages/core/src/job-assignments) returns per assignment, plus the
 * leftover "team pool" amount. Not persisted; computed on read.
 */
export const resolvedAssignmentSchema = z.object({
  assignmentId: cuidSchema,
  userId: cuidSchema,
  roleOnJob: z.string().nullable().optional(),
  shareType: shareTypeSchema,
  shareValue: z.number().nonnegative(),
  /// The resolved Baht amount this assignment is worth against the job total.
  amount: z.number(),
});
export type ResolvedAssignment = z.infer<typeof resolvedAssignmentSchema>;

export const revenueSplitSchema = z.object({
  jobTotal: z.number().nonnegative(),
  assignments: z.array(resolvedAssignmentSchema),
  /// jobTotal minus the sum of all resolved assignment amounts — the
  /// team/studio's own share of the job.
  teamPool: z.number(),
});
export type RevenueSplit = z.infer<typeof revenueSplitSchema>;
