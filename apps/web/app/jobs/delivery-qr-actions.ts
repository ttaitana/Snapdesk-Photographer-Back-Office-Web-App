"use server";

// Thin Server Actions for the delivery QR — P7 F6 (TASKS.md). Lives under
// app/jobs like job-assignments-actions.ts since DeliveryQr has no teamId of
// its own (scoped via the parent Job — see packages/core/src/delivery-qr).

import {
  getDeliveryQr as getDeliveryQrService,
  setDeliveryQr as setDeliveryQrService,
  deleteDeliveryQr as deleteDeliveryQrService,
} from "@snapdesk/core";
import type { DeliveryQr, SetDeliveryQrInput } from "@snapdesk/types";

import { requireActionContext } from "@/lib/require-action-context";
import { env } from "@/lib/env";

export async function getDeliveryQrAction(jobId: string): Promise<DeliveryQr | null> {
  const context = await requireActionContext();
  return getDeliveryQrService(context, jobId);
}

/** Passes APP_URL so the QR encodes our own redirect endpoint (P8) —
 * see the file header note in packages/core/src/delivery-qr. */
export async function setDeliveryQrAction(input: SetDeliveryQrInput): Promise<DeliveryQr> {
  const context = await requireActionContext();
  return setDeliveryQrService(context, input, env.APP_URL);
}

export async function deleteDeliveryQrAction(jobId: string): Promise<boolean> {
  const context = await requireActionContext();
  return deleteDeliveryQrService(context, jobId);
}
