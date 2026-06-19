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

export async function getDeliveryQrAction(jobId: string): Promise<DeliveryQr | null> {
  const context = await requireActionContext();
  return getDeliveryQrService(context, jobId);
}

export async function setDeliveryQrAction(input: SetDeliveryQrInput): Promise<DeliveryQr> {
  const context = await requireActionContext();
  return setDeliveryQrService(context, input);
}

export async function deleteDeliveryQrAction(jobId: string): Promise<boolean> {
  const context = await requireActionContext();
  return deleteDeliveryQrService(context, jobId);
}
