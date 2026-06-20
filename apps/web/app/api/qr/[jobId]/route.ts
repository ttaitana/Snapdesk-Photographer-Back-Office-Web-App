// Public QR redirect endpoint — P8 "job: QR scan count" (TASKS.md).
//
// The DeliveryQr image (packages/core/src/delivery-qr) now encodes this URL
// instead of the customer's Drive/OneDrive link directly, so every scan
// passes through here first: bump the scan count (via the worker, not
// inline — see note below) then 302 straight to the real link.
//
// Deliberately public (see middleware.ts PUBLIC_PATHS) — the customer
// scanning this is never logged in. `jobId` doubles as an unguessable
// capability token (cuid), same security model P7 used when the QR encoded
// sourceUrl directly; we're not introducing a new trust boundary, just
// adding a hop.

import { NextResponse, type NextRequest } from "next/server";
import { getDeliveryQrSourceForRedirect } from "@snapdesk/core";

import { enqueueQrScan } from "@/lib/queue";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const deliveryQr = await getDeliveryQrSourceForRedirect(jobId);
  if (!deliveryQr) {
    return new NextResponse("ไม่พบลิงก์งานนี้", { status: 404 });
  }

  // Enqueue rather than incrementing inline — keeps this redirect fast (the
  // customer is waiting) and lets the worker's retry policy absorb a
  // momentary Redis/DB hiccup instead of failing the redirect outright. If
  // REDIS_URL isn't set, enqueueQrScan no-ops (graceful degrade) and the
  // redirect still happens — scan counting is a nice-to-have, never a
  // blocker for delivering the actual file.
  await enqueueQrScan(jobId);

  return NextResponse.redirect(deliveryQr.sourceUrl);
}
