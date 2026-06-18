import { JobDetail } from "./job-detail";

/**
 * P3 ("F1 คิวถ่าย") — job detail page (task #9, TASKS.md: "หน้ารายละเอียดงาน:
 * ถ่ายอะไร/แบบไหน", "checklist ของที่ต้องใช้ (เพิ่ม/ลบ/ติ๊ก)", "เก็บพิกัดสถานที่ +
 * ปุ่มเปิด Google Maps นำทาง (deep link)"). Session + team-context checks
 * already happen in app/jobs/layout.tsx. params is a Promise here — matches
 * the existing app/invite/[id]/page.tsx convention in this codebase.
 */
export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetail id={id} />;
}
