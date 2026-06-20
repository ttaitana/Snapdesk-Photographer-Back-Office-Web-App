// apps/worker entrypoint — P8 "Worker & Queue scaffold" (TASKS.md). A
// long-running process (not a Next.js app) that consumes the three queues
// @snapdesk/queue defines; started via `pnpm dev`/`pnpm start` here, wired
// into turbo.json's "start" task as a persistent process alongside apps/web.
//
// Each queue gets its own Worker (rather than one Worker handling all three)
// so a slow/stuck job type can't head-of-line block the others — BullMQ
// Workers poll independently.

import "./env"; // validates process.env at startup; throws loudly if misconfigured

import { QUEUE_NAMES, createQueueWorker } from "@snapdesk/queue";

import { env } from "./env";
import { processShootReminder } from "./jobs/shoot-reminder";
import { processQrScan } from "./jobs/qr-scan";
import { processCalendarWebhook } from "./jobs/calendar-webhook";

const workers = [
  createQueueWorker(QUEUE_NAMES.shootReminder, env.REDIS_URL, processShootReminder),
  createQueueWorker(QUEUE_NAMES.qrScan, env.REDIS_URL, processQrScan),
  createQueueWorker(QUEUE_NAMES.calendarWebhook, env.REDIS_URL, processCalendarWebhook),
];

console.log(`[worker] listening on queues: ${Object.values(QUEUE_NAMES).join(", ")}`);

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] received ${signal}, closing workers...`);
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
