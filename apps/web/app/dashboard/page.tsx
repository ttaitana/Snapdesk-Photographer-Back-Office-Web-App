import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { resolveTeamContext } from "@snapdesk/core";
import { Card, CardContent } from "@/components/ui/card";
import { OutstandingSummaryPanel } from "@/app/jobs/outstanding-summary-panel";
import { QuickActions } from "./quick-actions";
import { ShootQueue } from "./shoot-queue";
import { IncomeChart } from "./income-chart";
import { FollowUpSection } from "./follow-up-section";

/**
 * P5 F8 — main dashboard content. dashboard/layout.tsx already wraps this in
 * AppShell (header + nav), so this page only renders the feature content:
 * shoot-queue cards, outstanding total (reused from /jobs, no duplication),
 * the Recharts income comparison, follow-up jobs, and the quick-actions row.
 *
 * Team-context resolution happens here rather than in the layout — other
 * section layouts (app/jobs/layout.tsx etc.) redirect to
 * /dashboard?error=no-team on failure, and since /dashboard IS this route,
 * doing the same redirect here would loop forever. Render the same message
 * inline instead.
 */
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const context = await resolveTeamContext({
    userId: session.user.id,
    activeTeamId: session.session.activeOrganizationId,
  });

  if (!context) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-sm text-destructive">
          ไม่พบทีมที่ใช้งานอยู่สำหรับบัญชีนี้ — กรุณาติดต่อผู้ดูแลระบบ
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <QuickActions />

      <div className="grid gap-6 md:grid-cols-2">
        <ShootQueue />
        <div className="space-y-6">
          <OutstandingSummaryPanel />
          <IncomeChart />
        </div>
      </div>

      <FollowUpSection />
    </div>
  );
}
