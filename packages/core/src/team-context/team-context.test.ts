import { describe, it, expect, vi, beforeEach } from "vitest";

// @snapdesk/db is mocked entirely — these tests must never touch a real
// database. resolveTeamContext is the single chokepoint that decides
// whether a userId is allowed to act as a given activeTeamId, so the most
// important case here is "membership row doesn't exist" returning null
// (cross-team leakage) rather than throwing or — worse — returning a
// context anyway.
vi.mock("@snapdesk/db", () => ({
  prisma: {
    teamMember: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@snapdesk/db";
import {
  resolveTeamContext,
  requireTeamContext,
  requireRole,
  TeamContextError,
} from "./index";

const findUnique = prisma.teamMember.findUnique as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  findUnique.mockReset();
});

describe("resolveTeamContext", () => {
  it("returns null without querying the DB when activeTeamId is missing", async () => {
    const result = await resolveTeamContext({ userId: "user-1", activeTeamId: null });
    expect(result).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null without querying the DB when activeTeamId is undefined", async () => {
    const result = await resolveTeamContext({ userId: "user-1", activeTeamId: undefined });
    expect(result).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the user has no membership row for that team (cross-team leakage guard)", async () => {
    // Simulates a user whose session/cookie claims an activeTeamId they do
    // not actually belong to — e.g. a forged/stale value, or a team they
    // were removed from. This must never fall through to a valid context.
    findUnique.mockResolvedValue(null);

    const result = await resolveTeamContext({
      userId: "user-1",
      activeTeamId: "team-belongs-to-someone-else",
    });

    expect(result).toBeNull();
  });

  it("scopes the lookup to the exact (organizationId, userId) pair — not organizationId alone", async () => {
    findUnique.mockResolvedValue(null);

    await resolveTeamContext({ userId: "user-1", activeTeamId: "team-9" });

    // Asserting the exact where-clause shape so a future refactor can't
    // accidentally loosen this to "any member of team-9" instead of "this
    // specific user is a member of team-9".
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_userId: {
          organizationId: "team-9",
          userId: "user-1",
        },
      },
    });
  });

  it("returns the matching TeamContext when a membership row exists", async () => {
    findUnique.mockResolvedValue({
      id: "member-1",
      organizationId: "team-9",
      userId: "user-1",
      role: "admin",
      createdAt: new Date(),
    });

    const result = await resolveTeamContext({ userId: "user-1", activeTeamId: "team-9" });

    expect(result).toEqual({
      teamId: "team-9",
      userId: "user-1",
      role: "admin",
    });
  });
});

describe("requireTeamContext", () => {
  it("throws TeamContextError when there is no valid context", async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      requireTeamContext({ userId: "user-1", activeTeamId: "team-9" })
    ).rejects.toThrow(TeamContextError);
  });

  it("returns the context when one exists, instead of throwing", async () => {
    findUnique.mockResolvedValue({
      id: "member-1",
      organizationId: "team-9",
      userId: "user-1",
      role: "owner",
      createdAt: new Date(),
    });

    const result = await requireTeamContext({ userId: "user-1", activeTeamId: "team-9" });
    expect(result.role).toBe("owner");
  });
});

describe("requireRole", () => {
  const context = { teamId: "team-9", userId: "user-1", role: "member" as const };

  it("does not throw when the context's role is in the allowed list", () => {
    expect(() => requireRole(context, ["member", "admin"])).not.toThrow();
  });

  it("throws TeamContextError when the context's role is not allowed", () => {
    expect(() => requireRole(context, ["owner", "admin"])).toThrow(TeamContextError);
  });
});
