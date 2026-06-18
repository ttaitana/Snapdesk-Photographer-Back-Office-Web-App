import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@snapdesk/db", () => ({
  prisma: {
    job: {
      findMany: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@snapdesk/db";
import { getMonthlyIncomeComparison, getFollowUpJobs } from "./index";
import type { TeamContext } from "../team-context";

const jobFindMany = prisma.job.findMany as unknown as ReturnType<typeof vi.fn>;
const paymentFindMany = prisma.payment.findMany as unknown as ReturnType<typeof vi.fn>;

const context: TeamContext = { teamId: "team-1", userId: "user-1", role: "owner" };

function decimal(n: number) {
  return { toNumber: () => n };
}

function jobRow(overrides: Partial<Record<string, unknown>>) {
  return {
    id: "job-1",
    teamId: "team-1",
    createdById: "user-1",
    customerId: "cust-1",
    title: "ถ่ายแต่งงาน",
    shootType: null,
    status: "QUOTED",
    shootDate: null,
    shootTime: null,
    locationName: null,
    locationLat: null,
    locationLng: null,
    locationUrl: null,
    description: null,
    checklist: null,
    totalPrice: decimal(15000),
    discount: null,
    quotedDeposit: null,
    quoteExpiresAt: null,
    packageId: null,
    deliveryLink: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

beforeEach(() => {
  jobFindMany.mockReset();
  paymentFindMany.mockReset();
});

describe("getMonthlyIncomeComparison", () => {
  it("sums Payment.amount for this month and last month, scoped by the parent job's teamId", async () => {
    paymentFindMany
      .mockResolvedValueOnce([{ amount: decimal(10000) }, { amount: decimal(5000) }])
      .mockResolvedValueOnce([{ amount: decimal(8000) }]);

    const result = await getMonthlyIncomeComparison(context);

    expect(result).toEqual({ thisMonth: 15000, lastMonth: 8000 });
    expect(paymentFindMany).toHaveBeenCalledTimes(2);
    for (const call of paymentFindMany.mock.calls) {
      expect(call[0]).toMatchObject({ where: { job: { teamId: "team-1" } } });
    }
  });

  it("rounds to 2 decimal places", async () => {
    paymentFindMany
      .mockResolvedValueOnce([{ amount: decimal(100.111) }, { amount: decimal(0.222) }])
      .mockResolvedValueOnce([]);

    const result = await getMonthlyIncomeComparison(context);

    expect(result.thisMonth).toBe(100.33);
    expect(result.lastMonth).toBe(0);
  });
});

describe("getFollowUpJobs", () => {
  it("groups QUOTED jobs as awaitingQuoteResponse and SHOOTING/EDITING as notDelivered", async () => {
    jobFindMany
      .mockResolvedValueOnce([jobRow({ id: "job-quoted", status: "QUOTED" })])
      .mockResolvedValueOnce([jobRow({ id: "job-shooting", status: "SHOOTING" })])
      .mockResolvedValueOnce([jobRow({ id: "job-editing", status: "EDITING" })]);

    const result = await getFollowUpJobs(context);

    expect(result.awaitingQuoteResponse.map((j) => j.id)).toEqual(["job-quoted"]);
    expect(result.notDelivered.map((j) => j.id)).toEqual(["job-shooting", "job-editing"]);

    expect(jobFindMany).toHaveBeenCalledTimes(3);
    expect(jobFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { teamId: "team-1", status: "QUOTED" } })
    );
    expect(jobFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { teamId: "team-1", status: "SHOOTING" } })
    );
    expect(jobFindMany).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ where: { teamId: "team-1", status: "EDITING" } })
    );
  });

  it("returns empty arrays when nothing needs follow-up", async () => {
    jobFindMany.mockResolvedValue([]);

    const result = await getFollowUpJobs(context);

    expect(result).toEqual({ awaitingQuoteResponse: [], notDelivered: [] });
  });
});
