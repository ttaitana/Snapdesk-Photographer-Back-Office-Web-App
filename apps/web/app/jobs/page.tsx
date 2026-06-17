import { JobsList } from "./jobs-list";

/**
 * P3 ("F1 คิวถ่าย") — list view of jobs sorted by shoot date/time, with
 * today / this week / status filters (TASKS.md). Session + team-context
 * checks already happened in app/jobs/layout.tsx; this page just renders
 * the client list, which calls listJobsAction itself (every Server Action
 * re-resolves its own TeamContext from the session — see
 * lib/require-action-context.ts).
 */
export default function JobsPage() {
  return <JobsList />;
}
