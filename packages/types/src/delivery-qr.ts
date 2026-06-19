import { z } from "zod";
import { cuidSchema } from "./common";

export const deliveryQrSchema = z.object({
  id: cuidSchema,
  jobId: cuidSchema,
  sourceUrl: z.string().url("กรุณาใส่ลิงก์ที่ถูกต้อง"),
  /// Auto-detected — see detectProvider() in packages/core/src/delivery-qr.
  provider: z.string().nullable().optional(),
  qrImageUrl: z.string(),
  scanCount: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type DeliveryQr = z.infer<typeof deliveryQrSchema>;

/** Paste-link input — generates (or regenerates, replacing the existing
 * row) the QR for a job's delivery link. provider is never accepted from
 * the client; the service always re-detects it from sourceUrl. */
export const setDeliveryQrInputSchema = z.object({
  teamId: cuidSchema,
  jobId: cuidSchema,
  sourceUrl: z.string().url("กรุณาใส่ลิงก์ Google Drive หรือ OneDrive ที่ถูกต้อง"),
});
export type SetDeliveryQrInput = z.infer<typeof setDeliveryQrInputSchema>;
