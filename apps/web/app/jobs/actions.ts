"use server";

// Thin Server Actions for jobs — P2 Core Data Layer (TASKS.md).
// Same pattern as app/customers/actions.ts. P3 ("F1 คิวถ่าย") builds the
// list/calendar/detail pages that actually call these.

import {
  listJobs as listJobsService,
  getJob as getJobService,
  createJob as createJobService,
  updateJob as updateJobService,
  updateJobStatus as updateJobStatusService,
  sendQuotation as sendQuotationService,
  deleteJob as deleteJobService,
} from "@snapdesk/core";
import type {
  Job,
  JobFilter,
  JobInput,
  UpdateJobInput,
  UpdateJobStatusInput,
  SendQuotationInput,
} from "@snapdesk/types";

import { requireActionContext } from "@/lib/require-action-context";
import { scheduleShootReminder, cancelShootReminder } from "@/lib/queue";

export async function listJobsAction(filter?: Partial<Omit<JobFilter, "teamId">>): Promise<Job[]> {
  const context = await requireActionContext();
  return listJobsService(context, filter);
}

export async function getJobAction(id: string): Promise<Job | null> {
  const context = await requireActionContext();
  return getJobService(context, id);
}

/** P8 — schedules (or skips, see lib/queue.ts) the shoot-day reminder job
 * whenever a job is created with a shootDate already set. */
export async function createJobAction(input: JobInput): Promise<Job> {
  const context = await requireActionContext();
  const job = await createJobService(context, input);
  await scheduleShootReminder(job.id, job.shootDate ?? null);
  return job;
}

/** P8 — reschedules the reminder if shootDate changed (or cancels it if
 * shootDate was cleared); see lib/queue.ts#scheduleShootReminder. */
export async function updateJobAction(input: UpdateJobInput): Promise<Job | null> {
  const context = await requireActionContext();
  const job = await updateJobService(context, input);
  if (job) await scheduleShootReminder(job.id, job.shootDate ?? null);
  return job;
}

export async function updateJobStatusAction(
  input: UpdateJobStatusInput,
): Promise<Job | null> {
  const context = await requireActionContext();
  return updateJobStatusService(context, input);
}

/** P4 F2 — "ส่งใบเสนอราคา" button on the quotation builder: marks QUOTED. */
export async function sendQuotationAction(input: SendQuotationInput): Promise<Job | null> {
  const context = await requireActionContext();
  return sendQuotationService(context, input);
}

export async function deleteJobAction(id: string): Promise<boolean> {
  const context = await requireActionContext();
  const deleted = await deleteJobService(context, id);
  if (deleted) await cancelShootReminder(id);
  return deleted;
}
