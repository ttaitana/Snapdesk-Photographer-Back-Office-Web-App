// Payments service — P2 Core Data Layer (TASKS.md).
//
// The Payment table has no `teamId` column (only `jobId` — matches SPEC.md
// §4 exactly), so it can't be scoped directly. Every function here first
// resolves the parent Job scoped by `context.teamId` and 404s (returns
// null/throws) if that lookup fails — this is what stops a caller from
// reading/writing payments on a job that belongs to a different team via a
// guessed or leaked jobId.
//
// whtAmount/netReceived are always computed here, server-side, from
// `amount` and `whtRate` — paymentInputSchema deliberately doesn't accept
// them from the client (SPEC.md §5 Feature 7). There is no "update payment"
// operation: payments are financial records, so corrections are made by
// deleting and re-recording rather than mutating history in place.

import { prisma } from "@snapdesk/db";
import {
  paymentSchema,
  paymentInputSchema,
  type Payment,
  type PaymentInput,
} from "@snapdesk/types";
import type { TeamContext } from "../team-context";
import { TeamContextError } from "../team-context";
import { decimalToNumber, nullableDecimalToNumber } from "../lib/decimal";

function toPayment(row: {
  id: string;
  jobId: string;
  amount: { toNumber(): number };
  whtRate: { toNumber(): number };
  whtAmount: { toNumber(): number };
  netReceived: { toNumber(): number } | null;
  type: string;
  paidAt: Date;
  method: string | null;
  note: string | null;
}): Payment {
  return paymentSchema.parse({
    ...row,
    amount: decimalToNumber(row.amount),
    whtRate: decimalToNumber(row.whtRate),
    whtAmount: decimalToNumber(row.whtAmount),
    netReceived: nullableDecimalToNumber(row.netReceived),
  });
}

/** Throws if `jobId` doesn't exist or doesn't belong to context.teamId. */
async function requireJobInTeam(context: TeamContext, jobId: string): Promise<void> {
  const job = await prisma.job.findFirst({
    where: { id: jobId, teamId: context.teamId },
    select: { id: true },
  });

  if (!job) {
    throw new TeamContextError("ไม่พบงานนี้ในทีมของคุณ");
  }
}

export async function listPayments(context: TeamContext, jobId: string): Promise<Payment[]> {
  await requireJobInTeam(context, jobId);

  const rows = await prisma.payment.findMany({
    where: { jobId },
    orderBy: { paidAt: "desc" },
  });

  return rows.map(toPayment);
}

export async function getPayment(
  context: TeamContext,
  id: string
): Promise<Payment | null> {
  const row = await prisma.payment.findUnique({ where: { id } });
  if (!row) return null;

  // The payment itself doesn't carry teamId, so confirm its job does
  // before returning anything — same guard as every other entry point.
  await requireJobInTeam(context, row.jobId);

  return toPayment(row);
}

export async function createPayment(
  context: TeamContext,
  input: PaymentInput
): Promise<Payment> {
  const parsed = paymentInputSchema.parse({ ...input, teamId: context.teamId });
  await requireJobInTeam(context, parsed.jobId);

  const whtAmount = round2((parsed.amount * parsed.whtRate) / 100);
  const netReceived = round2(parsed.amount - whtAmount);

  const row = await prisma.payment.create({
    data: {
      jobId: parsed.jobId,
      amount: parsed.amount,
      whtRate: parsed.whtRate,
      whtAmount,
      netReceived,
      type: parsed.type,
      method: parsed.method || null,
      note: parsed.note || null,
    },
  });

  return toPayment(row);
}

export async function deletePayment(context: TeamContext, id: string): Promise<boolean> {
  const row = await prisma.payment.findUnique({ where: { id }, select: { jobId: true } });
  if (!row) return false;

  await requireJobInTeam(context, row.jobId);

  await prisma.payment.delete({ where: { id } });
  return true;
}

/** Avoid float noise like 333.33000000000004 in computed money fields. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
