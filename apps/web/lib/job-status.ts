import type { JobStatus } from "@snapdesk/types";

/**
 * Thai display labels for JobStatus — shared by the job list, calendar, and
 * detail pages (P3+) so the wording stays consistent in one place instead of
 * being re-typed per page.
 */
export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  INQUIRY: "สอบถาม",
  QUOTED: "เสนอราคาแล้ว",
  CONFIRMED: "ยืนยันแล้ว",
  SHOOTING: "กำลังถ่าย",
  EDITING: "กำลังตัดต่อ",
  DELIVERED: "ส่งงานแล้ว",
  COMPLETED: "เสร็จสมบูรณ์",
  CANCELLED: "ยกเลิก",
};

/** Display order for status filter dropdowns / timeline steps. */
export const JOB_STATUS_ORDER: JobStatus[] = [
  "INQUIRY",
  "QUOTED",
  "CONFIRMED",
  "SHOOTING",
  "EDITING",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];
