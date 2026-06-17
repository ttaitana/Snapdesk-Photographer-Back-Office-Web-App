"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { TeamInvite } from "@snapdesk/types";
import { organizationApi } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
  owner: "เจ้าของ",
  admin: "ผู้ดูแล",
  member: "สมาชิก",
};

export function InviteList({ invites }: { invites: TeamInvite[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(invite: TeamInvite) {
    setError(null);
    setBusyId(invite.id);
    const { error: cancelError } = await organizationApi.cancelInvitation({
      invitationId: invite.id,
    });
    setBusyId(null);
    if (cancelError) {
      setError(cancelError.message ?? "ยกเลิกคำเชิญไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="divide-y divide-border">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{invite.email}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABEL[invite.role] ?? invite.role} · หมดอายุ {invite.expiresAt.toLocaleDateString("th-TH")}
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busyId === invite.id}
              onClick={() => handleCancel(invite)}
            >
              ยกเลิก
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
