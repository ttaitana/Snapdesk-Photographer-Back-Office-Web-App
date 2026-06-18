// WHT (ภาษีหัก ณ ที่จ่าย) — P6 F7 "ภาษี" sub-phase, TASKS.md:
//   "WHT: ตั้งต่อรายการรับเงิน (3%/2%/0%) + คำนวณยอดสุทธิ + แบ่งเครดิตตามส่วนแบ่ง"
//
// Pure functions only. Per-payment WHT (Payment.whtRate/whtAmount/
// netReceived) is ALREADY computed server-side in
// packages/core/src/payments/index.ts's createPayment — calculateWht here
// exists so packages/core (and tests) can call the same math without
// duplicating it, and so it's covered by this package's own unit tests.
//
// Credit-splitting reuses whatever ratio @snapdesk/core's
// calculateRevenueSplit() resolved for each assignment's share of a job's
// total (packages/core/src/job-assignments/index.ts) — this package never
// imports that function directly (it has no @snapdesk/db dependency and
// must stay DB/job-assignment-free), so callers resolve ratios first and
// pass them in here.

import { round2 } from "./round";

export interface WhtBreakdown {
  gross: number;
  rate: number;
  whtAmount: number;
  netReceived: number;
}

/** "ตั้งต่อรายการรับเงิน (3%/2%/0%) + คำนวณยอดสุทธิ". `ratePercent` is any
 * caller-supplied rate (3, 2, 0, or otherwise) — not restricted to those
 * three, since SPEC.md only lists them as the common cases. */
export function calculateWht(gross: number, ratePercent: number): WhtBreakdown {
  const whtAmount = round2((gross * ratePercent) / 100);
  return { gross: round2(gross), rate: ratePercent, whtAmount, netReceived: round2(gross - whtAmount) };
}

export interface CreditShareInput {
  /** Stable identifier for the recipient (e.g. userId). */
  id: string;
  /** This recipient's resolved ratio of the job/payment total, 0–1. */
  ratio: number;
}

export interface CreditShareResult {
  id: string;
  ratio: number;
  /** This recipient's share of whtAmount, rounded to satang. */
  whtCredited: number;
}

/** "แบ่งเครดิตตามส่วนแบ่ง" — splits a single payment's already-computed
 * whtAmount across recipients using PRE-RESOLVED ratios (the same ratio
 * @snapdesk/core's calculateRevenueSplit() resolves for each assignment's
 * share of the job total — see module comment above).
 *
 * Per-share rounding can leave a satang or two of drift versus the input
 * total; that leftover is added to the largest share so
 * sum(result.whtCredited) === round2(whtAmount) exactly, never silently
 * dropped. */
export function splitWhtCredit(whtAmount: number, shares: CreditShareInput[]): CreditShareResult[] {
  if (shares.length === 0) return [];

  const target = round2(whtAmount);
  const rounded = shares.map((s) => ({ id: s.id, ratio: s.ratio, whtCredited: round2(target * s.ratio) }));

  const drift = round2(target - rounded.reduce((sum, r) => sum + r.whtCredited, 0));
  if (drift !== 0) {
    let largestIndex = 0;
    for (let i = 1; i < rounded.length; i++) {
      if (rounded[i]!.whtCredited > rounded[largestIndex]!.whtCredited) largestIndex = i;
    }
    rounded[largestIndex]!.whtCredited = round2(rounded[largestIndex]!.whtCredited + drift);
  }

  return rounded;
}
