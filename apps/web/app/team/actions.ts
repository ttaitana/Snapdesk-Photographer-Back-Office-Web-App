"use server";

// Thin Server Action exposing the active team's profile (name/businessName/
// taxId/logoUrl) to client components that aren't already on a page that
// fetched it server-side — e.g. the quotation PDF/text-summary builder
// (P4 F2, TASKS.md: "export PDF (โลโก้/ชื่อร้าน/เลขผู้เสียภาษี/...)"), which
// lives inside job-detail.tsx and has no server-rendered org data of its
// own. Same getFullOrganization() + toTeam() pattern as
// app/team/settings/page.tsx.

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { toTeam } from "@snapdesk/auth";
import type { Team } from "@snapdesk/types";

import { requireActionContext } from "@/lib/require-action-context";

export async function getTeamAction(): Promise<Team | null> {
  const context = await requireActionContext();

  const org = await auth.api.getFullOrganization({
    query: { organizationId: context.teamId },
    headers: await headers(),
  });
  if (!org) return null;

  return toTeam(org);
}
