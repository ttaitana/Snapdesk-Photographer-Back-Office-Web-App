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
