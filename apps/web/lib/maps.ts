import type { Job } from "@snapdesk/types";

/**
 * Google Maps navigation deep link for a job's shoot location (task #9,
 * TASKS.md: "เก็บพิกัดสถานที่ + ปุ่มเปิด Google Maps นำทาง (deep link)").
 *
 * Prefers lat/lng (exact pin) when present, since locationName free-text
 * can be ambiguous; falls back to a manually-pasted locationUrl if the job
 * only has that; returns null when neither is set so callers can hide the
 * button instead of linking to a useless "destination=" with nothing after it.
 */
export function buildMapsUrl(job: Pick<Job, "locationLat" | "locationLng" | "locationUrl">): string | null {
  if (job.locationLat != null && job.locationLng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${job.locationLat},${job.locationLng}`;
  }
  if (job.locationUrl) {
    return job.locationUrl;
  }
  return null;
}
