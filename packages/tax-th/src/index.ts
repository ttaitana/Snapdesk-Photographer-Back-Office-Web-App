/**
 * @snapdesk/tax-th — Thai tax (VAT/WHT/PIT) pure calculation functions.
 *
 * P6 F7 "ภาษี" sub-phase (TASKS.md). Every function here is pure (no
 * DB/Next.js import) so it's directly unit-testable — packages/core's tax
 * service is the only caller, feeding it numbers resolved from Prisma
 * models (TaxSetting, MemberTaxProfile, Payment, JobAssignment).
 *
 * ⚠️ Every figure this package produces is an ESTIMATE for planning only,
 * not tax/accounting advice — see the disclaimer rendered in
 * apps/web/app/team/tax/page.tsx (verbatim text in SPEC.md F7).
 */

export const TAX_TH_PACKAGE_NAME = "@snapdesk/tax-th" as const;

export { round2 } from "./round";

export {
  VAT_REGISTRATION_THRESHOLD,
  addVat,
  splitVatFromGross,
  checkVatRegistrationThreshold,
  type VatSplit,
  type VatThresholdStatus,
} from "./vat";

export {
  calculateWht,
  splitWhtCredit,
  type WhtBreakdown,
  type CreditShareInput,
  type CreditShareResult,
} from "./wht";

export {
  DEFAULT_PIT_BRACKETS,
  DEFAULT_FLAT_EXPENSE_RATE,
  DEFAULT_FLAT_EXPENSE_CAP,
  DEFAULT_PERSONAL_ALLOWANCE,
  calculateProgressiveTax,
  calculateExpenseDeduction,
  calculatePersonalIncomeTax,
  estimateYearEndTax,
  type PitBracket,
  type ExpenseDeductionInput,
  type PersonalIncomeTaxInput,
  type PersonalIncomeTaxResult,
  type YearEndEstimateInput,
  type YearEndEstimateResult,
} from "./pit";
