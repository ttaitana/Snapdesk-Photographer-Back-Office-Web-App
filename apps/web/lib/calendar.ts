/**
 * Pure date-grid helpers for the /jobs/calendar month view (task #8).
 * Plain `Date` math, Monday-start weeks — same convention as
 * `dateRangeFor()`'s "this_week" boundary in packages/core/src/jobs/index.ts,
 * so "this week" means the same thing everywhere in the app.
 */

/** Local-time YYYY-MM-DD key (not UTC) — safe to use as a Map key for
 * grouping jobs by day without timezone-shift surprises from toISOString(). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns a flat 42-cell (6 weeks x 7 days) grid of Dates covering the given
 * month, Monday-start, including the leading/trailing days from adjacent
 * months needed to fill out full weeks.
 */
export function getMonthGrid(monthDate: Date): Date[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const firstDayOfWeek = firstOfMonth.getDay(); // 0 = Sunday
  const leadingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const gridStart = new Date(year, month, 1 - leadingDays);

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    return day;
  });
}
