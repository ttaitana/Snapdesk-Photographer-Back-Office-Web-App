// Producer-side queue helpers — P8 Worker & Queue (TASKS.md). Thin wrapper
// around @snapdesk/queue that adds this app's graceful-degrade convention
// (see lib/env.ts: "features built on top of [optional integrations] must
// gracefully degrade ... rather than throw") for when REDIS_URL isn't set.
//
// Called from Server Actions (app/jobs/actions.ts, app/jobs/delivery-qr-actions.ts)
// and the public route handlers (app/api/qr/[jobId], app/api/webhooks/*) —
// never import @snapdesk/queue directly from those call sites, so the
// degrade behavior stays in one place.

import {
  enqueueShootReminder,
  cancelShootReminder as cancelShootReminderQueue,
  enqueueQrScan as enqueueQrScanQueue,
  enqueueCalendarWebhook as enqueueCalendarWebhookQueue,
  type CalendarWebhookJobData,
} from "@snapdesk/queue";
import { env } from "./env";

/** How far before shootDate the reminder fires. Hardcoded rather than a new
 * env var/setting — keeps the surface area small until someone actually
 * needs it configurable (SPEC.md's "minimal/readable" principle). */
const SHOOT_REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

function warnDegraded(action: string): void {
  console.warn(`[queue] REDIS_URL not set — skipping ${action} (see lib/env.ts integrations.redis)`);
}

/** Call after create/update whenever a job's shootDate may have changed.
 * Pass the job's *current* shootDate (or null) — this both (re)schedules
 * and cancels as needed, so callers don't have to branch. */
export async function scheduleShootReminder(jobId: string, shootDate: Date | null): Promise<void> {
  const { REDIS_URL } = env;
  if (!REDIS_URL) return warnDegraded(`reminder schedule for job ${jobId}`);

  if (!shootDate) {
    await cancelShootReminderQueue(REDIS_URL, jobId);
    return;
  }

  const runAt = new Date(shootDate.getTime() - SHOOT_REMINDER_LEAD_MS);
  if (runAt.getTime() <= Date.now()) {
    // Shoot day is sooner than the lead time (or already past) — a
    // "reminder before the shoot" no longer makes sense; skip rather than
    // firing one immediately. Still cancel any previously-scheduled one
    // (e.g. shootDate was pulled closer after a reminder was already queued).
    await cancelShootReminderQueue(REDIS_URL, jobId);
    return;
  }

  await enqueueShootReminder(REDIS_URL, { jobId }, runAt);
}

/** Call on delete (or when explicitly clearing shootDate). */
export async function cancelShootReminder(jobId: string): Promise<void> {
  const { REDIS_URL } = env;
  if (!REDIS_URL) return warnDegraded(`reminder cancel for job ${jobId}`);
  await cancelShootReminderQueue(REDIS_URL, jobId);
}

/** Fire-and-forget from the public QR redirect route — must stay fast since
 * the customer is waiting on the redirect. */
export async function enqueueQrScan(jobId: string): Promise<void> {
  const { REDIS_URL } = env;
  if (!REDIS_URL) return warnDegraded(`qr scan count for job ${jobId}`);
  await enqueueQrScanQueue(REDIS_URL, { jobId });
}

/** Called from the webhook receiver routes — must also stay fast, both
 * providers expect a prompt 200 ack. */
export async function enqueueCalendarWebhook(data: CalendarWebhookJobData): Promise<void> {
  const { REDIS_URL } = env;
  if (!REDIS_URL) return warnDegraded(`calendar webhook (${data.provider})`);
  await enqueueCalendarWebhookQueue(REDIS_URL, data);
}
