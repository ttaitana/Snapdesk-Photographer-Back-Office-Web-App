import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { toTeamMember, toTeamInvite } from "@snapdesk/auth";
import { resolveTeamContext } from "@snapdesk/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberList, type DisplayMember } from "./member-list";
import { InviteMemberForm } from "./invite-member-form";
import { InviteList } from "./invite-list";

/**
 * Combines tasks #23 (invite flow) and #24 (member management) on one page
 * — both operate on the same member/invite lists, so two separate pages
 * would just mean fetching the same getFullOrganization() twice.
 */
export default async function TeamMembersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const context = await resolveTeamContext({
    userId: session.user.id,
    activeTeamId: session.session.activeOrganizationId,
  });
  if (!context) {
    redirect("/dashboard?error=no-team");
  }

  const org = await auth.api.getFullOrganization({
    query: { organizationId: context.teamId, membersLimit: 100 },
    headers: await headers(),
  });
  if (!org) {
    redirect("/dashboard?error=no-team");
  }

  const canManage = context.role === "owner" || context.role === "admin";

  // getFullOrganization's members come back with a nested `user` object
  // (name/email) — toTeamMember() (packages/auth/src/team-mapping.ts) only
  // maps the fields @snapdesk/types cares about (no display name/email), so
  // that's read off the raw object here rather than widening the shared type.
  type RawMember = Parameters<typeof toTeamMember>[0] & {
    user?: { name?: string | null; email?: string | null };
  };
  const rawMembers = (org.members ?? []) as RawMember[];
  const members: DisplayMember[] = rawMembers.map((m) => ({
    ...toTeamMember(m),
    name: m.user?.name ?? null,
    email: m.user?.email ?? null,
  }));

  type RawInvite = Parameters<typeof toTeamInvite>[0];
  const pendingInvites = ((org.invitations ?? []) as RawInvite[])
    .map(toTeamInvite)
    .filter((invite) => invite.status === "pending");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>สมาชิกทีม</CardTitle>
          <CardDescription>
            {canManage
              ? "เชิญสมาชิกใหม่ เปลี่ยนสิทธิ์ หรือนำสมาชิกออกจากทีม"
              : "เฉพาะเจ้าของหรือผู้ดูแลทีมเท่านั้นที่จัดการสมาชิกได้ — คุณดูได้อย่างเดียว"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberList members={members} canManage={canManage} currentUserId={session.user.id} teamId={context.teamId} />
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>เชิญสมาชิกใหม่</CardTitle>
            <CardDescription>ระบบจะส่งอีเมลเชิญพร้อมลิงก์ยืนยัน (หมดอายุใน 7 วัน)</CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm teamId={context.teamId} />
          </CardContent>
        </Card>
      )}

      {canManage && pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>คำเชิญที่รอตอบรับ</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteList invites={pendingInvites} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
