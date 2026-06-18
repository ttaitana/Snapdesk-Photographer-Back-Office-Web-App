import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@snapdesk/db", () => ({
  prisma: {
    team: { findUnique: vi.fn() },
    payment: { findMany: vi.fn() },
    job: { findMany: vi.fn() },
    expense: { findMany: vi.fn() },
    teamMember: { findMany: vi.fn() },
  },
}));

import { prisma } from "@snapdesk/db";
import { getFinanceSummary } from "./index";
import type { TeamContext } from "../team-context";

const teamFindUnique = prisma.team.findUnique as unknown as ReturnType<typeof vi.fn>;
const paymentFindMany = prisma.payment.findMany as unknown as ReturnType<typeof vi.fn>;
const jobFindMany = prisma.job.findMany as unknown as ReturnType<typeof vi.fn>;
const expenseFindMany = prisma.expense.findMany as unknown as ReturnType<typeof vi.fn>;
const teamMemberFindMany = prisma.teamMember.findMany as unknown as ReturnType<typeof vi.fn>;

const owner: TeamContext = { teamId: "team-1", userId: "owner-1", role: "owner" };
const member: TeamContext = { teamId: "team-1", userId: "member-1", role: "member" };

const decimal = (n: number) => ({ toNumber: () => n });

beforeEach(() => {
  teamFindUnique.mockReset();
  paymentFindMany.mockReset();
  jobFindMany.mockReset();
  expenseFindMany.mockReset();
  teamMemberFindMany.mockReset();

  // Default: cash basis, no expenses, no members — individual tests override.
  teamFindUnique.mockResolvedValue({ revenueBasis: "cash" });
  paymentFindMany.mockResolvedValue([]);
  jobFindMany.mockResolvedValue([]);
  expenseFindMany.mockResolvedValue([]);
  teamMemberFindMany.mockResolvedValue([]);
});

describe("getFinanceSummary — cash vs accrual basis", () => {
  it("cash basis: sums Payment.amount within the period, ignores Job rows", async () => {
    paymentFindMany.mockResolvedValue([
      { amount: decimal(1000), job: { totalPrice: decimal(1000), assignments: [] } },
      { amount: decimal(500), job: { totalPrice: decimal(2000), assignments: [] } },
    ]);

    const result = await getFinanceSummary(owner, { period: "month", view: "team" });

    expect(jobFindMany).not.toHaveBeenCalled();
    expect(result.totalIncome).toBe(1500);
  });

  it("accrual basis: sums non-cancelled Job.totalPrice in range, ignores Payment rows", async () => {
    teamFindUnique.mockResolvedValue({ revenueBasis: "accrual" });
    jobFindMany.mockResolvedValue([
      { totalPrice: decimal(3000), assignments: [] },
      { totalPrice: decimal(1000), assignments: [] },
    ]);

    const result = await getFinanceSummary(owner, { period: "month", view: "team" });

    expect(paymentFindMany).not.toHaveBeenCalled();
    expect(jobFindMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ teamId: "team-1", status: { not: "CANCELLED" } }),
      select: expect.anything(),
    });
    expect(result.totalIncome).toBe(4000);
  });
});

describe("getFinanceSummary — team totals + category breakdown", () => {
  it("computes totalExpense, netProfit, and groups expenses by category", async () => {
    paymentFindMany.mockResolvedValue([
      { amount: decimal(2000), job: { totalPrice: decimal(2000), assignments: [] } },
    ]);
    expenseFindMany.mockResolvedValue([
      { category: "เดินทาง", amount: decimal(300) },
      { category: "เดินทาง", amount: decimal(200) },
      { category: "อุปกรณ์", amount: decimal(100) },
    ]);

    const result = await getFinanceSummary(owner, { period: "month", view: "team" });

    expect(result.totalExpense).toBe(600);
    expect(result.netProfit).toBe(1400);
    expect(result.expensesByCategory).toEqual(
      expect.arrayContaining([
        { category: "เดินทาง", amount: 500 },
        { category: "อุปกรณ์", amount: 100 },
      ])
    );
  });

  it("populates memberBreakdown for an owner caller, prorating cash income by each assignment's share ratio", async () => {
    paymentFindMany.mockResolvedValue([
      {
        amount: decimal(500), // half of the 1000 job total paid so far
        job: {
          totalPrice: decimal(1000),
          assignments: [{ userId: "member-1", shareType: "PERCENT", shareValue: decimal(50) }],
        },
      },
    ]);
    teamMemberFindMany.mockResolvedValue([
      { userId: "member-1", user: { name: "Member One" } },
      { userId: "owner-1", user: { name: "Owner" } },
    ]);

    const result = await getFinanceSummary(owner, { period: "month", view: "team" });

    // member-1's resolved share of the full job is 50% of 1000 = 500; only
    // half the job has been paid (500/1000), so their prorated cash income
    // for this period is 500 * 0.5 = 250.
    expect(result.memberBreakdown).toEqual(
      expect.arrayContaining([
        { userId: "member-1", name: "Member One", income: 250 },
        { userId: "owner-1", name: "Owner", income: 0 },
      ])
    );
  });

  it("omits memberBreakdown entirely for a member caller", async () => {
    const result = await getFinanceSummary(member, { period: "month", view: "team" });

    expect(teamMemberFindMany).not.toHaveBeenCalled();
    expect(result.memberBreakdown).toBeUndefined();
  });
});

describe("getFinanceSummary — view='member' visibility", () => {
  it("a member can request their own member view", async () => {
    expenseFindMany.mockResolvedValue([{ category: "เดินทาง", amount: decimal(50) }]);

    const result = await getFinanceSummary(member, {
      period: "month",
      view: "member",
      memberId: "member-1",
    });

    expect(result.view).toBe("member");
    expect(result.memberId).toBe("member-1");
    // expense lookup must be narrowed to this member's own recorded expenses
    expect(expenseFindMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ teamId: "team-1", createdById: "member-1" }),
      select: expect.anything(),
    });
  });

  it("a member defaults to themselves when memberId is omitted", async () => {
    const result = await getFinanceSummary(member, { period: "month", view: "member" });
    expect(result.memberId).toBe("member-1");
  });

  it("a member CANNOT request another member's view — throws", async () => {
    await expect(
      getFinanceSummary(member, { period: "month", view: "member", memberId: "someone-else" })
    ).rejects.toThrow();
  });

  it("an owner CAN request any member's view", async () => {
    const result = await getFinanceSummary(owner, {
      period: "month",
      view: "member",
      memberId: "member-1",
    });
    expect(result.memberId).toBe("member-1");
  });
});
