import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@snapdesk/db", () => ({
  prisma: {
    taxSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    memberTaxProfile: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
    teamMember: { findMany: vi.fn() },
    team: { findUnique: vi.fn() },
    payment: { findMany: vi.fn() },
    job: { findMany: vi.fn() },
    expense: { findMany: vi.fn() },
  },
}));

import { prisma } from "@snapdesk/db";
import {
  getTaxSetting,
  upsertTaxSetting,
  getTeamVatStatus,
  getMemberTaxProfile,
  listMemberTaxProfiles,
  upsertMemberTaxProfile,
  getMemberYearEndTaxEstimate,
} from "./index";
import type { TeamContext } from "../team-context";

const taxSettingFindUnique = prisma.taxSetting.findUnique as unknown as ReturnType<typeof vi.fn>;
const taxSettingUpsert = prisma.taxSetting.upsert as unknown as ReturnType<typeof vi.fn>;
const memberTaxProfileFindUnique = prisma.memberTaxProfile.findUnique as unknown as ReturnType<typeof vi.fn>;
const memberTaxProfileFindMany = prisma.memberTaxProfile.findMany as unknown as ReturnType<typeof vi.fn>;
const memberTaxProfileUpsert = prisma.memberTaxProfile.upsert as unknown as ReturnType<typeof vi.fn>;
const teamMemberFindMany = prisma.teamMember.findMany as unknown as ReturnType<typeof vi.fn>;
const teamFindUnique = prisma.team.findUnique as unknown as ReturnType<typeof vi.fn>;
const paymentFindMany = prisma.payment.findMany as unknown as ReturnType<typeof vi.fn>;
const jobFindMany = prisma.job.findMany as unknown as ReturnType<typeof vi.fn>;
const expenseFindMany = prisma.expense.findMany as unknown as ReturnType<typeof vi.fn>;

const owner: TeamContext = { teamId: "team-1", userId: "owner-1", role: "owner" };
const admin: TeamContext = { teamId: "team-1", userId: "admin-1", role: "admin" };
const member1: TeamContext = { teamId: "team-1", userId: "member-1", role: "member" };

const decimal = (n: number) => ({ toNumber: () => n });
const now = new Date("2026-01-01T00:00:00Z");

beforeEach(() => {
  taxSettingFindUnique.mockReset();
  taxSettingUpsert.mockReset();
  memberTaxProfileFindUnique.mockReset();
  memberTaxProfileFindMany.mockReset();
  memberTaxProfileUpsert.mockReset();
  teamMemberFindMany.mockReset();
  teamFindUnique.mockReset();
  paymentFindMany.mockReset();
  jobFindMany.mockReset();
  expenseFindMany.mockReset();

  taxSettingFindUnique.mockResolvedValue(null);
  memberTaxProfileFindUnique.mockResolvedValue(null);
  memberTaxProfileFindMany.mockResolvedValue([]);
  teamMemberFindMany.mockResolvedValue([]);
  teamFindUnique.mockResolvedValue({ revenueBasis: "cash" });
  paymentFindMany.mockResolvedValue([]);
  jobFindMany.mockResolvedValue([]);
  expenseFindMany.mockResolvedValue([]);
});

describe("getTaxSetting / upsertTaxSetting", () => {
  it("returns null when the team has no TaxSetting row yet", async () => {
    const result = await getTaxSetting(owner);
    expect(result).toBeNull();
  });

  it("parses a TaxSetting row, converting vatRate from Decimal", async () => {
    taxSettingFindUnique.mockResolvedValue({
      id: "ts-1",
      teamId: "team-1",
      vatRegistered: true,
      vatRate: decimal(7),
      pitBrackets: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await getTaxSetting(owner);
    expect(result).toEqual(
      expect.objectContaining({ vatRegistered: true, vatRate: 7, pitBrackets: null })
    );
  });

  it("a member CANNOT upsert TaxSetting — throws", async () => {
    await expect(upsertTaxSetting(member1, { vatRegistered: true })).rejects.toThrow();
    expect(taxSettingUpsert).not.toHaveBeenCalled();
  });

  it("an owner can upsert TaxSetting", async () => {
    taxSettingUpsert.mockResolvedValue({
      id: "ts-1",
      teamId: "team-1",
      vatRegistered: true,
      vatRate: decimal(7),
      pitBrackets: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await upsertTaxSetting(owner, { vatRegistered: true, vatRate: 7 });

    expect(taxSettingUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: "team-1" },
        create: expect.objectContaining({ teamId: "team-1", vatRegistered: true, vatRate: 7 }),
      })
    );
    expect(result.vatRegistered).toBe(true);
  });

  it("an admin can also upsert TaxSetting", async () => {
    taxSettingUpsert.mockResolvedValue({
      id: "ts-1",
      teamId: "team-1",
      vatRegistered: false,
      vatRate: decimal(7),
      pitBrackets: null,
      createdAt: now,
      updatedAt: now,
    });

    await expect(upsertTaxSetting(admin, { vatRate: 7 })).resolves.toBeDefined();
  });
});

describe("getTeamVatStatus", () => {
  it("any member can read it — wires team revenue into checkVatRegistrationThreshold", async () => {
    paymentFindMany.mockResolvedValue([
      { amount: decimal(1_000_000) },
      { amount: decimal(700_000) },
    ]);

    const result = await getTeamVatStatus(member1, 2026);

    expect(result.year).toBe(2026);
    expect(result.revenue).toBe(1_700_000);
    expect(result.approaching).toBe(true); // 1.7M / 1.8M = ~94% >= 90%
    expect(result.exceeded).toBe(false);
    expect(result.vatRegistered).toBe(false); // no TaxSetting row -> default
    expect(result.vatRate).toBe(7); // default
  });

  it("uses accrual basis revenue when Team.revenueBasis is 'accrual'", async () => {
    teamFindUnique.mockResolvedValue({ revenueBasis: "accrual" });
    jobFindMany.mockResolvedValue([{ totalPrice: decimal(2_000_000) }]);

    const result = await getTeamVatStatus(owner, 2026);

    expect(paymentFindMany).not.toHaveBeenCalled();
    expect(result.revenue).toBe(2_000_000);
    expect(result.exceeded).toBe(true);
  });

  it("reflects the team's saved vatRegistered/vatRate when a TaxSetting row exists", async () => {
    taxSettingFindUnique.mockResolvedValue({
      id: "ts-1",
      teamId: "team-1",
      vatRegistered: true,
      vatRate: decimal(7),
      pitBrackets: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await getTeamVatStatus(member1, 2026);
    expect(result.vatRegistered).toBe(true);
    expect(result.vatRate).toBe(7);
  });
});

describe("getMemberTaxProfile / upsertMemberTaxProfile — self vs manager permission", () => {
  it("a member can read their own profile", async () => {
    const result = await getMemberTaxProfile(member1, "member-1");
    expect(result).toBeNull(); // no row mocked, but no throw either
    expect(memberTaxProfileFindUnique).toHaveBeenCalledWith({
      where: { teamId_userId: { teamId: "team-1", userId: "member-1" } },
    });
  });

  it("a member CANNOT read someone else's profile — throws", async () => {
    await expect(getMemberTaxProfile(member1, "member-2")).rejects.toThrow();
  });

  it("an owner CAN read any member's profile", async () => {
    await expect(getMemberTaxProfile(owner, "member-1")).resolves.toBeNull();
  });

  it("a member can upsert their own profile", async () => {
    memberTaxProfileUpsert.mockResolvedValue({
      id: "mtp-1",
      teamId: "team-1",
      userId: "member-1",
      incomeType: "40_2",
      expenseMethod: "flat",
      deductions: null,
      defaultWhtRate: decimal(3),
      createdAt: now,
      updatedAt: now,
    });

    const result = await upsertMemberTaxProfile(member1, { userId: "member-1", incomeType: "40_2" });
    expect(result.userId).toBe("member-1");
  });

  it("a member CANNOT upsert someone else's profile — throws", async () => {
    await expect(
      upsertMemberTaxProfile(member1, { userId: "member-2", incomeType: "40_8" })
    ).rejects.toThrow();
    expect(memberTaxProfileUpsert).not.toHaveBeenCalled();
  });

  it("an admin CAN upsert another member's profile", async () => {
    memberTaxProfileUpsert.mockResolvedValue({
      id: "mtp-1",
      teamId: "team-1",
      userId: "member-1",
      incomeType: "40_8",
      expenseMethod: "actual",
      deductions: null,
      defaultWhtRate: decimal(3),
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      upsertMemberTaxProfile(admin, { userId: "member-1", incomeType: "40_8", expenseMethod: "actual" })
    ).resolves.toBeDefined();
  });
});

describe("listMemberTaxProfiles", () => {
  it("a member CANNOT list the team's profiles — throws", async () => {
    await expect(listMemberTaxProfiles(member1)).rejects.toThrow();
  });

  it("an owner gets every member, filling schema defaults for those with no saved profile", async () => {
    teamMemberFindMany.mockResolvedValue([
      { userId: "member-1", user: { name: "Member One" } },
      { userId: "member-2", user: { name: "Member Two" } },
    ]);
    memberTaxProfileFindMany.mockResolvedValue([
      {
        id: "mtp-1",
        teamId: "team-1",
        userId: "member-1",
        incomeType: "40_8",
        expenseMethod: "actual",
        deductions: null,
        defaultWhtRate: decimal(5),
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await listMemberTaxProfiles(owner);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "member-1", name: "Member One", incomeType: "40_8" }),
        expect.objectContaining({
          userId: "member-2",
          name: "Member Two",
          incomeType: "40_2", // default — no saved row
          expenseMethod: "flat", // default
        }),
      ])
    );
  });
});

describe("getMemberYearEndTaxEstimate", () => {
  it("a member CANNOT estimate someone else's tax — throws", async () => {
    await expect(getMemberYearEndTaxEstimate(member1, "member-2", 2026)).rejects.toThrow();
  });

  it("flat (เหมา) method: prorates income, splits WHT credit, applies deductions — net taxable income floored at 0", async () => {
    memberTaxProfileFindUnique.mockResolvedValue({
      id: "mtp-1",
      teamId: "team-1",
      userId: "member-1",
      incomeType: "40_2",
      expenseMethod: "flat",
      deductions: [{ label: "ส่วนตัว", amount: 60_000 }],
      defaultWhtRate: decimal(3),
      createdAt: now,
      updatedAt: now,
    });
    paymentFindMany.mockResolvedValue([
      {
        amount: decimal(100_000),
        whtAmount: decimal(3_000),
        job: {
          totalPrice: decimal(200_000),
          assignments: [
            { userId: "member-1", shareType: "PERCENT", shareValue: decimal(50) },
            { userId: "member-2", shareType: "PERCENT", shareValue: decimal(50) },
          ],
        },
      },
    ]);

    const result = await getMemberYearEndTaxEstimate(member1, "member-1", 2026);

    // grossIncome: 100,000 paid * (member-1's 50% job share / 200,000 total) = 50,000
    expect(result.grossIncome).toBe(50_000);
    // WHT: 3,000 split 50/50 -> 1,500 credited to member-1
    expect(result.whtCredited).toBe(1_500);
    // เหมา deduction: min(50,000 * 50%, 100,000) = 25,000
    expect(result.expenseDeduction).toBe(25_000);
    expect(result.additionalDeductions).toBe(60_000);
    // 50,000 - 25,000 - 60,000 is negative -> floored at 0
    expect(result.netIncome).toBe(0);
    expect(result.taxOwed).toBe(0);
    // balance = taxOwed - whtCredited = 0 - 1,500 = -1,500 (มีเครดิตเกิน)
    expect(result.balance).toBe(-1_500);
    expect(result.year).toBe(2026);
    expect(result.userId).toBe("member-1");
  });

  it("actual (ตามจริง) method: pulls expense deduction from this member's own Expense rows", async () => {
    memberTaxProfileFindUnique.mockResolvedValue({
      id: "mtp-1",
      teamId: "team-1",
      userId: "member-1",
      incomeType: "40_8",
      expenseMethod: "actual",
      deductions: null,
      defaultWhtRate: decimal(3),
      createdAt: now,
      updatedAt: now,
    });
    paymentFindMany.mockResolvedValue([
      {
        amount: decimal(700_000),
        whtAmount: decimal(0),
        job: {
          totalPrice: decimal(700_000),
          assignments: [{ userId: "member-1", shareType: "PERCENT", shareValue: decimal(100) }],
        },
      },
    ]);
    expenseFindMany.mockResolvedValue([{ amount: decimal(30_000) }, { amount: decimal(20_000) }]);

    const result = await getMemberYearEndTaxEstimate(member1, "member-1", 2026);

    expect(expenseFindMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ teamId: "team-1", createdById: "member-1" }),
      select: expect.anything(),
    });
    expect(result.grossIncome).toBe(700_000);
    expect(result.expenseDeduction).toBe(50_000); // 30,000 + 20,000
    expect(result.additionalDeductions).toBe(0);
    expect(result.netIncome).toBe(650_000);
    // Progressive tax on 650,000 across default brackets: 0 + 7,500 + 20,000 + 22,500 = 50,000
    expect(result.taxOwed).toBe(50_000);
    expect(result.whtCredited).toBe(0);
    expect(result.balance).toBe(50_000); // ต้องจ่ายเพิ่มปลายปี
  });

  it("falls back to schema defaults (flat method, no deductions) when no MemberTaxProfile exists yet", async () => {
    // memberTaxProfileFindUnique already mocked to resolve null in beforeEach
    paymentFindMany.mockResolvedValue([]);

    const result = await getMemberYearEndTaxEstimate(owner, "member-1", 2026);

    expect(expenseFindMany).not.toHaveBeenCalled(); // flat method never touches Expense
    expect(result.grossIncome).toBe(0);
    expect(result.expenseDeduction).toBe(0);
    expect(result.additionalDeductions).toBe(0);
    expect(result.taxOwed).toBe(0);
    expect(result.balance).toBe(0);
  });
});
