import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@snapdesk/db", () => ({
  prisma: {
    job: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@snapdesk/db";
import { listJobs, getJob, createJob, updateJob, updateJobStatus, deleteJob } from "./index";
import type { TeamContext } from "../team-context";

const findMany = prisma.job.findMany as unknown as ReturnType<typeof vi.fn>;
const findFirst = prisma.job.findFirst as unknown as ReturnType<typeof vi.fn>;
const create = prisma.job.create as unknown as ReturnType<typeof vi.fn>;
const updateMany = prisma.job.updateMany as unknown as ReturnType<typeof vi.fn>;
const deleteMany = prisma.job.deleteMany as unknown as ReturnType<typeof vi.fn>;

const context: TeamContext = { teamId: "team-1", userId: "user-1", role: "member" };

function decimal(n: number) {
  return { toNumber: () => n };
}

const row = {
  id: "job-1",
  teamId: "team-1",
  createdById: "user-1",
  customerId: "cust-1",
  title: "ถ่ายแต่งงาน",
  shootType: null,
  status: "INQUIRY",
  shootDate: null,
  shootTime: null,
  locationName: null,
  locationLat: null,
  locationLng: null,
  locationUrl: null,
  description: null,
  checklist: null,
  totalPrice: decimal(15000),
  packageId: null,
  deliveryLink: null,
  createdAt: new Date("2026-01-01"),
};

beforeEach(() => {
  findMany.mockReset();
  findFirst.mockReset();
  create.mockReset();
  updateMany.mockReset();
  deleteMany.mockReset();
});

describe("listJobs", () => {
  it("scopes by teamId and converts Decimal totalPrice to a number", async () => {
    findMany.mockResolvedValue([row]);

    const result = await listJobs(context);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teamId: "team-1" } })
    );
    expect(result[0]!.totalPrice).toBe(15000);
    expect(typeof result[0]!.totalPrice).toBe("number");
  });

  it("adds a status filter when provided", async () => {
    findMany.mockResolvedValue([]);

    await listJobs(context, { status: "CONFIRMED" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: "team-1", status: "CONFIRMED" },
      })
    );
  });
});

describe("getJob", () => {
  it("scopes by id AND teamId together (cross-team leakage guard)", async () => {
    findFirst.mockResolvedValue(null);

    const result = await getJob(context, "job-from-another-team");

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "job-from-another-team", teamId: "team-1" },
    });
    expect(result).toBeNull();
  });
});

describe("createJob", () => {
  it("sets createdById from context.userId, never from input", async () => {
    create.mockResolvedValue(row);

    await createJob(context, {
      teamId: "team-1",
      customerId: "cust-1",
      title: "ถ่ายแต่งงาน",
      totalPrice: 15000,
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ teamId: "team-1", createdById: "user-1" }),
    });
  });
});

describe("updateJob", () => {
  it("uses updateMany scoped by id+teamId", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const result = await updateJob(context, {
      id: "job-from-another-team",
      teamId: "team-1",
      title: "ชื่อใหม่",
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "job-from-another-team", teamId: "team-1" },
      data: { title: "ชื่อใหม่" },
    });
    expect(result).toBeNull();
  });
});

describe("updateJobStatus", () => {
  it("only changes status, scoped by id+teamId", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findFirst.mockResolvedValue({ ...row, status: "CONFIRMED" });

    const result = await updateJobStatus(context, {
      teamId: "team-1",
      jobId: "job-1",
      status: "CONFIRMED",
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "job-1", teamId: "team-1" },
      data: { status: "CONFIRMED" },
    });
    expect(result?.status).toBe("CONFIRMED");
  });

  it("returns null when the job doesn't belong to context.teamId", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const result = await updateJobStatus(context, {
      teamId: "team-1",
      jobId: "job-from-another-team",
      status: "CONFIRMED",
    });

    expect(result).toBeNull();
  });
});

describe("deleteJob", () => {
  it("returns false when nothing matched the team-scoped delete", async () => {
    deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteJob(context, "job-from-another-team");

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "job-from-another-team", teamId: "team-1" },
    });
    expect(result).toBe(false);
  });
});
