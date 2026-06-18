import { z } from "zod";
import { cuidSchema } from "./common";
import { pitIncomeTypeSchema, pitExpenseMethodSchema } from "./enums";

/**
 * P6 F7 ภาษี — TaxSetting (team-level VAT) + MemberTaxProfile (per-member PIT).
 * Mirrors packages/db/prisma/schema.prisma's TaxSetting/MemberTaxProfile models.
 *
 * ⚠️ Every figure these feed into @snapdesk/tax-th is an ESTIMATE for
 * planning only — see the disclaimer rendered in apps/web/app/team/tax/page.tsx.
 */

/** Shape of one entry in TaxSetting.pitBrackets (Json) — a team-level
 * override of the standard ขั้นบันได 0–35% table, validated on the way in
 * and out of the DB since Prisma can't constrain Json column shape itself.
 * Structurally compatible with @snapdesk/tax-th's PitBracket. */
export const pitBracketSchema = z.object({
  min: z.number().nonnegative(),
  max: z.number().positive().nullable(),
  rate: z.number().min(0).max(100),
});
export type PitBracket = z.infer<typeof pitBracketSchema>;

export const taxSettingSchema = z.object({
  id: cuidSchema,
  teamId: cuidSchema,
  vatRegistered: z.boolean(),
  vatRate: z.number().min(0).max(100),
  pitBrackets: z.array(pitBracketSchema).nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TaxSetting = z.infer<typeof taxSettingSchema>;

export const taxSettingInputSchema = z.object({
  teamId: cuidSchema,
  vatRegistered: z.boolean().optional(),
  vatRate: z.number().min(0, "อัตราภาษีต้องไม่ติดลบ").max(100, "อัตราภาษีต้องไม่เกิน 100%").optional(),
  pitBrackets: z.array(pitBracketSchema).optional(),
});
export type TaxSettingInput = z.infer<typeof taxSettingInputSchema>;

export const updateTaxSettingInputSchema = taxSettingInputSchema.partial().extend({
  id: cuidSchema,
  teamId: cuidSchema,
});
export type UpdateTaxSettingInput = z.infer<typeof updateTaxSettingInputSchema>;

/** Shape of one entry in MemberTaxProfile.deductions (Json) — a free-form
 * allowance/deduction line (ลดหย่อนส่วนตัว/คู่สมรส/บุตร/ประกันสังคม ฯลฯ) the
 * member configures themselves; @snapdesk/tax-th treats the sum as one
 * opaque "additionalDeductions" number, so this package never has to model
 * the official allowance catalogue. */
export const taxDeductionItemSchema = z.object({
  label: z.string().min(1),
  amount: z.number().nonnegative(),
});
export type TaxDeductionItem = z.infer<typeof taxDeductionItemSchema>;

export const memberTaxProfileSchema = z.object({
  id: cuidSchema,
  teamId: cuidSchema,
  userId: cuidSchema,
  incomeType: pitIncomeTypeSchema,
  expenseMethod: pitExpenseMethodSchema,
  deductions: z.array(taxDeductionItemSchema).nullable().optional(),
  defaultWhtRate: z.number().min(0).max(100),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type MemberTaxProfile = z.infer<typeof memberTaxProfileSchema>;

export const memberTaxProfileInputSchema = z.object({
  teamId: cuidSchema,
  userId: cuidSchema,
  incomeType: pitIncomeTypeSchema.optional(),
  expenseMethod: pitExpenseMethodSchema.optional(),
  deductions: z.array(taxDeductionItemSchema).optional(),
  defaultWhtRate: z.number().min(0, "อัตราภาษีต้องไม่ติดลบ").max(100, "อัตราภาษีต้องไม่เกิน 100%").optional(),
});
export type MemberTaxProfileInput = z.infer<typeof memberTaxProfileInputSchema>;

export const updateMemberTaxProfileInputSchema = memberTaxProfileInputSchema.partial().extend({
  id: cuidSchema,
  teamId: cuidSchema,
});
export type UpdateMemberTaxProfileInput = z.infer<typeof updateMemberTaxProfileInputSchema>;

/** P6 F7 — year-end tax estimate for one member, returned by
 * @snapdesk/core's tax service (task #18). Wraps @snapdesk/tax-th's
 * estimateYearEndTax() output with the member identity attached. */
export const memberYearEndTaxEstimateSchema = z.object({
  userId: cuidSchema,
  year: z.number().int(),
  grossIncome: z.number(),
  expenseDeduction: z.number(),
  additionalDeductions: z.number(),
  netIncome: z.number(),
  taxOwed: z.number(),
  whtCredited: z.number(),
  /** taxOwed - whtCredited. Positive = ต้องจ่ายเพิ่มปลายปี, negative = มีเครดิตเกิน. */
  balance: z.number(),
});
export type MemberYearEndTaxEstimate = z.infer<typeof memberYearEndTaxEstimateSchema>;

/** Mandatory disclaimer text (SPEC.md F7, verbatim) — rendered wherever tax
 * estimates are shown (apps/web/app/team/tax/page.tsx). Exported as a
 * constant so the UI and any future export/PDF never drift from the
 * approved wording. */
export const TAX_ESTIMATE_DISCLAIMER =
  '⚠️ Disclaimer (แสดงในแอป): ตัวเลขภาษีเป็นการ "ประมาณการ" เพื่อช่วยวางแผนเท่านั้น ไม่ใช่คำแนะนำทางภาษี/บัญชี อัตราและเกณฑ์อาจเปลี่ยนตามประกาศกรมสรรพากร ควรตรวจสอบกับนักบัญชีหรือกรมสรรพากรก่อนยื่นจริง';
