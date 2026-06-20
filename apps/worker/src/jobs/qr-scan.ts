// qr-scan processor — P8 "job: นับจำนวนสแกน QR" (TASKS.md). Enqueued by the
// public redirect route, apps/web/app/api/qr/[jobId]/route.ts, on every scan.

import { incrementDeliveryQrScanCount } from "@snapdesk/core";
import type { Job, QrScanJobData } from "@snapdesk/queue";

export async function processQrScan(job: Job<QrScanJobData>): Promise<void> {
  // No existence check before incrementing — incrementDeliveryQrScanCount
  // (packages/core/src/delivery-qr) is itself a no-op if the DeliveryQr row
  // doesn't exist (e.g. it was deleted/regenerated after the redirect
  // already happened), so there's nothing extra to guard here.
  await incrementDeliveryQrScanCount(job.data.jobId);
}
