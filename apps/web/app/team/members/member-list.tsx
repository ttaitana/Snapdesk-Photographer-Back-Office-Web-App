"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { TeamMember } from "@snapdesk/types";
import { organizationApi } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export type DisplayMember = TeamMember & { name: string | null; email: string | null };

const ROLE_LABEL: Record<string, string> = {
  owner: "เจ้าของ",
  admin: "ผู้ดูแล",
  member: "สมาชิก",
};

export function MemberList({
  members,
  canManage,
  currentUserId,
  teamId,
}: {
  members: DisplayMember[];
  canManage: boolean;
  currentUserId: string;
  teamId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(member: DisplayMember, role: "admin" | "member") {
    setError(null);
    setBusyId(member.id);
    const { error: updateError } = await organizationApi.updateMemberRole({
      role,
      memberId: member.id,
      organizationId: teamId,
    });
    setBusyId(null);
    if (updateError) {
      setError(updateError.message ?? "เปลี่ยนสิทธิ์ไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    router.refresh();
  }

  async function handleRemove(member: DisplayMember) {
    if (!confirm(`นำ ${member.name ?? member.email ?? "สมาชิก"} ออกจากทีม?`)) return;
    setError(null);
    setBusyId(member.id);
    const { error: removeError } = await organizationApi.removeMember({
      memberIdOrEmail: member.userId,
      organizationId: teamId,
    });
    setBusyId(null);
    if (removeError) {
      setError(removeError.message ?? "นำออกไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="divide-y divide-border">
        {members.map((member) => {
          // The team's owner can't be demoted or removed from this generic
          // list — ownership transfer is a separate, more deliberate flow
          // we're not building in P1, and a member can't act on themself
          // here either (avoids accidentally locking yourself out).
          const isOwner = member.role === "owner";
          const isSelf = member.userId === currentUserId;
          const locked = isOwner || isSelf;

          return (
            <div key={member.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {member.name ?? member.email ?? member.userId}
                  {isSelf && <span className="text-muted-foreground"> (คุณ)</span>}
                </p>
                {member.email && member.name && (
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canManage && !locked ? (
                  <select
                    className="h-9 rounded-md border-2 border-ink bg-background px-2 text-sm"
                    value={member.role}
                    disabled={busyId === member.id}
                    onChange={(e) => handleRoleChange(member, e.target.value as "admin" | "member")}
                  >
                    <option value="member">สมาชิก</option>
                    <option value="admin">ผู้ดูแล</option>
                  </select>
                ) : (
                  <span className="text-sm text-muted-foreground">{ROLE_LABEL[member.role] ?? member.role}</span>
                )}

                {canManage && !locked && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busyId === member.id}
                    onClick={() => handleRemove(member)}
                  >
                    นำออก
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
