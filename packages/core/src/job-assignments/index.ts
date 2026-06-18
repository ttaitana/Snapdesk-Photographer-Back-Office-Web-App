// JobAssignments service — P4 F3 "แบ่งรายได้": who worked a job and how the
// payout is split between them.
//
// JobAssignment has no teamId of its own (only jobId, like Payment) — same
// requireJobInTeam guard as packages/core/src/payments. Unlike Payment,
// JobAssignment IS mutable (the spec explicitly wants adjustable %/fixed
// shares), so a normal updateJobAssignment exists here.
//
// Split math (SPEC.md §4 / schema.prisma comment, verbatim rule): FIXED
// shares are deducted from the job total first; PERCENT shares are then
// computed against what's left after all FIXED shares are removed. The sum
// of every assignment's resolved Baht amount must never exceed the job's
// totalPrice — whatever isn't claimed is the team/studio's own pool.
// calculateRevenueSplit() below is the pure function that does this math;
// create/update call it to validate before writing.

import { prisma } from "@snapdesk/db";
import {
  jobAssignmentSchema,
  jobAssignmentInputSchema,
  updateJobAssignmentInputSchema,
  type JobAssignment,
  type JobAssignmentInput,
  type UpdateJobAssignmentInput,
  type RevenueSplit,
  type ShareType,
} from "@snapdesk/types";
import type { TeamContext } from "../team-context";
import { TeamContextError } from "../team-context";
import { decimalToNumber } from "../lib/decimal";

export class JobAssignmentValidationError extends Error {
  constructor(message = "ผลรวมส่วนแบ่งเกินยอดงานทั้งหมด") {
    super(message);
    this.name = "JobAssignmentValidationError";
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toJobAssignment(row: {
  id: string;
  jobId: string;
  userId: string;
  roleOnJob: string | null;
  shareType: string;
  shareValue: { toNumber(): number };
  createdAt: Date;
}): JobAssignment {
  return jobAssignmentSchema.parse({
    ...row,
    shareValue: decimalToNumber(row.shareValue),
  });
}

/** Throws if `jobId` doesn't exist or doesn't belong to context.teamId.
 * Returns the job's totalPrice so callers can validate the split. */
async function requireJobInTeam(
  context: TeamContext,
  jobId: string
): Promise<{ totalPrice: number }> {
  const job = await prisma.job.findFirst({
    where: { id: jobId, teamId: context.teamId },
    select: { totalPrice: true },
  });

  if (!job) {
    throw new TeamContextError("ไม่พบงานนี้ในทีมของคุณ");
  }

  return { totalPrice: decimalToNumber(job.totalPrice) };
}

/**
 * Pure function: given a job's total and a flat list of assignments,
 * resolve each one's Baht amount and the leftover team pool. No I/O, no
 * validation throw — callers (create/update below) decide what to do with
 * a negative pool. Exported for the UI's "live calc" preview.
 */
export function calculateRevenueSplit(
  jobTotal: number,
  assignments: Array<{
    id: string;
    userId: string;
    roleOnJob?: string | null;
    shareType: ShareType;
    shareValue: number;
  }>
): RevenueSplit {
  const fixedTotal = round2(
    assignments.filter((a) => a.shareType === "FIXED").reduce((sum, a) => sum + a.shareValue, 0)
  );
  const remainingAfterFixed = Math.max(round2(jobTotal - fixedTotal), 0);

  const resolved = assignments.map((a) => {
    const amount =
      a.shareType === "FIXED" ? a.shareValue : round2(remainingAfterFixed * (a.shareValue / 100));

    return {
      assignmentId: a.id,
      userId: a.userId,
      roleOnJob: a.roleOnJob ?? null,
      shareType: a.shareType,
      shareValue: a.shareValue,
      amount,
    };
  });

  const assignedTotal = round2(resolved.reduce((sum, r) => sum + r.amount, 0));
  const teamPool = round2(jobTotal - assignedTotal);

  return { jobTotal, assignments: resolved, teamPool };
}

export async function listJobAssignments(
  context: TeamContext,
  jobId: string
): Promise<JobAssignment[]> {
  await requireJobInTeam(context, jobId);

  const rows = await prisma.jobAssignment.findMany({
    where: { jobId },
    orderBy: { createdAt: "asc" },
  });

  return rows.map(toJobAssignment);
}

/** The job's resolved split (existing assignments + team pool) — what the
 * "revenue split" section of the job detail page renders. */
export async function getJobRevenueSplit(
  context: TeamContext,
  jobId: string
): Promise<RevenueSplit> {
  const { totalPrice } = await requireJobInTeam(context, jobId);

  const rows = await prisma.jobAssignment.findMany({
    where: { jobId },
    orderBy: { createdAt: "asc" },
  });

  return calculateRevenueSplit(
    totalPrice,
    rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      roleOnJob: r.roleOnJob,
      shareType: r.shareType as ShareType,
      shareValue: decimalToNumber(r.shareValue),
    }))
  );
}

export async function createJobAssignment(
  context: TeamContext,
  input: JobAssignmentInput
): Promise<JobAssignment> {
  const parsed = jobAssignmentInputSchema.parse({ ...input, teamId: context.teamId });
  const { totalPrice } = await requireJobInTeam(context, parsed.jobId);

  const existing = await prisma.jobAssignment.findMany({
    where: { jobId: parsed.jobId },
    select: { id: true, userId: true, roleOnJob: true, shareType: true, shareValue: true },
  });

  const simulated = calculateRevenueSplit(totalPrice, [
    ...existing.map((r) => ({
      id: r.id,
      userId: r.userId,
      roleOnJob: r.roleOnJob,
      shareType: r.shareType as ShareType,
      shareValue: decimalToNumber(r.shareValue),
    })),
    {
      id: "__new__",
      userId: parsed.userId,
      roleOnJob: parsed.roleOnJob ?? null,
      shareType: parsed.shareType,
      shareValue: parsed.shareValue,
    },
  ]);

  // Tiny epsilon to tolerate rounding noise, not real overage.
  if (simulated.teamPool < -0.01) {
    throw new JobAssignmentValidationError();
  }

  const row = await prisma.jobAssignment.create({
    data: {
      jobId: parsed.jobId,
      userId: parsed.userId,
      roleOnJob: parsed.roleOnJob || null,
      shareType: parsed.shareType,
      shareValue: parsed.shareValue,
    },
  });

  return toJobAssignment(row);
}

export async function updateJobAssignment(
  context: TeamContext,
  input: UpdateJobAssignmentInput
): Promise<JobAssignment | null> {
  const parsed = updateJobAssignmentInputSchema.parse({ ...input, teamId: context.teamId });

  const current = await prisma.jobAssignment.findUnique({ where: { id: parsed.id } });
  if (!current) return null;

  const { totalPrice } = await requireJobInTeam(context, current.jobId);

  const existing = await prisma.jobAssignment.findMany({
    where: { jobId: current.jobId },
    select: { id: true, userId: true, roleOnJob: true, shareType: true, shareValue: true },
  });

  const nextShareType = parsed.shareType ?? (current.shareType as ShareType);
  const nextShareValue = parsed.shareValue ?? decimalToNumber(current.shareValue);
  const nextRoleOnJob = parsed.roleOnJob !== undefined ? parsed.roleOnJob : current.roleOnJob;

  const simulated = calculateRevenueSplit(
    totalPrice,
    existing.map((r) =>
      r.id === parsed.id
        ? {
            id: r.id,
            userId: r.userId,
            roleOnJob: nextRoleOnJob,
            shareType: nextShareType,
            shareValue: nextShareValue,
          }
        : {
            id: r.id,
            userId: r.userId,
            roleOnJob: r.roleOnJob,
            shareType: r.shareType as ShareType,
            shareValue: decimalToNumber(r.shareValue),
          }
    )
  );

  if (simulated.teamPool < -0.01) {
    throw new JobAssignmentValidationError();
  }

  const result = await prisma.jobAssignment.updateMany({
    where: { id: parsed.id, jobId: current.jobId },
    data: {
      ...(parsed.roleOnJob !== undefined && { roleOnJob: parsed.roleOnJob || null }),
      ...(parsed.shareType !== undefined && { shareType: parsed.shareType }),
      ...(parsed.shareValue !== undefined && { shareValue: parsed.shareValue }),
    },
  });

  if (result.count === 0) return null;

  const row = await prisma.jobAssignment.findUnique({ where: { id: parsed.id } });
  return row ? toJobAssignment(row) : null;
}

export async function deleteJobAssignment(context: TeamContext, id: string): Promise<boolean> {
  const row = await prisma.jobAssignment.findUnique({ where: { id }, select: { jobId: true } });
  if (!row) return false;

  await requireJobInTeam(context, row.jobId);

  await prisma.jobAssignment.delete({ where: { id } });
  return true;
}
