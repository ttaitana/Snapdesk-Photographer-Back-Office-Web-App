import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@snapdesk/db", () => ({
  prisma: {
    job: {
      findFirst: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@snapdesk/db";
import { TeamContextError } from "../team-context";
import { listPayments, getPayment, createPayment, deletePayment } from "./index";
import type { TeamContext } from "../team-context";

const jobFindFirst = prisma.job.findFirst as unknown as ReturnType<typeof vi.fn>;
const paymentFindMany = prisma.payment.findMany as unknown as ReturnType<typeof vi.fn>;
const paymentFindUnique = prisma.payment.findUnique as unknown as ReturnType<typeof vi.fn>;
const paymentCreate = prisma.payment.create as unknown as ReturnType<typeof vi.fn>;
const paymentDelete = prisma.payment.delete as unknown as ReturnType<typeof vi.fn>;

const context: TeamContext = { teamId: "team-1", userId: "user-1", role: "owner" };

function decimal(n: number) {
  return { toNumber: () => n };
}

const paymentRow = {
  id: "pay-1",
  jobId: "job-1",
  amount: decimal(10000),
  whtRate: decimal(3),
  whtAmount: decimal(300),
  netReceived: decimal(9700),
  type: "DEPOSIT",
  paidAt: new Date("2026-01-01"),
  method: null,
  note: null,
};

beforeEach(() => {
  jobFindFirst.mockReset();
  paymentFindMany.mockReset();
  paymentFindUnique.mockReset();
  paymentCreate.mockReset();
  paymentDelete.mockReset();
});

describe("listPayments", () => {
  it("throws when the job doesn't belong to context.teamId (cross-team leakage guard)", async () => {
    jobFindFirst.mockResolvedValue(null);

    await expect(listPayments(context, "job-from-another-team")).rejects.toThrow(
      TeamContextError
    );
    expect(jobFindFirst).toHaveBeenCalledWith({
      where: { id: "job-from-another-team", teamId: "team-1" },
      select: { id: true },
    });
    expect(paymentFindMany).not.toHaveBeenCalled();
  });

  it("lists payments for a job confirmed to be in the team", async () => {
    jobFindFirst.mockResolvedValue({ id: "job-1" });
    paymentFindMany.mockResolvedValue([paymentRow]);

    const result = await listPayments(context, "job-1");

    expect(result[0]!.amount).toBe(10000);
    expect(result[0]!.netReceived).toBe(9700);
  });
});

describe("getPayment", () => {
  it("returns null when the payment doesn't exist", async () => {
    paymentFindUnique.mockResolvedValue(null);

    const result = await getPayment(context, "missing");

    expect(result).toBeNull();
    expect(jobFindFirst).not.toHaveBeenCalled();
  });

  it("throws if the payment's job belongs to another team", async () => {
    paymentFindUnique.mockResolvedValue(paymentRow);
    jobFindFirst.mockResolvedValue(null);

    await expect(getPayment(context, "pay-1")).rejects.toThrow(TeamContextError);
  });
});

describe("createPayment", () => {
  it("computes whtAmount and netReceived server-side from amount+whtRate", async () => {
    jobFindFirst.mockResolvedValue({ id: "job-1" });
    paymentCreate.mockResolvedValue(paymentRow);

    await createPayment(context, {
      teamId: "team-1",
      jobId: "job-1",
      amount: 10000,
      whtRate: 3,
      type: "DEPOSIT",
    });

    expect(paymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobId: "job-1",
        amount: 10000,
        whtRate: 3,
        whtAmount: 300,
        netReceived: 9700,
        type: "DEPOSIT",
      }),
    });
  });

  it("refuses to create a payment against a job from another team", async () => {
    jobFindFirst.mockResolvedValue(null);

    await expect(
      createPayment(context, {
        teamId: "team-1",
        jobId: "job-from-another-team",
        amount: 5000,
        whtRate: 0,
        type: "FULL",
      })
    ).rejects.toThrow(TeamContextError);

    expect(paymentCreate).not.toHaveBeenCalled();
  });
});

describe("deletePayment", () => {
  it("returns false when the payment doesn't exist", async () => {
    paymentFindUnique.mockResolvedValue(null);

    const result = await deletePayment(context, "missing");

    expect(result).toBe(false);
    expect(paymentDelete).not.toHaveBeenCalled();
  });

  it("throws and refuses to delete when the job belongs to another team", async () => {
    paymentFindUnique.mockResolvedValue({ jobId: "job-1" });
    jobFindFirst.mockResolvedValue(null);

    await expect(deletePayment(context, "pay-1")).rejects.toThrow(TeamContextError);
    expect(paymentDelete).not.toHaveBeenCalled();
  });

  it("deletes when the job is confirmed to belong to the team", async () => {
    paymentFindUnique.mockResolvedValue({ jobId: "job-1" });
    jobFindFirst.mockResolvedValue({ id: "job-1" });

    const result = await deletePayment(context, "pay-1");

    expect(paymentDelete).toHaveBeenCalledWith({ where: { id: "pay-1" } });
    expect(result).toBe(true);
  });
});
