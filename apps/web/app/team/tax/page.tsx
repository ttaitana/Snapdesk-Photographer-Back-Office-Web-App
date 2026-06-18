import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { resolveTeamContext } from "@snapdesk/core";
import { TaxSettingsView } from "./tax-settings-view";

/**
 * P6 F7 "ภาษี" — team tax settings page (TASKS.md task #20):
 *   VAT toggle + rate + threshold warning (team-level, owner/admin edit)
 *   per-member PIT profile (เหมา/ตามจริง, allowances, WHT rate)
 *   year-end estimate per member = ภาษี − WHT ที่เครดิต
 *   editable PIT bracket table
 *   mandatory disclaimer, rendered by TaxSettingsView itself
 *
 * All the actual owner/admin-vs-member/self-vs-others gating happens
 * server-side in @snapdesk/core's tax service (called through
 * app/team/tax/actions.ts) — this page only does the same defensive
 * session/team guard every other /team/* page does (see
 * app/team/settings/page.tsx) before handing off to the client view.
 */
export default async function TeamTaxPage() {
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

  return <TaxSettingsView />;
}
