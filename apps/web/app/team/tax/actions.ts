"use server";

// Thin Server Actions for the tax settings page — P6 F7 "ภาษี" sub-phase
// (TASKS.md). Same pattern as app/finance/expenses/actions.ts: each action
// resolves the caller's TeamContext, then delegates straight to
// @snapdesk/core; no Prisma import here and no business logic.

import {
  getTaxSetting as getTaxSettingService,
  upsertTaxSetting as upsertTaxSettingService,
  getTeamVatStatus as getTeamVatStatusService,
  getMemberTaxProfile as getMemberTaxProfileService,
  listMemberTaxProfiles as listMemberTaxProfilesService,
  upsertMemberTaxProfile as upsertMemberTaxProfileService,
  getMemberYearEndTaxEstimate as getMemberYearEndTaxEstimateService,
  getTaxExportSummary as getTaxExportSummaryService,
  type TeamVatStatus,
  type TaxExportSummary,
} from "@snapdesk/core";
import type {
  TaxSetting,
  TaxSettingInput,
  MemberTaxProfile,
  MemberTaxProfileInput,
  MemberYearEndTaxEstimate,
  TeamRole,
} from "@snapdesk/types";

import { requireActionContext } from "@/lib/require-action-context";

/** Lets the page decide what to render (editable VAT/bracket form vs.
 * read-only, the per-member table vs. just "my own" profile, which row is
 * "me" in that table) without duplicating @snapdesk/core's owner/admin
 * checks client-side — same "ask, don't duplicate" precedent as
 * app/finance/actions.ts's getMyTeamRoleAction. */
export async function getMyTeamContextAction(): Promise<{ userId: string; role: TeamRole }> {
  const context = await requireActionContext();
  return { userId: context.userId, role: context.role };
}

export async function getTaxSettingAction(): Promise<TaxSetting | null> {
  const context = await requireActionContext();
  return getTaxSettingService(context);
}

export async function upsertTaxSettingAction(
  input: Omit<TaxSettingInput, "teamId">
): Promise<TaxSetting> {
  const context = await requireActionContext();
  return upsertTaxSettingService(context, input);
}

export async function getTeamVatStatusAction(year?: number): Promise<TeamVatStatus> {
  const context = await requireActionContext();
  return getTeamVatStatusService(context, year);
}

export async function getMemberTaxProfileAction(userId: string): Promise<MemberTaxProfile | null> {
  const context = await requireActionContext();
  return getMemberTaxProfileService(context, userId);
}

export async function listMemberTaxProfilesAction(): Promise<
  Array<MemberTaxProfile & { name: string }>
> {
  const context = await requireActionContext();
  return listMemberTaxProfilesService(context);
}

export async function upsertMemberTaxProfileAction(
  input: Omit<MemberTaxProfileInput, "teamId">
): Promise<MemberTaxProfile> {
  const context = await requireActionContext();
  return upsertMemberTaxProfileService(context, input);
}

export async function getMemberYearEndTaxEstimateAction(
  userId: string,
  year?: number
): Promise<MemberYearEndTaxEstimate> {
  const context = await requireActionContext();
  return getMemberYearEndTaxEstimateService(context, userId, year);
}

/** Backs the tax page's "export สรุปภาษี (PDF/Excel)" buttons (TASKS.md
 * task #22) — one call assembles VAT status + every requested member's
 * year-end estimate, so the client-side PDF/Excel builders just render what
 * comes back. */
export async function getTaxExportSummaryAction(options: {
  year?: number;
  scope: "team" | "member";
  memberId?: string;
}): Promise<TaxExportSummary> {
  const context = await requireActionContext();
  return getTaxExportSummaryService(context, options);
}
