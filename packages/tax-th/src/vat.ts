// VAT (ภาษีมูลค่าเพิ่ม) — P6 F7 "ภาษี" sub-phase, TASKS.md:
//   "VAT ระดับทีม: on/off + อัตรา + แยกราคาก่อน/หลัง VAT + เตือนใกล้ 1.8 ล้าน"
//
// Pure functions only — no DB/Next.js import. Standard Thai VAT rate is 7%
// (TaxSetting.vatRate defaults to 7 in packages/db/prisma/schema.prisma),
// but the rate is always a caller-supplied parameter so it stays editable.

import { round2 } from "./round";

/** Mandatory VAT registration kicks in once a business's annual revenue
 * exceeds 1.8 million Baht (Revenue Code). TASKS.md asks for a warning as a
 * team approaches this, not just once it's crossed. */
export const VAT_REGISTRATION_THRESHOLD = 1_800_000;

export interface VatSplit {
  /** Price excluding VAT. */
  base: number;
  /** VAT amount (base * rate / 100). */
  vat: number;
  /** Price including VAT (base + vat). */
  total: number;
  rate: number;
}

/** "แยกราคาก่อน/หลัง VAT" — case 1: caller has a VAT-EXCLUSIVE price and
 * wants the VAT-inclusive total (e.g. building a quotation line item). */
export function addVat(base: number, ratePercent: number): VatSplit {
  const vat = round2((base * ratePercent) / 100);
  return { base: round2(base), vat, total: round2(base + vat), rate: ratePercent };
}

/** Case 2: caller has a VAT-INCLUSIVE (gross) price — e.g. a customer paid
 * a round number that's meant to already include VAT — and wants the
 * VAT-exclusive base backed out: base = gross / (1 + rate/100). */
export function splitVatFromGross(gross: number, ratePercent: number): VatSplit {
  const base = gross / (1 + ratePercent / 100);
  const vat = gross - base;
  return { base: round2(base), vat: round2(vat), total: round2(gross), rate: ratePercent };
}

export interface VatThresholdStatus {
  threshold: number;
  /** Trailing 12-month (or year-to-date — caller decides the window)
   * revenue being checked against the threshold. */
  revenue: number;
  /** How much revenue is left before mandatory registration, floored at 0. */
  remaining: number;
  /** revenue / threshold — can exceed 1. */
  ratio: number;
  /** true once ratio >= warnAtRatio (default 0.9, i.e. "ใกล้ 1.8 ล้าน"). */
  approaching: boolean;
  /** true once revenue >= threshold — VAT registration is legally required. */
  exceeded: boolean;
}

/** "เตือนใกล้ 1.8 ล้าน" — flags a team as it approaches (or crosses) the
 * mandatory VAT-registration threshold. `warnAtRatio` lets the UI choose
 * how early to warn (default 90% of the threshold = ฿1.62M). */
export function checkVatRegistrationThreshold(
  revenue: number,
  options: { threshold?: number; warnAtRatio?: number } = {}
): VatThresholdStatus {
  const threshold = options.threshold ?? VAT_REGISTRATION_THRESHOLD;
  const warnAtRatio = options.warnAtRatio ?? 0.9;
  const ratio = threshold > 0 ? revenue / threshold : 0;

  return {
    threshold,
    revenue: round2(revenue),
    remaining: round2(Math.max(threshold - revenue, 0)),
    ratio,
    approaching: ratio >= warnAtRatio,
    exceeded: revenue >= threshold,
  };
}
