import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamSwitcher } from "@/app/team/team-switcher";

/**
 * Placeholder landing page after login/register — proves a session round
 * trip works end to end. Real dashboard content (queue, quotes, income
 * summary — SPEC.md's actual Feature set) starts once those features are
 * built; this page checks the session itself and redirects if there isn't
 * one (middleware's check is cookie-presence-only, see middleware.ts).
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const { error } = await searchParams;

  return (
    <main className="relative min-h-screen bg-bg p-6 md:p-10">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="font-heading text-3xl uppercase text-ink md:text-4xl">Snapdesk</h1>
          <div className="flex items-center gap-3">
            <TeamSwitcher />
            <LogoutButton />
          </div>
        </header>

        {error === "no-team" && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-sm text-destructive">
              ไม่พบทีมที่ใช้งานอยู่สำหรับบัญชีนี้ — กรุณาติดต่อผู้ดูแลระบบ
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>เข้าสู่ระบบสำเร็จ</CardTitle>
            <CardDescription>{session.user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>ฟีเจอร์จริง (ใบเสนอราคา, การเงิน ฯลฯ) ยังอยู่ในขั้นพัฒนา — ดู TASKS.md</p>
            <div className="flex flex-col gap-1">
              <Link href="/jobs" className="font-medium text-primary underline-offset-4 hover:underline">
                คิวถ่าย →
              </Link>
              <Link href="/team/settings" className="font-medium text-primary underline-offset-4 hover:underline">
                ตั้งค่าทีม →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
