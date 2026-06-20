// @snapdesk/queue — BullMQ wrapper shared by apps/web (producer) and
// apps/worker (consumer). P8 — Worker & Queue (TASKS.md).
//
// SPEC.md §7: "งานที่ side-effect/ช้า/ต้อง retry → web แค่ enqueue ลง
// packages/queue แล้วให้ apps/worker ทำต่อ" — this package only defines
// *what* the queues are and *how* jobs are added/processed; it has zero
// business logic of its own (that lives in apps/worker/src/jobs/* and the
// @snapdesk/core reads they call).
//
// Connection handling: BullMQ requires `maxRetriesPerRequest: null` on the
// ioredis connection it's given (https://docs.bullmq.io — "Connections").
// Each process (web or worker) only ever talks to one Redis instance, so
// queues are cached per-name within a single process rather than per
// (name, redisUrl) pair — if that assumption ever changes, switch the cache
// key to include redisUrl too.
//
// package.json pins `ioredis` to the EXACT version bullmq itself depends on
// (not a `^` range) — bullmq's `ConnectionOptions` type expects its own
// bundled `Redis` class. A different installed copy of ioredis (e.g. our
// own `^5.4.1` resolving to a newer patch than bullmq's pinned one) makes
// pnpm install two separate copies; tsc then treats their `Redis` classes
// as incompatible nominal types (private/protected members differ) and
// `new Worker(...)`/`new Queue(...)` fail to typecheck. Keep this pin in
// sync with whatever version bullmq's own package.json pins.

import { Queue, Worker, type Job, type Processor } from "bullmq";
import IORedis, { type Redis } from "ioredis";

// Re-exported so apps/worker's job processors (apps/worker/src/jobs/*) can
// type `(job: Job<...>) => Promise<void>` without taking their own direct
// dependency on `bullmq` — keeping this package the single place that
// version is pinned/imported from avoids the exact kind of dual-installed-
// package version mismatch the ioredis pin above already had to work around.
export type { Job, Processor };

export const QUEUE_NAMES = {
  shootReminder: "shoot-reminder",
  qrScan: "qr-scan",
  calendarWebhook: "calendar-webhook",
  calendarSync: "calendar-sync",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** jobId of the Job (TASKS.md model) the reminder is for — never the
 * BullMQ job id itself. The BullMQ job id is deterministically derived
 * (`reminder:${jobId}`) so rescheduling/cancelling is a lookup, not a scan —
 * see enqueueShootReminder/cancelShootReminder. */
export interface ShootReminderJobData {
  jobId: string;
}

export interface QrScanJobData {
  jobId: string;
}

/** `payload` is whatever the provider's webhook body/headers were — see
 * apps/web/app/api/webhooks/*. Processing it is a P9 concern (no Calendar
 * OAuth/token storage exists yet); see apps/worker/src/jobs/calendar-webhook.ts. */
export interface CalendarWebhookJobData {
  provider: "google" | "microsoft";
  payload: unknown;
  receivedAt: string;
}

/**
 * P9 — Calendar Sync (F4). Enqueued by apps/web/lib/queue.ts
 * (scheduleCalendarSync) on every job create/update/delete, for whichever
 * user triggered the action (`userId` — "the token of whoever clicked the
 * action", not the job's createdById).
 *
 * `calendarEventIds` mirrors @snapdesk/types's CalendarEventIds shape
 * (`{provider: {calendarId: eventId}}`) without importing that package —
 * same "plain literal, no cross-package type import" style already used
 * for CalendarWebhookJobData's `provider` field above. Only read for
 * action:"delete" — see packages/core/src/calendar-sync's
 * syncJobToCalendars for why a delete needs this snapshot instead of
 * reading Job.calendarEventIds back from the DB (the row is already gone
 * by the time this job runs).
 */
export interface CalendarSyncJobData {
  jobId: string;
  userId: string;
  action: "upsert" | "delete";
  calendarEventIds?: Record<string, Record<string, string>> | null;
}

/**
 * Retry policy + dead-letter handling (TASKS.md P8):
 * - 5 attempts, exponential backoff starting at 5s (5s, 10s, 20s, 40s, 80s).
 * - Failed jobs are NOT deleted after exhausting retries (`removeOnFail`
 *   keeps the most recent 1000) — that's the "dead letter" inspection
 *   surface: `pnpm --filter @snapdesk/worker exec node -e "..."` or
 *   `redis-cli`/BullMQ UI can list them. A dedicated DLQ store would be
 *   overkill at this project's scale; createQueueWorker() below also logs a
 *   clear `[dead-letter]` line the moment a job exhausts its retries so
 *   exhaustion is visible without needing to inspect Redis.
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 60 * 60 * 24, count: 500 },
  removeOnFail: { count: 1000 },
} as const;

function createRedisConnection(redisUrl: string): Redis {
  return new IORedis(redisUrl, { maxRetriesPerRequest: null });
}

const queueCache = new Map<string, Queue>();

/** Producer-side: lazily creates (and caches) the BullMQ Queue for `name`.
 * Called by apps/web/lib/queue.ts — never instantiate `Queue` directly
 * outside this package, so the retry/removeOn* defaults above stay
 * consistent across every enqueue call site. */
function getQueue(name: QueueName, redisUrl: string): Queue {
  const cached = queueCache.get(name);
  if (cached) return cached;

  const queue = new Queue(name, {
    connection: createRedisConnection(redisUrl),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  queueCache.set(name, queue);
  return queue;
}

export async function enqueueShootReminder(
  redisUrl: string,
  data: ShootReminderJobData,
  runAt: Date
): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.shootReminder, redisUrl);
  const delay = Math.max(0, runAt.getTime() - Date.now());
  // Deterministic id ⇒ re-enqueueing the same jobId is a reschedule, not a
  // duplicate. BullMQ throws if you `add()` with a jobId that already exists
  // (even if delayed/waiting), so callers must cancel first — see
  // cancelShootReminder, used by apps/web/app/jobs/actions.ts before every
  // re-add when a job's shootDate changes.
  await queue.add("send", data, { jobId: `reminder:${data.jobId}`, delay });
}

export async function cancelShootReminder(redisUrl: string, jobId: string): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.shootReminder, redisUrl);
  const existing = await queue.getJob(`reminder:${jobId}`);
  if (existing) await existing.remove();
}

export async function enqueueQrScan(redisUrl: string, data: QrScanJobData): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.qrScan, redisUrl);
  await queue.add("increment", data);
}

export async function enqueueCalendarWebhook(
  redisUrl: string,
  data: CalendarWebhookJobData
): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.calendarWebhook, redisUrl);
  await queue.add(data.provider, data);
}

/** No deterministic jobId/dedupe — unlike enqueueShootReminder, calendar
 * syncs run immediately (no delay) rather than being scheduled for later,
 * so there's nothing to cancel/reschedule. Rapid successive edits to the
 * same job may enqueue several sync jobs back-to-back; harmless, since
 * syncJobToCalendars re-reads the job's current state at process time
 * rather than trusting stale data carried in the payload (upsert only —
 * delete still needs its calendarEventIds snapshot, see that field's
 * comment above). */
export async function enqueueCalendarSync(redisUrl: string, data: CalendarSyncJobData): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.calendarSync, redisUrl);
  await queue.add(data.action, data);
}

/**
 * Consumer-side: wraps `new Worker()` with the project's logging convention
 * for retries/dead-letters so every job type (apps/worker/src/jobs/*) gets
 * the same observability for free instead of re-implementing it per job.
 */
export function createQueueWorker<T>(
  name: QueueName,
  redisUrl: string,
  processor: Processor<T>
): Worker<T> {
  const worker = new Worker<T>(name, processor, {
    connection: createRedisConnection(redisUrl),
  });

  worker.on("failed", (job: Job<T> | undefined, err: Error) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      console.error(
        `[dead-letter] queue=${name} jobId=${job.id} attempts=${job.attemptsMade}/${maxAttempts} reason=${err.message}`
      );
    } else {
      console.warn(
        `[retry] queue=${name} jobId=${job.id} attempt=${job.attemptsMade}/${maxAttempts} reason=${err.message}`
      );
    }
  });

  worker.on("error", (err: Error) => {
    console.error(`[worker-error] queue=${name} ${err.message}`);
  });

  return worker;
}
