import { z } from "zod";

/**
 * Mirrors the Prisma enums in `packages/db/prisma/schema.prisma`.
 * Keep these in sync manually — zod schemas are used on the client
 * (forms, API input validation) where importing the Prisma client
 * directly would be too heavy.
 */

/**
 * Lowercase to match Better Auth's organization-plugin access-control
 * defaults (P1) — not a Prisma enum, since Better Auth's `role` column is a
 * plain string. UI should capitalize for display ("Owner"/"Admin"/"Member").
 */
export const teamRoleSchema = z.enum(["owner", "admin", "member"]);
export type TeamRole = z.infer<typeof teamRoleSchema>;

export const jobStatusSchema = z.enum([
  "INQUIRY",
  "QUOTED",
  "CONFIRMED",
  "SHOOTING",
  "EDITING",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const paymentTypeSchema = z.enum(["DEPOSIT", "BALANCE", "FULL"]);
export type PaymentType = z.infer<typeof paymentTypeSchema>;

export const shareTypeSchema = z.enum(["PERCENT", "FIXED"]);
export type ShareType = z.infer<typeof shareTypeSchema>;

export const themeModeSchema = z.enum(["light", "dark", "system"]);
export type ThemeMode = z.infer<typeof themeModeSchema>;

/** P6 F7 — Team.revenueBasis. "cash" (default) counts income when
 * Payment.paidAt happens; "accrual" counts it when the Job is
 * confirmed/delivered instead. See packages/db/prisma/schema.prisma. */
export const revenueBasisSchema = z.enum(["cash", "accrual"]);
export type RevenueBasis = z.infer<typeof revenueBasisSchema>;

/** P6 F7 — income/expense summary period grouping. */
export const summaryPeriodSchema = z.enum(["month", "quarter", "year"]);
export type SummaryPeriod = z.infer<typeof summaryPeriodSchema>;

/** P6 F7 — "2 มุมมองสลับได้: ทีม (team total) / รายคน (per member)". */
export const summaryViewSchema = z.enum(["team", "member"]);
export type SummaryView = z.infer<typeof summaryViewSchema>;
