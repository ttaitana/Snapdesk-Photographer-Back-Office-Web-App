import { prisma } from "@snapdesk/db";
import type { TeamRole } from "@snapdesk/types";

/**
 * The thing every team-scoped service function in @snapdesk/core needs:
 * which team, and what the caller is allowed to do in it. This is the seam
 * SPEC.md §3's security requirement ("ทุก query ต้อง scope ด้วย teamId") and
 * task #27 (cross-team leakage tests) are built against.
 *
 * Deliberately takes plain `{ userId, activeTeamId }` rather than a Better
 * Auth `Session` object — packages/core must never depend on @snapdesk/auth
 * or know how a session was obtained (see README.md's apps/* boundary rule).
 * The caller (apps/web, typically a layout or route handler) is responsible
 * for getting `activeTeamId` from `auth.api.getSession(...)`'s
 * `session.activeOrganizationId` field and passing it in.
 */
export interface TeamContext {
  teamId: string;
  userId: string;
  role: TeamRole;
}

export class TeamContextError extends Error {
  constructor(message = "ไม่พบทีมที่ใช้งานอยู่ หรือคุณไม่ได้เป็นสมาชิกของทีมนี้") {
    super(message);
    this.name = "TeamContextError";
  }
}

/**
 * Resolves a team context, or `null` if the user has no active team or
 * isn't actually a member of it (e.g. the cookie's activeOrganizationId is
 * stale because they were removed from the team in another tab/device).
 * Always re-checks membership against the DB — never trusts the session's
 * activeOrganizationId alone, since that's just "last team this session
 * switched to," not proof of current membership.
 */
export async function resolveTeamContext(input: {
  userId: string;
  activeTeamId: string | null | undefined;
}): Promise<TeamContext | null> {
  if (!input.activeTeamId) return null;

  const member = await prisma.teamMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.activeTeamId,
        userId: input.userId,
      },
    },
  });

  if (!member) return null;

  return {
    teamId: member.organizationId,
    userId: member.userId,
    role: member.role as TeamRole,
  };
}

/** Same as {@link resolveTeamContext}, but throws instead of returning
 * `null` — use this at the top of service functions that have no
 * reasonable fallback (almost all of them; see @snapdesk/core/README.md). */
export async function requireTeamContext(input: {
  userId: string;
  activeTeamId: string | null | undefined;
}): Promise<TeamContext> {
  const context = await resolveTeamContext(input);
  if (!context) throw new TeamContextError();
  return context;
}

/** Throws unless `context.role` is one of `allowedRoles` — use for
 * mutations that only owners/admins should perform (e.g. removing a
 * member, changing team settings). */
export function requireRole(context: TeamContext, allowedRoles: TeamRole[]): void {
  if (!allowedRoles.includes(context.role)) {
    throw new TeamContextError("คุณไม่มีสิทธิ์ทำรายการนี้");
  }
}
