import { describe, it, expect } from "vitest";
import { addVat, splitVatFromGross, checkVatRegistrationThreshold, VAT_REGISTRATION_THRESHOLD } from "./vat";

describe("addVat", () => {
  it("adds VAT on top of a VAT-exclusive base price", () => {
    expect(addVat(1000, 7)).toEqual({ base: 1000, vat: 70, total: 1070, rate: 7 });
  });

  it("rounds to satang", () => {
    const result = addVat(333.33, 7);
    expect(result.vat).toBe(23.33);
    expect(result.total).toBe(356.66);
  });
});

describe("splitVatFromGross", () => {
  it("backs out the VAT-exclusive base from a VAT-inclusive price", () => {
    const result = splitVatFromGross(1070, 7);
    expect(result.base).toBe(1000);
    expect(result.vat).toBe(70);
    expect(result.total).toBe(1070);
  });

  it("round-trips with addVat", () => {
    const added = addVat(2500, 7);
    const split = splitVatFromGross(added.total, 7);
    expect(split.base).toBe(added.base);
  });
});

describe("checkVatRegistrationThreshold", () => {
  it("flags neither approaching nor exceeded well below the threshold", () => {
    const status = checkVatRegistrationThreshold(500_000);
    expect(status.approaching).toBe(false);
    expect(status.exceeded).toBe(false);
    expect(status.remaining).toBe(1_300_000);
  });

  it("flags approaching once revenue crosses the warn ratio (default 90%)", () => {
    const status = checkVatRegistrationThreshold(1_650_000);
    expect(status.approaching).toBe(true);
    expect(status.exceeded).toBe(false);
  });

  it("flags exceeded once revenue reaches the threshold", () => {
    const status = checkVatRegistrationThreshold(VAT_REGISTRATION_THRESHOLD);
    expect(status.exceeded).toBe(true);
    expect(status.remaining).toBe(0);
  });

  it("supports a custom threshold/warnAtRatio", () => {
    const status = checkVatRegistrationThreshold(80, { threshold: 100, warnAtRatio: 0.75 });
    expect(status.approaching).toBe(true);
    expect(status.exceeded).toBe(false);
  });
});
