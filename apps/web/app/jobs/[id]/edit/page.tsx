import { JobEditClient } from "./job-edit-client";

/**
 * /jobs/[id]/edit — edit job page (task #10, TASKS.md: "form สร้าง/แก้คิว +
 * auto-save draft"). Session + team-context checks already happen in
 * app/jobs/layout.tsx. params is a Promise here — matches the existing
 * app/invite/[id]/page.tsx and app/jobs/[id]/page.tsx convention.
 */
export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobEditClient id={id} />;
}
