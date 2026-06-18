// Jobs service — P2 Core Data Layer (TASKS.md).
//
// Same TeamContext-scoping rule as ../customers. `createdById` is always
// taken from `context.userId` (audit trail), never from client input.
// `totalPrice` is stored as Prisma.Decimal and converted to/from plain
// `number` at this boundary — see ../lib/decimal.

import { prisma, type Prisma } from "@snapdesk/db";
import {
  jobSchema,
  jobInputSchema,
  updateJobInputSchema,
  updateJobStatusInputSchema,
  sendQuotationInputSchema,
  jobFilterSchema,
  type Job,
  type JobInput,
  type UpdateJobInput,
  type UpdateJobStatusInput,
  type SendQuotationInput,
  type JobFilter,
} from "@snapdesk/types";
import type { TeamContext } from "../team-context";
import { decimalToNumber, nullableDecimalToNumber } from "../lib/decimal";

function toJob(row: {
  id: string;
  teamId: string;
  createdById: string;
  customerId: string;
  title: string;
  shootType: string | null;
  status: string;
  shootDate: Date | null;
  shootTime: string | null;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationUrl: string | null;
  description: string | null;
  checklist: unknown;
  totalPrice: { toNumber(): number };
  discount: { toNumber(): number } | null;
  quotedDeposit: { toNumber(): number } | null;
  quoteExpiresAt: Date | null;
  packageId: string | null;
  deliveryLink: string | null;
  createdAt: Date;
}): Job {
  return jobSchema.parse({
    ...row,
    checklist: row.checklist ?? null,
    totalPrice: decimalToNumber(row.totalPrice),
    discount: nullableDecimalToNumber(row.discount),
    quotedDeposit: nullableDecimalToNumber(row.quotedDeposit),
  });
}

/** Start-of-day boundary helpers for jobFilterSchema's "today"/"this_week". */
function dateRangeFor(range: JobFilter["range"]): { gte: Date; lt: Date } | null {
  if (range === "all") return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === "today") {
    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { gte: startOfToday, lt: tomorrow };
  }

  // this_week: Monday 00:00 through next Monday 00:00 (local server time).
  // Good enough for P2; timezone-aware boundaries are a P3+ concern.
  const dayOfWeek = startOfToday.getDay(); // 0 = Sunday
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(startOfToday);
  monday.setDate(monday.getDate() - diffToMonday);
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  return { gte: monday, lt: nextMonday };
}

export async function listJobs(
  context: TeamContext,
  filter?: Partial<Omit<JobFilter, "teamId">>
): Promise<Job[]> {
  const parsed = jobFilterSchema.parse({ ...filter, teamId: context.teamId });
  const shootDateRange = dateRangeFor(parsed.range);

  const rows = await prisma.job.findMany({
    where: {
      teamId: context.teamId,
      ...(parsed.status && { status: parsed.status }),
      ...(shootDateRange && { shootDate: shootDateRange }),
      ...(parsed.customerId && { customerId: parsed.customerId }),
    },
    orderBy: { shootDate: "asc" },
  });

  return rows.map(toJob);
}

export async function getJob(context: TeamContext, id: string): Promise<Job | null> {
  const row = await prisma.job.findFirst({
    where: { id, teamId: context.teamId },
  });

  return row ? toJob(row) : null;
}

export async function createJob(context: TeamContext, input: JobInput): Promise<Job> {
  const parsed = jobInputSchema.parse({ ...input, teamId: context.teamId });

  const row = await prisma.job.create({
    data: {
      teamId: context.teamId,
      createdById: context.userId,
      customerId: parsed.customerId,
      title: parsed.title,
      shootType: parsed.shootType || null,
      shootDate: parsed.shootDate ?? null,
      shootTime: parsed.shootTime || null,
      locationName: parsed.locationName || null,
      locationLat: parsed.locationLat ?? null,
      locationLng: parsed.locationLng ?? null,
      locationUrl: parsed.locationUrl || null,
      description: parsed.description || null,
      checklist: (parsed.checklist ?? undefined) as Prisma.InputJsonValue | undefined,
      totalPrice: parsed.totalPrice,
      discount: parsed.discount ?? 0,
      quotedDeposit: parsed.quotedDeposit ?? null,
      quoteExpiresAt: parsed.quoteExpiresAt ?? null,
      packageId: parsed.packageId || null,
    },
  });

  return toJob(row);
}

export async function updateJob(
  context: TeamContext,
  input: UpdateJobInput
): Promise<Job | null> {
  const parsed = updateJobInputSchema.parse({ ...input, teamId: context.teamId });

  const result = await prisma.job.updateMany({
    where: { id: parsed.id, teamId: context.teamId },
    data: {
      ...(parsed.customerId !== undefined && { customerId: parsed.customerId }),
      ...(parsed.title !== undefined && { title: parsed.title }),
      ...(parsed.shootType !== undefined && { shootType: parsed.shootType || null }),
      ...(parsed.shootDate !== undefined && { shootDate: parsed.shootDate ?? null }),
      ...(parsed.shootTime !== undefined && { shootTime: parsed.shootTime || null }),
      ...(parsed.locationName !== undefined && {
        locationName: parsed.locationName || null,
      }),
      ...(parsed.locationLat !== undefined && { locationLat: parsed.locationLat ?? null }),
      ...(parsed.locationLng !== undefined && { locationLng: parsed.locationLng ?? null }),
      ...(parsed.locationUrl !== undefined && { locationUrl: parsed.locationUrl || null }),
      ...(parsed.description !== undefined && { description: parsed.description || null }),
      ...(parsed.checklist !== undefined && {
        checklist: parsed.checklist as Prisma.InputJsonValue,
      }),
      ...(parsed.totalPrice !== undefined && { totalPrice: parsed.totalPrice }),
      ...(parsed.discount !== undefined && { discount: parsed.discount }),
      ...(parsed.quotedDeposit !== undefined && { quotedDeposit: parsed.quotedDeposit }),
      ...(parsed.quoteExpiresAt !== undefined && { quoteExpiresAt: parsed.quoteExpiresAt }),
      ...(parsed.packageId !== undefined && { packageId: parsed.packageId || null }),
    },
  });

  if (result.count === 0) return null;
  return getJob(context, parsed.id);
}

export async function updateJobStatus(
  context: TeamContext,
  input: UpdateJobStatusInput
): Promise<Job | null> {
  const parsed = updateJobStatusInputSchema.parse({ ...input, teamId: context.teamId });

  const result = await prisma.job.updateMany({
    where: { id: parsed.jobId, teamId: context.teamId },
    data: { status: parsed.status },
  });

  if (result.count === 0) return null;
  return getJob(context, parsed.jobId);
}

/**
 * P4 — "ส่งใบเสนอราคา" (F2): marks a job QUOTED. Kept separate from
 * updateJobStatus so the quotation-send action reads as its own domain
 * concept rather than an arbitrary status transition (and so future
 * side-effects specific to sending, e.g. a sentAt timestamp, have a home).
 */
export async function sendQuotation(
  context: TeamContext,
  input: SendQuotationInput
): Promise<Job | null> {
  const parsed = sendQuotationInputSchema.parse({ ...input, teamId: context.teamId });

  const result = await prisma.job.updateMany({
    where: { id: parsed.jobId, teamId: context.teamId },
    data: { status: "QUOTED" },
  });

  if (result.count === 0) return null;
  return getJob(context, parsed.jobId);
}

export async function deleteJob(context: TeamContext, id: string): Promise<boolean> {
  const result = await prisma.job.deleteMany({
    where: { id, teamId: context.teamId },
  });

  return result.count > 0;
}
