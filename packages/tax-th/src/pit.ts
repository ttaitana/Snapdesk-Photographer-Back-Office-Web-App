// PIT (ภาษีเงินได้บุคคลธรรมดา) — P6 F7 "ภาษี" sub-phase, TASKS.md:
//   "PIT รายคน: 40(2)/40(8), หักเหมา/ตามจริง, ค่าลดหย่อน, ขั้นบันได 0–35%"
//   "ประมาณการภาษีปลายปีรายคน = ภาษี − WHT ที่เครดิต"
//
// Pure functions only. Every figure here is an ESTIMATE for planning — see
// the mandatory disclaimer rendered in apps/web/app/team/tax/page.tsx.
// Actual deduction rules for 40(2)/40(8) income vary by sub-type and change
// by Revenue Department announcement, so this models the two SHAPES SPEC.md
// asks for (เหมา = flat % capped, ตามจริง = caller-supplied actual expenses)
// rather than hard-coding every official sub-rate; TaxSetting.pitBrackets
// lets a team override the bracket table itself if RD rates change.

import { round2 } from "./round";

export interface PitBracket {
  min: number;
  /** null = no upper bound (top bracket). */
  max: number | null;
  /** Whole percent, e.g. 5 (not 0.05). */
  rate: number;
}

/** Standard Thai progressive PIT brackets (0–35%), current as of this
 * package's authoring — TaxSetting.pitBrackets can override this per team
 * ("แก้ bracket ได้") if the Revenue Department changes them. */
export const DEFAULT_PIT_BRACKETS: readonly PitBracket[] = [
  { min: 0, max: 150_000, rate: 0 },
  { min: 150_000, max: 300_000, rate: 5 },
  { min: 300_000, max: 500_000, rate: 10 },
  { min: 500_000, max: 750_000, rate: 15 },
  { min: 750_000, max: 1_000_000, rate: 20 },
  { min: 1_000_000, max: 2_000_000, rate: 25 },
  { min: 2_000_000, max: 5_000_000, rate: 30 },
  { min: 5_000_000, max: null, rate: 35 },
];

/** เหมา (flat-rate) expense deduction default: 50% of gross income, capped —
 * the common shape for 40(1)/40(2) and many 40(8) sub-categories. */
export const DEFAULT_FLAT_EXPENSE_RATE = 50;
export const DEFAULT_FLAT_EXPENSE_CAP = 100_000;

/** ลดหย่อนส่วนตัว (personal allowance) — not auto-applied by
 * calculatePersonalIncomeTax; callers fold it into `additionalDeductions`
 * alongside any other allowances (คู่สมรส/บุตร/ประกันสังคม ฯลฯ) the member
 * configured in MemberTaxProfile.deductions, so this package never assumes
 * a household's allowance situation. */
export const DEFAULT_PERSONAL_ALLOWANCE = 60_000;

/** Progressive bracket tax on an already-net (post-deduction) taxable
 * income. Each bracket taxes only the slice of income that falls inside it
 * — standard marginal-rate calculation. */
export function calculateProgressiveTax(
  netIncome: number,
  brackets: readonly PitBracket[] = DEFAULT_PIT_BRACKETS
): number {
  if (netIncome <= 0) return 0;

  let tax = 0;
  for (const bracket of brackets) {
    if (netIncome <= bracket.min) continue;
    const sliceTop = bracket.max ?? Infinity;
    const taxableInSlice = Math.min(netIncome, sliceTop) - bracket.min;
    if (taxableInSlice > 0) tax += (taxableInSlice * bracket.rate) / 100;
  }
  return round2(tax);
}

export interface ExpenseDeductionInput {
  grossIncome: number;
  /** เหมา (flat %, capped) vs ตามจริง (actual, caller-supplied). */
  method: "flat" | "actual";
  /** Required (and used) only when method === "actual". */
  actualExpenses?: number;
  flatRatePercent?: number;
  flatCap?: number;
}

/** "หักเหมา/ตามจริง" deduction choice. เหมา is `min(gross * rate%, cap)`;
 * ตามจริง is whatever documented actual expense amount the caller supplies
 * (defaults to 0 if omitted, rather than throwing — an incomplete actual-
 * expense entry shouldn't crash an estimate). */
export function calculateExpenseDeduction(input: ExpenseDeductionInput): number {
  if (input.method === "actual") {
    return round2(Math.max(input.actualExpenses ?? 0, 0));
  }

  const rate = input.flatRatePercent ?? DEFAULT_FLAT_EXPENSE_RATE;
  const cap = input.flatCap ?? DEFAULT_FLAT_EXPENSE_CAP;
  return round2(Math.min((input.grossIncome * rate) / 100, cap));
}

export interface PersonalIncomeTaxInput {
  grossIncome: number;
  expenseMethod: "flat" | "actual";
  actualExpenses?: number;
  flatRatePercent?: number;
  flatCap?: number;
  /** Sum of every allowance/deduction the member claims beyond the expense
   * deduction above (ลดหย่อนส่วนตัว/คู่สมรส/บุตร/ประกันสังคม ฯลฯ) — caller sums
   * MemberTaxProfile.deductions; this package treats it as one opaque
   * number so it never has to know the current allowance catalogue. */
  additionalDeductions?: number;
  brackets?: readonly PitBracket[];
}

export interface PersonalIncomeTaxResult {
  grossIncome: number;
  expenseDeduction: number;
  additionalDeductions: number;
  /** Taxable base after both deductions, floored at 0. */
  netIncome: number;
  taxOwed: number;
}

/** Full 40(2)/40(8) pipeline: gross income → expense deduction (เหมา/ตามจริง)
 * → other allowances → progressive bracket tax. */
export function calculatePersonalIncomeTax(input: PersonalIncomeTaxInput): PersonalIncomeTaxResult {
  const expenseDeduction = calculateExpenseDeduction({
    grossIncome: input.grossIncome,
    method: input.expenseMethod,
    actualExpenses: input.actualExpenses,
    flatRatePercent: input.flatRatePercent,
    flatCap: input.flatCap,
  });
  const additionalDeductions = round2(Math.max(input.additionalDeductions ?? 0, 0));
  const netIncome = round2(Math.max(input.grossIncome - expenseDeduction - additionalDeductions, 0));
  const taxOwed = calculateProgressiveTax(netIncome, input.brackets);

  return {
    grossIncome: round2(input.grossIncome),
    expenseDeduction,
    additionalDeductions,
    netIncome,
    taxOwed,
  };
}

export interface YearEndEstimateInput extends PersonalIncomeTaxInput {
  /** This member's total WHT credited for the year (sum of
   * splitWhtCredit() shares across every payment they were assigned a
   * share of) — see ../wht.ts. */
  whtCredited: number;
}

export interface YearEndEstimateResult extends PersonalIncomeTaxResult {
  whtCredited: number;
  /** taxOwed - whtCredited. Positive = ต้องจ่ายเพิ่มปลายปี, negative = มีเครดิตเกิน
   * (ขอคืนได้), per TASKS.md "ประมาณการภาษีปลายปีรายคน = ภาษี − WHT ที่เครดิต". */
  balance: number;
}

export function estimateYearEndTax(input: YearEndEstimateInput): YearEndEstimateResult {
  const pit = calculatePersonalIncomeTax(input);
  const whtCredited = round2(Math.max(input.whtCredited, 0));
  return { ...pit, whtCredited, balance: round2(pit.taxOwed - whtCredited) };
}
