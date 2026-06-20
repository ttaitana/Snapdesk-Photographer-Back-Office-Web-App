import { z } from "zod";
import { cuidSchema } from "./common";
import { jobStatusSchema } from "./enums";
import { calendarEventIdsSchema } from "./calendar";

export const checklistItemSchema = z.object({
  id: z.string(),
  item: z.string().min(1),
  done: z.boolean().default(false),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const jobSchema = z.object({
  id: cuidSchema,
  teamId: cuidSchema,
  createdById: cuidSchema,
  customerId: cuidSchema,
  title: z.string().min(1),
  shootType: z.string().nullable().optional(),
  status: jobStatusSchema,
  shootDate: z.coerce.date().nullable().optional(),
  shootTime: z.string().nullable().optional(),
  locationName: z.string().nullable().optional(),
  locationLat: z.number().nullable().optional(),
  locationLng: z.number().nullable().optional(),
  locationUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  checklist: z.array(checklistItemSchema).nullable().optional(),
  totalPrice: z.number().nonnegative(),
  /// P4 — ใบเสนอราคา (F2) fields. discount/quotedDeposit are absolute Baht
  /// amounts, matching totalPrice's own unit (not a %).
  discount: z.number().nonnegative().nullable().optional(),
  quotedDeposit: z.number().nonnegative().nullable().optional(),
  quoteExpiresAt: z.coerce.date().nullable().optional(),
  packageId: cuidSchema.nullable().optional(),
  deliveryLink: z.string().nullable().optional(),
  /// P9 — written by apps/worker's calendar-sync processor only, never
  /// accepted as client input (see jobInputSchema/updateJobInputSchema below,
  /// which deliberately omit it). See CalendarEventIds in ./calendar.ts.
  calendarEventIds: calendarEventIdsSchema.nullable().optional(),
  createdAt: z.coerce.date(),
});
export type Job = z.infer<typeof jobSchema>;

export const jobInputSchema = z.object({
  teamId: cuidSchema,
  customerId: cuidSchema,
  title: z.string().min(1, "กรุณากรอกชื่องาน"),
  shootType: z.string().optional(),
  shootDate: z.coerce.date().optional(),
  shootTime: z.string().optional(),
  locationName: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  locationUrl: z.string().optional(),
  description: z.string().optional(),
  checklist: z.array(checklistItemSchema).optional(),
  totalPrice: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().optional(),
  quotedDeposit: z.number().nonnegative().optional(),
  quoteExpiresAt: z.coerce.date().optional(),
  packageId: cuidSchema.optional(),
});
export type JobInput = z.infer<typeof jobInputSchema>;

export const updateJobStatusInputSchema = z.object({
  teamId: cuidSchema,
  jobId: cuidSchema,
  status: jobStatusSchema,
});
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusInputSchema>;

// General field edits (title/date/location/checklist/etc). Status changes go
// through updateJobStatusInputSchema above instead — kept separate so the
// "move this job to the next status" action (P3 timeline) can't accidentally
// also overwrite unrelated fields.
export const updateJobInputSchema = jobInputSchema.partial().extend({
  id: cuidSchema,
  teamId: cuidSchema,
});
export type UpdateJobInput = z.infer<typeof updateJobInputSchema>;

// P4 — "ส่งใบเสนอราคา" action: marks a job QUOTED. Separate from
// updateJobStatusInputSchema's generic status-set for the same reason as
// that schema itself — keeps the quotation-send semantics (and future
// side-effects, e.g. logging a sent-at timestamp) distinct from an arbitrary
// timeline status change.
export const sendQuotationInputSchema = z.object({
  teamId: cuidSchema,
  jobId: cuidSchema,
});
export type SendQuotationInput = z.infer<typeof sendQuotationInputSchema>;

export const jobFilterSchema = z.object({
  teamId: cuidSchema,
  status: jobStatusSchema.optional(),
  range: z.enum(["today", "this_week", "all"]).default("all"),
  /// Added for the customer detail page (task #12, TASKS.md F5: "ประวัติงาน
  /// ทั้งหมด") — lets it fetch just one customer's jobs instead of the whole
  /// team's list.
  customerId: cuidSchema.optional(),
});
export type JobFilter = z.infer<typeof jobFilterSchema>;
