import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteActions } from "./invite-actions";

const ROLE_LABEL: Record<string, string> = {
  owner: "เจ้าของ",
  admin: "ผู้ดูแล",
  member: "สมาชิก",
};

/**
 * Landing page for an invite-member email link (packages/auth/src/email/invite-email.ts
 * builds the link as `${baseURL}/invite/${invitationId}`). This route is NOT
 * in middleware.ts's PUBLIC_PATHS — acceptInvitation/getInvitation both
 * require a logged-in session per Better Auth's docs, so an unauthenticated
 * visitor should be bounced to /login first. The existing middleware
 * already does that (?redirect=<this path>), and login-form.tsx/
 * social-auth-buttons.tsx already send them back here afterwards — no
 * middleware change needed despite the TODO comment that used to be there.
 */
export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestHeaders = await headers();

  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    redirect(`/login?redirect=/invite/${id}`);
  }

  let invitation: {
    id: string;
    email: string;
    role: string;
    status: string;
    organizationId: string;
    organizationName?: string;
    expiresAt: string | Date;
  } | null;

  try {
    invitation = await auth.api.getInvitation({ query: { id }, headers: requestHeaders });
  } catch {
    invitation = null;
  }

  if (!invitation) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
        <Card className="relative max-w-md">
          <CardHeader>
            <CardTitle>ไม่พบคำเชิญ</CardTitle>
            <CardDescription>คำเชิญนี้อาจถูกยกเลิก หมดอายุ หรือไม่มีอยู่จริง</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const expiresAt = new Date(invitation.expiresAt);
  // This is an async Server Component — it runs once per request, not on a
  // re-render loop, so reading the wall clock here doesn't cause the
  // inconsistent-output problem react-hooks/purity guards against on the
  // client. We need real "now" to decide whether the invite has expired.
  // eslint-disable-next-line react-hooks/purity
  const expired = invitation.status === "pending" && expiresAt.getTime() < Date.now();
  const emailMismatch = session.user.email.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <Card className="relative max-w-md">
        <CardHeader>
          <CardTitle>คำเชิญเข้าร่วมทีม</CardTitle>
          <CardDescription>
            {invitation.organizationName ?? "ทีม"} เชิญคุณเข้าร่วมในตำแหน่ง{" "}
            {ROLE_LABEL[invitation.role] ?? invitation.role}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitation.status !== "pending" && (
            <p className="text-sm text-destructive">
              {invitation.status === "accepted" ? "คำเชิญนี้ถูกตอบรับไปแล้ว" : "คำเชิญนี้ไม่สามารถใช้งานได้แล้ว"}
            </p>
          )}
          {invitation.status === "pending" && expired && (
            <p className="text-sm text-destructive">คำเชิญนี้หมดอายุแล้ว — กรุณาขอคำเชิญใหม่</p>
          )}
          {invitation.status === "pending" && !expired && emailMismatch && (
            <p className="text-sm text-destructive">
              คำเชิญนี้ส่งถึง {invitation.email} แต่คุณเข้าสู่ระบบด้วย {session.user.email} —
              กรุณาออกจากระบบแล้วเข้าสู่ระบบด้วยอีเมลที่ได้รับเชิญ
            </p>
          )}
          {invitation.status === "pending" && !expired && !emailMismatch && (
            <InviteActions invitationId={invitation.id} organizationId={invitation.organizationId} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
