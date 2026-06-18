import { describe, it, expect } from "vitest";
import {
  calculateProgressiveTax,
  calculateExpenseDeduction,
  calculatePersonalIncomeTax,
  estimateYearEndTax,
  DEFAULT_PIT_BRACKETS,
} from "./pit";

describe("calculateProgressiveTax", () => {
  it("is 0 within the first (0%) bracket", () => {
    expect(calculateProgressiveTax(100_000)).toBe(0);
  });

  it("taxes only the slice inside the second bracket", () => {
    // 200,000 net: first 150,000 @ 0% + next 50,000 @ 5% = 2,500
    expect(calculateProgressiveTax(200_000)).toBe(2_500);
  });

  it("taxes across multiple brackets correctly", () => {
    // 1,000,000 net:
    //   0-150,000 @0%      = 0
    //   150,000-300,000@5% = 7,500
    //   300,000-500,000@10%= 20,000
    //   500,000-750,000@15%= 37,500
    //   750,000-1,000,000@20%=50,000
    // total = 115,000
    expect(calculateProgressiveTax(1_000_000)).toBe(115_000);
  });

  it("applies the top open-ended bracket rate above its min", () => {
    const tax = calculateProgressiveTax(6_000_000);
    // brackets below 5,000,000 sum to a fixed amount; verify the slice above
    // 5,000,000 is taxed at 35%
    const below = calculateProgressiveTax(5_000_000);
    expect(tax - below).toBe(round(1_000_000 * 0.35));
  });

  it("supports a custom bracket table", () => {
    const flatBracket = [{ min: 0, max: null, rate: 10 }];
    expect(calculateProgressiveTax(1_000, flatBracket)).toBe(100);
  });

  it("returns 0 for zero or negative income", () => {
    expect(calculateProgressiveTax(0)).toBe(0);
    expect(calculateProgressiveTax(-500)).toBe(0);
  });

  it("DEFAULT_PIT_BRACKETS has 8 brackets ending open-ended at 35%", () => {
    expect(DEFAULT_PIT_BRACKETS).toHaveLength(8);
    expect(DEFAULT_PIT_BRACKETS[DEFAULT_PIT_BRACKETS.length - 1]).toEqual({
      min: 5_000_000,
      max: null,
      rate: 35,
    });
  });
});

function round(n: number) {
  return Math.round(n * 100) / 100;
}

describe("calculateExpenseDeduction", () => {
  it("เหมา: caps the flat 50% deduction at 100,000", () => {
    expect(calculateExpenseDeduction({ grossIncome: 1_000_000, method: "flat" })).toBe(100_000);
  });

  it("เหมา: below the cap, deduction is exactly 50% of gross", () => {
    expect(calculateExpenseDeduction({ grossIncome: 100_000, method: "flat" })).toBe(50_000);
  });

  it("เหมา: supports a custom rate/cap", () => {
    expect(
      calculateExpenseDeduction({ grossIncome: 200_000, method: "flat", flatRatePercent: 60, flatCap: 60_000 })
    ).toBe(60_000);
  });

  it("ตามจริง: uses the caller-supplied actual expenses", () => {
    expect(calculateExpenseDeduction({ grossIncome: 500_000, method: "actual", actualExpenses: 220_000 })).toBe(
      220_000
    );
  });

  it("ตามจริง: defaults to 0 when actualExpenses is omitted, rather than throwing", () => {
    expect(calculateExpenseDeduction({ grossIncome: 500_000, method: "actual" })).toBe(0);
  });
});

describe("calculatePersonalIncomeTax", () => {
  it("computes the full 40(8) เหมา pipeline", () => {
    const result = calculatePersonalIncomeTax({
      grossIncome: 600_000,
      expenseMethod: "flat",
      additionalDeductions: 60_000, // ลดหย่อนส่วนตัว
    });

    expect(result.expenseDeduction).toBe(100_000); // 50% of 600k capped at 100k
    expect(result.additionalDeductions).toBe(60_000);
    expect(result.netIncome).toBe(440_000); // 600,000 - 100,000 - 60,000
    // 0-150k@0 + 150k-300k@5%=7,500 + 300k-440k@10%=14,000 = 21,500
    expect(result.taxOwed).toBe(21_500);
  });

  it("floors netIncome at 0 when deductions exceed gross income", () => {
    const result = calculatePersonalIncomeTax({
      grossIncome: 50_000,
      expenseMethod: "actual",
      actualExpenses: 80_000,
    });
    expect(result.netIncome).toBe(0);
    expect(result.taxOwed).toBe(0);
  });
});

describe("estimateYearEndTax", () => {
  it("returns a positive balance (ต้องจ่ายเพิ่ม) when tax owed exceeds WHT credited", () => {
    const result = estimateYearEndTax({
      grossIncome: 600_000,
      expenseMethod: "flat",
      additionalDeductions: 60_000,
      whtCredited: 10_000,
    });
    expect(result.taxOwed).toBe(21_500);
    expect(result.whtCredited).toBe(10_000);
    expect(result.balance).toBe(11_500);
  });

  it("returns a negative balance (มีเครดิตเกิน) when WHT credited exceeds tax owed", () => {
    const result = estimateYearEndTax({
      grossIncome: 600_000,
      expenseMethod: "flat",
      additionalDeductions: 60_000,
      whtCredited: 30_000,
    });
    expect(result.balance).toBe(-8_500);
  });

  it("treats a negative whtCredited input as 0", () => {
    const result = estimateYearEndTax({
      grossIncome: 100_000,
      expenseMethod: "flat",
      whtCredited: -500,
    });
    expect(result.whtCredited).toBe(0);
  });
});
