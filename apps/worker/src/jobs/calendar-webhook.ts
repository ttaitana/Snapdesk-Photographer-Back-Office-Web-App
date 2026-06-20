// calendar-webhook processor — P8 "job: รับ/ประมวลผล webhook จาก Google/MS"
// (TASKS.md). Enqueued by app/api/webhooks/google-calendar and
// app/api/webhooks/microsoft-calendar.
//
// ── Honest stub, not fake sync logic ──
// The user explicitly chose to build this job now (via AskUserQuestion)
// despite there being no Calendar OAuth, no stored access/refresh tokens,
// and no Job ↔ calendarEventId mapping in the schema — all of that is P9
// "Calendar Sync" per TASKS.md, not yet built. Without that mapping there is
// nothing real to do with a notification: we don't know which Job (if any)
// a given Google/MS calendar event corresponds to, and we have no
// credentials to call back into Google/MS to fetch the changed event's
// details even if we did.
//
// So this processor logs what it received and returns — it deliberately
// does NOT pretend to sync anything. When P9 adds token storage and an
// event-ID mapping, replace the body below with the real lookup + sync;
// the queue/worker plumbing around it (retry, dead-letter, this job type)
// already works and won't need to change.
import type { CalendarWebhookJobData, Job } from "@snapdesk/queue";

export async function processCalendarWebhook(job: Job<CalendarWebhookJobData>): Promise<void> {
  console.warn(
    `[calendar-webhook] received ${job.data.provider} notification (no-op — P9 Calendar Sync not built yet):`,
    JSON.stringify(job.data.payload)
  );
}
