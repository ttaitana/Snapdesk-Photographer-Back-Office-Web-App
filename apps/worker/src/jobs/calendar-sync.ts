// calendar-sync processor — P9 Calendar Sync (F4). Enqueued by
// apps/web/lib/queue.ts (scheduleCalendarSync) on every job create/update/
// delete. All the actual provider-calling/refresh/retry logic lives in
// @snapdesk/core's syncJobToCalendars — see that file's header for why
// (centralizing the shared Google/Outlook token-refresh concern was the
// user's own stated reason for creating packages/integrations this pass).
// This processor is just plumbing: unwrap the BullMQ payload, supply this
// process's provider credentials, let errors propagate for retry.

import { syncJobToCalendars } from "@snapdesk/core";
import type { CalendarSyncJobData, Job } from "@snapdesk/queue";
import { calendarSyncProviderConfig } from "../env";

export async function processCalendarSync(job: Job<CalendarSyncJobData>): Promise<void> {
  const { jobId, userId, action, calendarEventIds } = job.data;

  await syncJobToCalendars(jobId, userId, action, calendarSyncProviderConfig, calendarEventIds);
}
