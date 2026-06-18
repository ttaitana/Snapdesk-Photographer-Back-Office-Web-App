import type { Team, TeamInvite, TeamInviteStatus, TeamMember } from "@snapdesk/types";

/**
 * Translates Better Auth's organization-plugin objects (which keep their
 * original field names — `organizationId`, `logo`, etc. — even though the
 * underlying Prisma models are renamed Team/TeamMember/TeamInvite; see the
 * naming note in packages/db/prisma/schema.prisma) into this project's
 * `@snapdesk/types` shapes.
 *
 * This is the ONLY place that should know Better Auth's raw field names —
 * @snapdesk/core and everything above it should only ever see `Team` /
 * `TeamMember` / `TeamInvite` from @snapdesk/types.
 */

interface RawTeam {
  id: string;
  name: string;
  businessName?: string | null;
  logo?: string | null;
  taxId?: string | null;
  /// P6 F7 — "cash" | "accrual", see RevenueBasis in @snapdesk/types. Better
  /// Auth's additionalFields defaultValue only applies when the field is
  /// omitted on create, so existing rows from before this field existed
  /// could in theory be null/undefined too — hence the `?? "cash"` below.
  revenueBasis?: string | null;
  createdAt: Date | string;
}

export function toTeam(raw: RawTeam): Team {
  return {
    id: raw.id,
    name: raw.name,
    businessName: raw.businessName ?? null,
    logoUrl: raw.logo ?? null,
    taxId: raw.taxId ?? null,
    revenueBasis: (raw.revenueBasis as Team["revenueBasis"]) ?? "cash",
    createdAt: new Date(raw.createdAt),
  };
}

interface RawTeamMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date | string;
}

export function toTeamMember(raw: RawTeamMember): TeamMember {
  return {
    id: raw.id,
    teamId: raw.organizationId,
    userId: raw.userId,
    role: raw.role as TeamMember["role"],
    joinedAt: new Date(raw.createdAt),
  };
}

interface RawTeamInvite {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
}

export function toTeamInvite(raw: RawTeamInvite): TeamInvite {
  return {
    id: raw.id,
    teamId: raw.organizationId,
    email: raw.email,
    role: raw.role as TeamMember["role"],
    status: raw.status as TeamInviteStatus,
    expiresAt: new Date(raw.expiresAt),
  };
}
