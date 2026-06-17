import { JobsCalendar } from "./jobs-calendar";

/**
 * P3 ("F1 คิวถ่าย") — month calendar view (TASKS.md: "มุมมอง calendar
 * (เดือน/สัปดาห์)" — month view first; week view can reuse getMonthGrid's
 * day cells later if needed). Session + team-context checks already happen
 * in app/jobs/layout.tsx.
 */
export default function JobsCalendarPage() {
  return <JobsCalendar />;
}
