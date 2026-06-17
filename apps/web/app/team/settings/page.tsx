import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { toTeam } from "@snapdesk/auth";
import { resolveTeamContext } from "@snapdesk/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamSettingsForm } from "./team-settings-form";

/**
 * Edit name / business name / tax ID / logo for the active team. Only
 * owner/admin can actually submit changes (requireRole equivalent below) —
 * a plain member sees the same form but disabled, since SPEC.md's tax/income
 * summary features (P2+) depend on businessName/taxId being accurate and we
 * don't want every member able to change what the books say.
 */
export default async function TeamSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const context = await resolveTeamContext({
    userId: session.user.id,
    activeTeamId: session.session.activeOrganizationId,
  });
  if (!context) {
    // team/layout.tsx already guards this, but page components shouldn't
    // assume a parent layout ran — keep this check cheap and self-contained.
    redirect("/dashboard?error=no-team");
  }

  const org = await auth.api.getFullOrganization({
    query: { organizationId: context.teamId },
    headers: await headers(),
  });
  if (!org) {
    redirect("/dashboard?error=no-team");
  }

  const team = toTeam(org);
  const canEdit = context.role === "owner" || context.role === "admin";

  return (
    <Card>
      <CardHeader>
        <CardTitle>ตั้งค่าทีม</CardTitle>
        <CardDescription>
          {canEdit
            ? "แก้ไขชื่อทีม ชื่อธุรกิจ เลขประจำตัวผู้เสียภาษี และโลโก้"
            : "เฉพาะเจ้าของหรือผู้ดูแลทีมเท่านั้นที่แก้ไขได้ — คุณดูได้อย่างเดียว"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TeamSettingsForm team={team} canEdit={canEdit} />
      </CardContent>
    </Card>
  );
}
