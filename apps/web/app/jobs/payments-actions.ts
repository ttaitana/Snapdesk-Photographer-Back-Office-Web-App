"use server";

// Thin Server Actions for payments — P2 Core Data Layer (TASKS.md).
// Lives under app/jobs because every payment is reached through its job
// (Payment has no teamId of its own — see packages/core/src/payments).
// P4 ("F3 tracking + แบ่งรายได้") builds the "บันทึกรับเงิน" UI that calls
// these.

import {
  listPayments as listPaymentsService,
  getPayment as getPaymentService,
  createPayment as createPaymentService,
  deletePayment as deletePaymentService,
} from "@snapdesk/core";
import type { Payment, PaymentInput } from "@snapdesk/types";

import { requireActionContext } from "@/lib/require-action-context";

export async function listPaymentsAction(jobId: string): Promise<Payment[]> {
  const context = await requireActionContext();
  return listPaymentsService(context, jobId);
}

export async function getPaymentAction(id: string): Promise<Payment | null> {
  const context = await requireActionContext();
  return getPaymentService(context, id);
}

export async function createPaymentAction(input: PaymentInput): Promise<Payment> {
  const context = await requireActionContext();
  return createPaymentService(context, input);
}

export async function deletePaymentAction(id: string): Promise<boolean> {
  const context = await requireActionContext();
  return deletePaymentService(context, id);
}
