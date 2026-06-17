"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { organizationApi } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteMemberForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const { error: inviteError } = await organizationApi.inviteMember({
      email: email.trim(),
      role,
      organizationId: teamId,
    });
    setSubmitting(false);

    if (inviteError) {
      setError(inviteError.message ?? "ส่งคำเชิญไม่สำเร็จ ลองอีกครั้ง");
      return;
    }

    setEmail("");
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1 space-y-1.5">
        <Label htmlFor="invite-email">อีเมล</Label>
        <Input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invite-role">สิทธิ์</Label>
        <select
          id="invite-role"
          className="h-10 rounded-md border-2 border-ink bg-background px-3 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "member")}
        >
          <option value="member">สมาชิก</option>
          <option value="admin">ผู้ดูแล</option>
        </select>
      </div>

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? "กำลังส่ง..." : "ส่งคำเชิญ"}
      </Button>

      {error && <p className="w-full text-sm text-destructive">{error}</p>}
      {success && <p className="w-full text-sm text-primary">ส่งคำเชิญแล้ว</p>}
    </form>
  );
}
