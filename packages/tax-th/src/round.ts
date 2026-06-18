/** Round to 2 decimal places (Baht + satang) — same convention as
 * packages/core's round2 helpers (finance-summary, payments). Kept as a
 * tiny shared util here so every pure function in this package rounds
 * identically. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
