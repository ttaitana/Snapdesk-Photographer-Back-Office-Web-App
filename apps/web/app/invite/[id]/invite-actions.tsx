"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { organizationApi } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function InviteActions({
  invitationId,
  organizationId,
}: {
  invitationId: string;
  organizationId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setError(null);
    setPending("accept");
    const { error: acceptError } = await organizationApi.acceptInvitation({ invitationId });
    if (acceptError) {
      setPending(null);
      // Most common cause: logged-in session's email doesn't match the
      // invited email — Better Auth requires them to match (see "Email
      // Verification Requirement" in the organization plugin docs).
      setError(
        acceptError.message ?? "ตอบรับคำเชิญไม่สำเร็จ — ตรวจสอบว่าอีเมลที่เข้าสู่ระบบตรงกับอีเมลที่ได้รับเชิญ",
      );
      return;
    }

    // Switch into the team just joined instead of leaving whatever team was
    // previously active — better UX than landing on the dashboard still
    // scoped to an unrelated team.
    await organizationApi.setActive({ organizationId });
    setPending(null);
    router.push("/dashboard");
    router.refresh();
  }

  async function handleReject() {
    setError(null);
    setPending("reject");
    const { error: rejectError } = await organizationApi.rejectInvitation({ invitationId });
    setPending(null);
    if (rejectError) {
      setError(rejectError.message ?? "ปฏิเสธคำเชิญไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" variant="primary" disabled={pending !== null} onClick={handleAccept}>
          {pending === "accept" ? "กำลังตอบรับ..." : "ตอบรับคำเชิญ"}
        </Button>
        <Button type="button" variant="outline" disabled={pending !== null} onClick={handleReject}>
          {pending === "reject" ? "กำลังปฏิเสธ..." : "ปฏิเสธ"}
        </Button>
      </div>
    </div>
  );
}
