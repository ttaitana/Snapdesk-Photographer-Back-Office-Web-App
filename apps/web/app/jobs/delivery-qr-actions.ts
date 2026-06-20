"use server";

// Thin Server Actions for the delivery QR — P7 F6 (TASKS.md). Lives under
// app/jobs like job-assignments-actions.ts since DeliveryQr has no teamId of
// its own (scoped via the parent Job — see packages/core/src/delivery-qr).

import {
  getDeliveryQr as getDeliveryQrService,
  setDeliveryQr as setDeliveryQrService,
  deleteDeliveryQr as deleteDeliveryQrService,
  getProviderStatuses,
  listDriveFiles as listDriveFilesService,
} from "@snapdesk/core";
import type { CalendarProvider, DeliveryQr, SetDeliveryQrInput } from "@snapdesk/types";
// DriveFile lives in @snapdesk/integrations, not @snapdesk/types — see that
// package's file-types.ts header (zero @snapdesk/types dependency by design).
import type { DriveFile } from "@snapdesk/integrations";

import { requireActionContext, requireUserId } from "@/lib/require-action-context";
import { env, calendarProviderConfig } from "@/lib/env";

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

// ── P7 (unblocked by P9) — Drive/OneDrive file picker ───────────────────────
// userId-scoped, not team-scoped — see packages/core/src/file-picker's
// header note (Drive/OneDrive connections are a personal resource, same as
// Calendar Sync, not a per-team one).

/** Which providers (if any) this user has already connected — drives which
 * tabs delivery-file-picker.tsx shows. Reuses the same getProviderStatuses
 * Settings → Integrations uses; "connected" here doesn't guarantee the
 * Drive/Files scope specifically (see scopes.ts's reconnect-to-upgrade
 * note) — listDriveFilesAction surfaces that as a thrown error if so. */
export async function getConnectedProvidersAction(): Promise<CalendarProvider[]> {
  const userId = await requireUserId();
  const statuses = await getProviderStatuses(userId);
  return statuses.filter((s) => s.connected).map((s) => s.provider);
}

export async function listDriveFilesAction(
  provider: CalendarProvider,
  query?: string
): Promise<DriveFile[]> {
  const userId = await requireUserId();
  return listDriveFilesService(userId, provider, calendarProviderConfig, query);
}
