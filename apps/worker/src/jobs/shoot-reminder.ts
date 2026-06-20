// shoot-reminder processor — P8 "job: reminder ก่อนวันถ่าย" (TASKS.md).
// Enqueued by apps/web/lib/queue.ts (scheduleShootReminder) whenever a job's
// shootDate is set/changed, scheduled to fire 24h before shootDate.

import { Resend } from "resend";
import { getJobForReminder, type JobReminderInfo } from "@snapdesk/core";
import type { Job, ShootReminderJobData } from "@snapdesk/queue";
import { env } from "../env";

export async function processShootReminder(job: Job<ShootReminderJobData>): Promise<void> {
  const info = await getJobForReminder(job.data.jobId);
  if (!info) {
    // Job was deleted, or its shootDate was cleared, between enqueue and
    // run (lib/queue.ts cancels the BullMQ job in both cases, but a job
    // already past the delay and picked up by the worker can race that
    // cancellation) — nothing to remind about; not a failure.
    console.warn(`[shoot-reminder] job ${job.data.jobId} no longer has a shootDate — skipping`);
    return;
  }

  if (!info.customerEmail) {
    console.warn(`[shoot-reminder] job ${info.id} (${info.title}) has no customer email — skipping`);
    return;
  }

  if (!env.RESEND_API_KEY) {
    console.warn(
      `[shoot-reminder] RESEND_API_KEY not set — skipping email for job ${info.id} (graceful degrade, see env.ts)`
    );
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: info.customerEmail,
    subject: `แจ้งเตือน: งานถ่ายภาพ "${info.title}" ใกล้ถึงแล้ว`,
    html: renderReminderEmailHtml(info),
  });

  if (error) {
    // Throw so BullMQ's retry/backoff (packages/queue's DEFAULT_JOB_OPTIONS)
    // absorbs a transient Resend failure; after 5 attempts it's logged as
    // dead-letter by createQueueWorker.
    throw new Error(`Failed to send shoot reminder email via Resend: ${error.message}`);
  }
}

function renderReminderEmailHtml(info: JobReminderInfo): string {
  const dateLabel = info.shootDate.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeLabel = info.shootTime ? ` เวลา ${escapeHtml(info.shootTime)}` : "";

  // Same minimal inline-styled approach as packages/auth/src/email/invite-email.ts.
  return `<!doctype html>
<html lang="th">
  <body style="font-family: sans-serif; background: #f4f4f5; padding: 32px;">
    <div style="max-width: 480px; margin: 0 auto; background: #fff; border: 2px solid #18181b; border-radius: 8px; padding: 24px;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">ใกล้ถึงวันถ่ายแล้ว!</h1>
      <p style="margin: 0 0 12px; color: #27272a;">
        งาน <strong>${escapeHtml(info.title)}</strong> กับทีม
        <strong>${escapeHtml(info.teamName)}</strong> จะถ่ายในวัน
        <strong>${escapeHtml(dateLabel)}</strong>${timeLabel}
      </p>
      <p style="margin: 0; color: #52525b; font-size: 14px;">
        หากมีคำถามหรือต้องการเปลี่ยนแปลง กรุณาติดต่อทีมโดยตรง
      </p>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
