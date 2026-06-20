// DeliveryQr service — P7 F6 "ส่งมอบงานผ่าน QR": paste a Drive/OneDrive link
// on a job, generate a QR, and let the photographer retrieve the link again /
// download the QR image / copy the link for chat.
//
// DeliveryQr has no teamId of its own (only jobId, like Payment/
// JobAssignment) — same requireJobInTeam guard. One row per job (jobId is
// @unique in schema.prisma): setDeliveryQr() upserts, so pasting a new link
// replaces the existing QR rather than creating a second one.
//
// ── P8 update: QR now encodes our own redirect URL, not sourceUrl directly ──
// P7 originally encoded sourceUrl itself (zero app involvement). TASKS.md P8
// added "job: QR scan count", which needs every scan to pass through our own
// endpoint first — so the QR now encodes `${appUrl}/api/qr/{jobId}`
// (apps/web/app/api/qr/[jobId]/route.ts), which enqueues a scan-count job
// and 302s to the real sourceUrl. `appUrl` is passed in by the caller
// (apps/web), never read from env in here — same convention as
// packages/auth/src/email/invite-email.ts's `baseURL`. QR images generated
// before this change still encode the old direct link; they keep working
// (the link itself didn't change) but won't count scans until regenerated.

import QRCode from "qrcode";
import { prisma } from "@snapdesk/db";
import {
  deliveryQrSchema,
  setDeliveryQrInputSchema,
  type DeliveryQr,
  type SetDeliveryQrInput,
} from "@snapdesk/types";
import type { TeamContext } from "../team-context";
import { TeamContextError } from "../team-context";

function toDeliveryQr(row: {
  id: string;
  jobId: string;
  sourceUrl: string;
  provider: string | null;
  qrImageUrl: string;
  scanCount: number;
  createdAt: Date;
  updatedAt: Date;
}): DeliveryQr {
  return deliveryQrSchema.parse(row);
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

/** Infers the provider from the link's host so the user doesn't have to pick
 * it themselves — SPEC.md just says "วาง link ไหนก็ได้". Returns null for
 * any other host (still a valid delivery link, just not one we recognize). */
export function detectProvider(sourceUrl: string): "google" | "onedrive" | null {
  let host: string;
  try {
    host = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (host.includes("drive.google.com") || host.includes("docs.google.com")) {
    return "google";
  }
  if (host.includes("onedrive.live.com") || host.includes("1drv.ms") || host.includes("sharepoint.com")) {
    return "onedrive";
  }
  return null;
}

export async function getDeliveryQr(context: TeamContext, jobId: string): Promise<DeliveryQr | null> {
  await requireJobInTeam(context, jobId);

  const row = await prisma.deliveryQr.findUnique({ where: { jobId } });
  return row ? toDeliveryQr(row) : null;
}

/** Generates (or regenerates) the QR for a job's delivery link and upserts
 * it — pasting a new link replaces the old QR/sourceUrl in place.
 *
 * `appUrl` builds the redirect URL the QR actually encodes (see file header
 * note) — pass `env.APP_URL` from apps/web, e.g.
 * `setDeliveryQrAction` → `setDeliveryQrService(context, input, env.APP_URL)`. */
export async function setDeliveryQr(
  context: TeamContext,
  input: SetDeliveryQrInput,
  appUrl: string
): Promise<DeliveryQr> {
  const parsed = setDeliveryQrInputSchema.parse({ ...input, teamId: context.teamId });
  await requireJobInTeam(context, parsed.jobId);

  const provider = detectProvider(parsed.sourceUrl);
  const redirectUrl = `${appUrl.replace(/\/$/, "")}/api/qr/${parsed.jobId}`;
  const qrImageUrl = await QRCode.toDataURL(redirectUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });

  const row = await prisma.deliveryQr.upsert({
    where: { jobId: parsed.jobId },
    create: { jobId: parsed.jobId, sourceUrl: parsed.sourceUrl, provider, qrImageUrl },
    update: { sourceUrl: parsed.sourceUrl, provider, qrImageUrl },
  });

  return toDeliveryQr(row);
}

export async function deleteDeliveryQr(context: TeamContext, jobId: string): Promise<boolean> {
  await requireJobInTeam(context, jobId);

  const existing = await prisma.deliveryQr.findUnique({ where: { jobId }, select: { jobId: true } });
  if (!existing) return false;

  await prisma.deliveryQr.delete({ where: { jobId } });
  return true;
}

/**
 * Unscoped reads/writes below — no TeamContext, by design. Both callers are
 * outside any user session: the public QR redirect route (a customer
 * scanning a code, never logged in) and apps/worker's qr-scan processor (a
 * trusted background process acting on a jobId it was told to process by
 * that same redirect route, which already resolved it from an unguessable
 * cuid). Never expose these through a Server Action — they intentionally
 * skip the requireJobInTeam check every team-facing function above uses.
 */

export async function getDeliveryQrSourceForRedirect(
  jobId: string
): Promise<{ sourceUrl: string } | null> {
  const row = await prisma.deliveryQr.findUnique({
    where: { jobId },
    select: { sourceUrl: true },
  });
  return row;
}

export async function incrementDeliveryQrScanCount(jobId: string): Promise<void> {
  await prisma.deliveryQr.updateMany({
    where: { jobId },
    data: { scanCount: { increment: 1 } },
  });
}
