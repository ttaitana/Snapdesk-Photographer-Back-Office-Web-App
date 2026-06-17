import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@snapdesk/db", () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@snapdesk/db";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "./index";
import type { TeamContext } from "../team-context";

const findMany = prisma.customer.findMany as unknown as ReturnType<typeof vi.fn>;
const findFirst = prisma.customer.findFirst as unknown as ReturnType<typeof vi.fn>;
const create = prisma.customer.create as unknown as ReturnType<typeof vi.fn>;
const updateMany = prisma.customer.updateMany as unknown as ReturnType<typeof vi.fn>;
const deleteMany = prisma.customer.deleteMany as unknown as ReturnType<typeof vi.fn>;

const context: TeamContext = { teamId: "team-1", userId: "user-1", role: "owner" };

const row = {
  id: "cust-1",
  teamId: "team-1",
  name: "คุณเอ",
  phone: "0812345678",
  email: null,
  lineId: null,
  channel: null,
  note: null,
  createdAt: new Date("2026-01-01"),
};

beforeEach(() => {
  findMany.mockReset();
  findFirst.mockReset();
  create.mockReset();
  updateMany.mockReset();
  deleteMany.mockReset();
});

describe("listCustomers", () => {
  it("scopes the query to context.teamId", async () => {
    findMany.mockResolvedValue([row]);

    const result = await listCustomers(context);

    expect(findMany).toHaveBeenCalledWith({
      where: { teamId: "team-1" },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("คุณเอ");
  });
});

describe("getCustomer", () => {
  it("scopes the lookup by id AND teamId together (cross-team leakage guard)", async () => {
    findFirst.mockResolvedValue(null);

    const result = await getCustomer(context, "cust-from-another-team");

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "cust-from-another-team", teamId: "team-1" },
    });
    expect(result).toBeNull();
  });

  it("returns the parsed customer when found", async () => {
    findFirst.mockResolvedValue(row);

    const result = await getCustomer(context, "cust-1");

    expect(result?.id).toBe("cust-1");
  });
});

describe("createCustomer", () => {
  it("forces teamId from context, never from input", async () => {
    create.mockResolvedValue(row);

    // Deliberately passing a different teamId in input to prove the service
    // ignores it and always uses context.teamId instead.
    await createCustomer(context, {
      teamId: "attacker-team",
      name: "คุณเอ",
      phone: "0812345678",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ teamId: "team-1" }),
    });
  });
});

describe("updateCustomer", () => {
  it("uses updateMany scoped by id+teamId so a foreign customer is never touched", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const result = await updateCustomer(context, {
      id: "cust-from-another-team",
      teamId: "team-1",
      name: "ชื่อใหม่",
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "cust-from-another-team", teamId: "team-1" },
      data: { name: "ชื่อใหม่" },
    });
    expect(result).toBeNull();
  });

  it("re-fetches and returns the updated row when the update succeeds", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findFirst.mockResolvedValue({ ...row, name: "ชื่อใหม่" });

    const result = await updateCustomer(context, {
      id: "cust-1",
      teamId: "team-1",
      name: "ชื่อใหม่",
    });

    expect(result?.name).toBe("ชื่อใหม่");
  });
});

describe("deleteCustomer", () => {
  it("returns false when nothing matched the team-scoped delete", async () => {
    deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteCustomer(context, "cust-from-another-team");

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "cust-from-another-team", teamId: "team-1" },
    });
    expect(result).toBe(false);
  });

  it("returns true when the delete matched", async () => {
    deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteCustomer(context, "cust-1");

    expect(result).toBe(true);
  });
});
