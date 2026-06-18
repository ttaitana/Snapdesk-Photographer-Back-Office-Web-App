import { describe, it, expect } from "vitest";
import { calculateWht, splitWhtCredit } from "./wht";

describe("calculateWht", () => {
  it("computes whtAmount and netReceived at 3%", () => {
    expect(calculateWht(10_000, 3)).toEqual({
      gross: 10_000,
      rate: 3,
      whtAmount: 300,
      netReceived: 9_700,
    });
  });

  it("0% rate yields no withholding", () => {
    const result = calculateWht(5_000, 0);
    expect(result.whtAmount).toBe(0);
    expect(result.netReceived).toBe(5_000);
  });
});

describe("splitWhtCredit", () => {
  it("splits proportionally to each recipient's ratio", () => {
    const result = splitWhtCredit(300, [
      { id: "a", ratio: 0.5 },
      { id: "b", ratio: 0.5 },
    ]);
    expect(result).toEqual([
      { id: "a", ratio: 0.5, whtCredited: 150 },
      { id: "b", ratio: 0.5, whtCredited: 150 },
    ]);
  });

  it("assigns any rounding leftover to the largest share so the sum matches exactly", () => {
    // 100 split three ways at 1/3 each -> 33.33 * 3 = 99.99, missing 0.01
    const result = splitWhtCredit(100, [
      { id: "a", ratio: 1 / 3 },
      { id: "b", ratio: 1 / 3 },
      { id: "c", ratio: 1 / 3 },
    ]);
    const sum = result.reduce((acc, r) => acc + r.whtCredited, 0);
    expect(Math.round(sum * 100) / 100).toBe(100);
  });

  it("returns an empty array for no recipients", () => {
    expect(splitWhtCredit(100, [])).toEqual([]);
  });

  it("handles a single recipient taking the full amount", () => {
    const result = splitWhtCredit(450, [{ id: "solo", ratio: 1 }]);
    expect(result).toEqual([{ id: "solo", ratio: 1, whtCredited: 450 }]);
  });
});
