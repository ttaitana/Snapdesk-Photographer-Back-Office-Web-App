import { z } from "zod";
import { cuidSchema } from "./common";

// P9 — Calendar Sync (F4). See packages/db/prisma/schema.prisma's
// "P9 — Calendar Sync" section for the CalendarConnection model these mirror,
// and packages/core/src/calendar-sync for the service functions that use them.

/** Matches Better Auth's Account.providerId values for these two providers —
 * not a Prisma enum, plain string column (see CalendarConnection.provider). */
export const calendarProviderSchema = z.enum(["google", "microsoft"]);
export type CalendarProvider = z.infer<typeof calendarProviderSchema>;

/** One calendar as returned by the provider's "list calendars" API
 * (@snapdesk/integrations) — used to render the picker in Settings →
 * Integrations before the user has saved any selection. */
export const calendarInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  primary: z.boolean().optional(),
});
export type CalendarInfo = z.infer<typeof calendarInfoSchema>;

/** Whether the signed-in user has a connected Account for this provider —
 * "เชื่อมแล้ว/ยังไม่เชื่อม" (SPEC.md F4). Derived from Account, not stored. */
export const providerStatusSchema = z.object({
  provider: calendarProviderSchema,
  connected: z.boolean(),
});
export type ProviderStatus = z.infer<typeof providerStatusSchema>;

export const calendarConnectionSchema = z.object({
  id: cuidSchema,
  userId: cuidSchema,
  provider: calendarProviderSchema,
  calendarId: z.string(),
  calendarName: z.string(),
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
});
export type CalendarConnection = z.infer<typeof calendarConnectionSchema>;

/** Replaces the full set of selected calendars for one provider — the
 * Settings UI saves the whole checked/unchecked list at once rather than
 * toggling rows one at a time, so there's nothing to diff against partial
 * input. See replaceCalendarSelection in packages/core/src/calendar-sync. */
export const saveCalendarSelectionInputSchema = z.object({
  provider: calendarProviderSchema,
  calendars: z.array(calendarInfoSchema),
});
export type SaveCalendarSelectionInput = z.infer<typeof saveCalendarSelectionInputSchema>;

/** Per-provider map of {calendarId: eventId} — mirrors Job.calendarEventIds'
 * JSON shape exactly (see schema.prisma) so jobSchema can validate it without
 * a separate ad-hoc Json type. Both levels are partial: a job may not be
 * synced to every provider, and within a provider, only to some calendars. */
export const calendarEventIdsSchema = z.record(calendarProviderSchema, z.record(z.string(), z.string()));
export type CalendarEventIds = z.infer<typeof calendarEventIdsSchema>;
