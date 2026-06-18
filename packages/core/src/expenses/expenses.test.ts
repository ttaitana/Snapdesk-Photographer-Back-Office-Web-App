import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@snapdesk/db", () => ({
  prisma: {
    expense: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    job: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@snapdesk/db";
import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from "./index";
import type { TeamContext } from "../team-context";

const findMany = prisma.expense.findMany as unknown as ReturnType<typeof vi.fn>;
const findFirst = prisma.expense.findFirst as unknown as ReturnType<typeof vi.fn>;
const create = prisma.expense.create as unknown as ReturnType<typeof vi.fn>;
const updateMany = prisma.expense.updateMany as unknown as ReturnType<typeof vi.fn>;
const deleteMany = prisma.expense.deleteMany as unknown as ReturnType<typeof vi.fn>;
const jobFindFirst = prisma.job.findFirst as unknown as ReturnType<typeof vi.fn>;

const context: TeamContext = { teamId: "team-1", userId: "user-1", role: "owner" };

const row = {
  id: "exp-1",
  teamId: "team-1",
  createdById: "user-1",
  jobId: null,
  category: "เดินทาง",
  amount: { toNumber: () => 250 },
  spentAt: new Date("2026-06-01"),
  note: null,
  receiptUrl: null,
  createdAt: new Date("2026-06-01"),
};

beforeEach(() => {
  findMany.mockReset();
  findFirst.mockReset();
  create.mockReset();
  updateMany.mockReset();
  deleteMany.mockReset();
  jobFindFirst.mockReset();
});

describe("listExpenses", () => {
  it("scopes the query to context.teamId", async () => {
    findMany.mockResolvedValue([row]);

    const result = await listExpenses(context);

    expect(findMany).toHaveBeenCalledWith({
      where: { teamId: "team-1" },
      orderBy: { spentAt: "desc" },
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.amount).toBe(250);
  });

  it("adds optional filters (jobId/category/date range) on top of teamId", async () => {
    findMany.mockResolvedValue([]);

    await listExpenses(context, {
      jobId: "job-1",
      category: "อุปกรณ์",
      spentFrom: new Date("2026-06-01"),
      spentTo: new Date("2026-07-01"),
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        teamId: "team-1",
        jobId: "job-1",
        category: "อุปกรณ์",
        spentAt: { gte: new Date("2026-06-01"), lt: new Date("2026-07-01") },
      },
      orderBy: { spentAt: "desc" },
    });
  });
});

describe("getExpense", () => {
  it("scopes the lookup by id AND teamId together (cross-team leakage guard)", async () => {
    findFirst.mockResolvedValue(null);

    const result = await getExpense(context, "exp-from-another-team");

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "exp-from-another-team", teamId: "team-1" },
    });
    expect(result).toBeNull();
  });

  it("returns the parsed expense when found", async () => {
    findFirst.mockResolvedValue(row);

    const result = await getExpense(context, "exp-1");

    expect(result?.category).toBe("เดินทาง");
    expect(result?.amount).toBe(250);
  });
});

describe("createExpense", () => {
  it("forces teamId and createdById from context, never from input", async () => {
    create.mockResolvedValue(row);

    // Deliberately passing a different teamId in input to prove the service
    // ignores it and always uses context.teamId/context.userId instead.
    await createExpense(context, {
      teamId: "attacker-team",
      category: "เดินทาง",
      amount: 250,
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ teamId: "team-1", createdById: "user-1" }),
    });
  });

  it("does not touch prisma.job when jobId is omitted", async () => {
    create.mockResolvedValue(row);

    await createExpense(context, { teamId: "team-1", category: "อื่นๆ", amount: 100 });

    expect(jobFindFirst).not.toHaveBeenCalled();
  });

  it("validates jobId belongs to the caller's team before linking it", async () => {
    jobFindFirst.mockResolvedValue(null);

    await expect(
      createExpense(context, {
        teamId: "team-1",
        jobId: "job-from-another-team",
        category: "เดินทาง",
        amount: 250,
      })
    ).rejects.toThrow();

    expect(jobFindFirst).toHaveBeenCalledWith({
      where: { id: "job-from-another-team", teamId: "team-1" },
      select: { id: true },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("links the job when it does belong to the caller's team", async () => {
    jobFindFirst.mockResolvedValue({ id: "job-1" });
    create.mockResolvedValue({ ...row, jobId: "job-1" });

    const result = await createExpense(context, {
      teamId: "team-1",
      jobId: "job-1",
      category: "เดินทาง",
      amount: 250,
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ jobId: "job-1" }),
    });
    expect(result.jobId).toBe("job-1");
  });
});

describe("updateExpense", () => {
  it("uses updateMany scoped by id+teamId so a foreign expense is never touched", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const result = await updateExpense(context, {
      id: "exp-from-another-team",
      teamId: "team-1",
      category: "ใหม่",
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "exp-from-another-team", teamId: "team-1" },
      data: { category: "ใหม่" },
    });
    expect(result).toBeNull();
  });

  it("re-fetches and returns the updated row when the update succeeds", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findFirst.mockResolvedValue({ ...row, category: "ใหม่" });

    const result = await updateExpense(context, {
      id: "exp-1",
      teamId: "team-1",
      category: "ใหม่",
    });

    expect(result?.category).toBe("ใหม่");
  });
});

describe("deleteExpense", () => {
  it("returns false when nothing matched the team-scoped delete", async () => {
    deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteExpense(context, "exp-from-another-team");

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "exp-from-another-team", teamId: "team-1" },
    });
    expect(result).toBe(false);
  });

  it("returns true when the delete matched", async () => {
    deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteExpense(context, "exp-1");

    expect(result).toBe(true);
  });
});
