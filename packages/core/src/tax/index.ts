// Tax service — P6 F7 "ภาษี" sub-phase (TASKS.md).
//
// All the actual VAT/WHT/PIT math lives in the pure, DB-free
// @snapdesk/tax-th package; this file is purely the Prisma/TeamContext glue
// around it — resolving TaxSetting/MemberTaxProfile rows, pulling the
// income figures those calculations need from Payment/Job/JobAssignment
// (reusing calculateRevenueSplit from ../job-assignments, same as
// ../finance-summary), and enforcing who's allowed to read/write what.
//
// Permissions:
//   - TaxSetting (team-level VAT) is owner/admin-only to edit; any member
//     can read getTeamVatStatus() (team revenue + threshold is visible to
//     everyone, same precedent as finance-summary's team-view totals).
//   - MemberTaxProfile is self-editable ("แต่ละคนเลือกประเภทเงินได้เองได้",
//     SPEC.md) OR owner/admin on anyone's behalf; listing every member's
//     profile (for the team tax settings page) is owner/admin-only.
//
// ⚠️ Every figure this service returns is an ESTIMATE for planning only —
// see TAX_ESTIMATE_DISCLAIMER (@snapdesk/types) rendered in
// apps/web/app/team/tax/page.tsx.

import { prisma } from "@snapdesk/db";
import {
  taxSettingSchema,
  taxSettingInputSchema,
  memberTaxProfileSchema,
  memberTaxProfileInputSchema,
  memberYearEndTaxEstimateSchema,
  type TaxSetting,
  type TaxSettingInput,
  type MemberTaxProfile,
  type MemberTaxProfileInput,
  type MemberYearEndTaxEstimate,
  type PitIncomeType,
  type PitExpenseMethod,
  type ShareType,
} from "@snapdesk/types";
import {
  DEFAULT_PIT_BRACKETS,
  checkVatRegistrationThreshold,
  splitWhtCredit,
  estimateYearEndTax,
  round2,
  type PitBracket,
  type VatThresholdStatus,
} from "@snapdesk/tax-th";
import type { TeamContext } from "../team-context";
import { TeamContextError } from "../team-context";
import { decimalToNumber } from "../lib/decimal";
import { calculateRevenueSplit } from "../job-assignments";

// ── TaxSetting (team-level VAT) ─────────────────────────────────────────

function toTaxSetting(row: {
  id: string;
  teamId: string;
  vatRegistered: boolean;
  vatRate: { toNumber(): number };
  pitBrackets: unknown;
  createdAt: Date;
  updatedAt: Date;
}): TaxSetting {
  return taxSettingSchema.parse({
    ...row,
    vatRate: decimalToNumber(row.vatRate),
    pitBrackets: (row.pitBrackets as PitBracket[] | null) ?? null,
  });
}

export async function getTaxSetting(context: TeamContext): Promise<TaxSetting | null> {
  const row = await prisma.taxSetting.findUnique({ where: { teamId: context.teamId } });
  return row ? toTaxSetting(row) : null;
}

/** Owner/admin-only — creates the team's TaxSetting row on first save,
 * updates it otherwise (`teamId` is unique, so this is a plain upsert). */
export async function upsertTaxSetting(
  context: TeamContext,
  input: Omit<TaxSettingInput, "teamId">
): Promise<TaxSetting> {
  if (context.role !== "owner" && context.role !== "admin") {
    throw new TeamContextError("คุณไม่มีสิทธิ์แก้ไขตั้งค่าภาษีของทีม");
  }

  const parsed = taxSettingInputSchema.parse({ ...input, teamId: context.teamId });

  const row = await prisma.taxSetting.upsert({
    where: { teamId: context.teamId },
    create: {
      teamId: context.teamId,
      vatRegistered: parsed.vatRegistered ?? false,
      vatRate: parsed.vatRate ?? 7,
      pitBrackets: parsed.pitBrackets ?? undefined,
    },
    update: {
      ...(parsed.vatRegistered !== undefined && { vatRegistered: parsed.vatRegistered }),
      ...(parsed.vatRate !== undefined && { vatRate: parsed.vatRate }),
      ...(parsed.pitBrackets !== undefined && { pitBrackets: parsed.pitBrackets }),
    },
  });

  return toTaxSetting(row);
}

function getEffectiveBrackets(setting: TaxSetting | null): readonly PitBracket[] {
  return setting?.pitBrackets && setting.pitBrackets.length > 0 ? setting.pitBrackets : DEFAULT_PIT_BRACKETS;
}

/** Team.revenueBasis defaults to "cash" at the schema level — narrow
 * defensively, same precedent as ../finance-summary's normalizeBasis. */
function normalizeBasis(value: string): "cash" | "accrual" {
  return value === "accrual" ? "accrual" : "cash";
}

function yearRange(year: number): { gte: Date; lt: Date } {
  return { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
}

/** Team-wide revenue for the calendar year, honoring Team.revenueBasis —
 * cash sums Payment.amount by paidAt, accrual sums Job.totalPrice (minus
 * CANCELLED jobs) by shootDate. Used for the VAT registration threshold
 * check, which cares about total sales, not any one member's split. */
async function getTeamRevenueForYear(teamId: string, year: number): Promise<number> {
  const range = yearRange(year);
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { revenueBasis: true } });
  const basis = normalizeBasis(team?.revenueBasis ?? "cash");

  if (basis === "accrual") {
    const jobs = await prisma.job.findMany({
      where: { teamId, status: { not: "CANCELLED" }, shootDate: range },
      select: { totalPrice: true },
    });
    return round2(jobs.reduce((sum, j) => sum + decimalToNumber(j.totalPrice), 0));
  }

  const payments = await prisma.payment.findMany({
    where: { paidAt: range, job: { teamId } },
    select: { amount: true },
  });
  return round2(payments.reduce((sum, p) => sum + decimalToNumber(p.amount), 0));
}

export interface TeamVatStatus extends VatThresholdStatus {
  year: number;
  vatRegistered: boolean;
  vatRate: number;
}

/** Any team member can read this — team revenue/threshold visibility
 * mirrors finance-summary's team-view totals ("MEMBER เห็น...ยอดทีม"). */
export async function getTeamVatStatus(context: TeamContext, year?: number): Promise<TeamVatStatus> {
  const targetYear = year ?? new Date().getFullYear();
  const [setting, revenue] = await Promise.all([
    getTaxSetting(context),
    getTeamRevenueForYear(context.teamId, targetYear),
  ]);

  const status = checkVatRegistrationThreshold(revenue);

  return {
    ...status,
    year: targetYear,
    vatRegistered: setting?.vatRegistered ?? false,
    vatRate: setting?.vatRate ?? 7,
  };
}

// ── MemberTaxProfile (per-member PIT) ───────────────────────────────────

const DEFAULT_INCOME_TYPE: PitIncomeType = "40_2";
const DEFAULT_EXPENSE_METHOD: PitExpenseMethod = "flat";
const DEFAULT_WHT_RATE = 3;

function toMemberTaxProfile(row: {
  id: string;
  teamId: string;
  userId: string;
  incomeType: string;
  expenseMethod: string;
  deductions: unknown;
  defaultWhtRate: { toNumber(): number };
  createdAt: Date;
  updatedAt: Date;
}): MemberTaxProfile {
  return memberTaxProfileSchema.parse({
    ...row,
    defaultWhtRate: decimalToNumber(row.defaultWhtRate),
    deductions: row.deductions as MemberTaxProfile["deductions"],
  });
}

function requireSelfOrManager(context: TeamContext, targetUserId: string): void {
  const isSelf = context.userId === targetUserId;
  const isManager = context.role === "owner" || context.role === "admin";
  if (!isSelf && !isManager) {
    throw new TeamContextError("คุณไม่มีสิทธิ์ดูหรือแก้ไขข้อมูลภาษีของสมาชิกคนนี้");
  }
}

export async function getMemberTaxProfile(
  context: TeamContext,
  targetUserId: string
): Promise<MemberTaxProfile | null> {
  requireSelfOrManager(context, targetUserId);

  const row = await prisma.memberTaxProfile.findUnique({
    where: { teamId_userId: { teamId: context.teamId, userId: targetUserId } },
  });

  return row ? toMemberTaxProfile(row) : null;
}

/** Owner/admin-only — the team tax settings page's "per-member" table,
 * showing every member's profile (or schema defaults, if they haven't set
 * one up yet) side by side. */
export async function listMemberTaxProfiles(
  context: TeamContext
): Promise<Array<MemberTaxProfile & { name: string }>> {
  if (context.role !== "owner" && context.role !== "admin") {
    throw new TeamContextError("คุณไม่มีสิทธิ์ดูข้อมูลภาษีของทีม");
  }

  const [members, profiles] = await Promise.all([
    prisma.teamMember.findMany({
      where: { organizationId: context.teamId },
      select: { userId: true, user: { select: { name: true } } },
    }),
    prisma.memberTaxProfile.findMany({ where: { teamId: context.teamId } }),
  ]);

  const profileByUserId = new Map(profiles.map((p) => [p.userId, toMemberTaxProfile(p)]));
  const now = new Date();

  return members.map((m) => {
    const existing = profileByUserId.get(m.userId);
    const profile: MemberTaxProfile =
      existing ?? {
        id: "",
        teamId: context.teamId,
        userId: m.userId,
        incomeType: DEFAULT_INCOME_TYPE,
        expenseMethod: DEFAULT_EXPENSE_METHOD,
        deductions: null,
        defaultWhtRate: DEFAULT_WHT_RATE,
        createdAt: now,
        updatedAt: now,
      };
    return { ...profile, name: m.user.name };
  });
}

/** Self-editable ("แต่ละคนเลือกประเภทเงินได้เองได้") or owner/admin on anyone's
 * behalf. `teamId_userId` is unique, so this is a plain upsert. */
export async function upsertMemberTaxProfile(
  context: TeamContext,
  input: Omit<MemberTaxProfileInput, "teamId">
): Promise<MemberTaxProfile> {
  const parsed = memberTaxProfileInputSchema.parse({ ...input, teamId: context.teamId });
  requireSelfOrManager(context, parsed.userId);

  const row = await prisma.memberTaxProfile.upsert({
    where: { teamId_userId: { teamId: context.teamId, userId: parsed.userId } },
    create: {
      teamId: context.teamId,
      userId: parsed.userId,
      incomeType: parsed.incomeType ?? DEFAULT_INCOME_TYPE,
      expenseMethod: parsed.expenseMethod ?? DEFAULT_EXPENSE_METHOD,
      deductions: parsed.deductions ?? undefined,
      defaultWhtRate: parsed.defaultWhtRate ?? DEFAULT_WHT_RATE,
    },
    update: {
      ...(parsed.incomeType !== undefined && { incomeType: parsed.incomeType }),
      ...(parsed.expenseMethod !== undefined && { expenseMethod: parsed.expenseMethod }),
      ...(parsed.deductions !== undefined && { deductions: parsed.deductions }),
      ...(parsed.defaultWhtRate !== undefined && { defaultWhtRate: parsed.defaultWhtRate }),
    },
  });

  return toMemberTaxProfile(row);
}

// ── Year-end estimate ────────────────────────────────────────────────────

type AssignmentRow = { userId: string; shareType: string; shareValue: { toNumber(): number } };

function toAssignmentInputs(assignments: AssignmentRow[]) {
  return assignments.map((a, i) => ({
    id: `a${i}`,
    userId: a.userId,
    shareType: a.shareType as ShareType,
    shareValue: decimalToNumber(a.shareValue),
  }));
}

/** This member's resolved gross income + WHT credited for the calendar
 * year, prorated across every payment received in jobs they're assigned
 * to — same cash-basis proration math as ../finance-summary's
 * getCashBasisIncome, plus splitWhtCredit() (@snapdesk/tax-th) to credit
 * each payment's withheld tax to the same per-assignment ratios. Jobs with
 * no assignments contribute nothing to any member (matches finance-summary
 * precedent — that income/WHT just isn't attributed to a person). */
async function getMemberIncomeAndWht(
  teamId: string,
  userId: string,
  year: number
): Promise<{ grossIncome: number; whtCredited: number }> {
  const range = yearRange(year);

  const payments = await prisma.payment.findMany({
    where: { paidAt: range, job: { teamId } },
    select: {
      amount: true,
      whtAmount: true,
      job: {
        select: {
          totalPrice: true,
          assignments: { select: { userId: true, shareType: true, shareValue: true } },
        },
      },
    },
  });

  let grossIncome = 0;
  let whtCredited = 0;

  for (const payment of payments) {
    const jobTotal = decimalToNumber(payment.job.totalPrice);
    if (jobTotal <= 0 || payment.job.assignments.length === 0) continue;

    const split = calculateRevenueSplit(jobTotal, toAssignmentInputs(payment.job.assignments));
    const mine = split.assignments.find((a) => a.userId === userId);
    if (!mine) continue;

    const ratio = mine.amount / jobTotal;
    grossIncome += decimalToNumber(payment.amount) * ratio;

    const whtAmount = decimalToNumber(payment.whtAmount);
    if (whtAmount > 0) {
      const shares = splitWhtCredit(
        whtAmount,
        split.assignments.map((a) => ({ id: a.userId, ratio: a.amount / jobTotal }))
      );
      whtCredited += shares.find((s) => s.id === userId)?.whtCredited ?? 0;
    }
  }

  return { grossIncome: round2(grossIncome), whtCredited: round2(whtCredited) };
}

/** Sum of this member's own recorded Expense rows for the year — used as
 * the "ตามจริง" (actual) expense deduction figure when their profile picks
 * that method, since MemberTaxProfile has no separate actual-expense field
 * and Expense.createdById already tracks exactly this (same mapping
 * ../finance-summary's member view uses for per-member expense totals). */
async function getMemberActualExpensesForYear(
  teamId: string,
  userId: string,
  year: number
): Promise<number> {
  const range = yearRange(year);
  const expenses = await prisma.expense.findMany({
    where: { teamId, createdById: userId, spentAt: range },
    select: { amount: true },
  });
  return round2(expenses.reduce((sum, e) => sum + decimalToNumber(e.amount), 0));
}

/** "ประมาณการภาษีปลายปีรายคน = ภาษี − WHT ที่เครดิต" (TASKS.md). Self or
 * owner/admin. Pulls income from Payment+JobAssignment, expense deduction
 * from MemberTaxProfile (เหมา) or this member's own Expense rows (ตามจริง),
 * additional allowances from MemberTaxProfile.deductions, and the bracket
 * table from TaxSetting.pitBrackets (or the standard default) — then hands
 * everything to @snapdesk/tax-th's estimateYearEndTax(), the one place the
 * actual formula lives. */
export async function getMemberYearEndTaxEstimate(
  context: TeamContext,
  targetUserId: string,
  year?: number
): Promise<MemberYearEndTaxEstimate> {
  requireSelfOrManager(context, targetUserId);
  const targetYear = year ?? new Date().getFullYear();

  // requireSelfOrManager already passed above, so getMemberTaxProfile's own
  // internal check can't throw here.
  const [profile, setting, income] = await Promise.all([
    getMemberTaxProfile(context, targetUserId),
    getTaxSetting(context),
    getMemberIncomeAndWht(context.teamId, targetUserId, targetYear),
  ]);

  // profile.incomeType (40(2) vs 40(8)) is recorded for display/reference
  // only — it doesn't change the calculation shape this package models
  // (เหมา/ตามจริง + progressive brackets cover both cases the same way). See
  // packages/tax-th/src/pit.ts.
  const expenseMethod = profile?.expenseMethod ?? DEFAULT_EXPENSE_METHOD;
  const additionalDeductions = round2(
    (profile?.deductions ?? []).reduce((sum, d) => sum + d.amount, 0)
  );

  const actualExpenses =
    expenseMethod === "actual"
      ? await getMemberActualExpensesForYear(context.teamId, targetUserId, targetYear)
      : undefined;

  const estimate = estimateYearEndTax({
    grossIncome: income.grossIncome,
    expenseMethod,
    actualExpenses,
    additionalDeductions,
    whtCredited: income.whtCredited,
    brackets: getEffectiveBrackets(setting),
  });

  return memberYearEndTaxEstimateSchema.parse({
    userId: targetUserId,
    year: targetYear,
    ...estimate,
  });
}

// ── Export (TASKS.md "Export": "export สรุปภาษี (PDF/Excel) เลือกระดับทีม/รายคน") ──

/** One member's row in a tax export — name + profile basics + their
 * year-end estimate, side by side (same shape listMemberTaxProfiles already
 * assembles for the settings page's per-member table, plus the estimate). */
export interface TaxExportMemberRow {
  userId: string;
  name: string;
  incomeType: PitIncomeType;
  expenseMethod: PitExpenseMethod;
  estimate: MemberYearEndTaxEstimate;
}

export interface TaxExportSummary {
  year: number;
  scope: "team" | "member";
  vatStatus: TeamVatStatus;
  members: TaxExportMemberRow[];
}

/** Aggregates everything a tax summary export (PDF/Excel) needs into one
 * call, so apps/web never has to loop members or stitch estimates together
 * itself ("logic หลักอยู่ใน packages/core" — Definition of Done).
 *
 * scope="team": every member's row — owner/admin only, same restriction as
 * listMemberTaxProfiles() (this calls it directly).
 * scope="member": just one member's row — self or owner/admin, same
 * restriction as getMemberYearEndTaxEstimate() (requireSelfOrManager). */
export async function getTaxExportSummary(
  context: TeamContext,
  options: { year?: number; scope: "team" | "member"; memberId?: string }
): Promise<TaxExportSummary> {
  const targetYear = options.year ?? new Date().getFullYear();
  const vatStatus = await getTeamVatStatus(context, targetYear);

  if (options.scope === "team") {
    const profiles = await listMemberTaxProfiles(context); // throws if not owner/admin
    const members = await Promise.all(
      profiles.map(async (p) => ({
        userId: p.userId,
        name: p.name,
        incomeType: p.incomeType,
        expenseMethod: p.expenseMethod,
        estimate: await getMemberYearEndTaxEstimate(context, p.userId, targetYear),
      }))
    );
    return { year: targetYear, scope: "team", vatStatus, members };
  }

  const targetUserId = options.memberId ?? context.userId;
  requireSelfOrManager(context, targetUserId);

  const [member, profile, estimate] = await Promise.all([
    prisma.teamMember.findUnique({
      where: { organizationId_userId: { organizationId: context.teamId, userId: targetUserId } },
      select: { user: { select: { name: true } } },
    }),
    getMemberTaxProfile(context, targetUserId),
    getMemberYearEndTaxEstimate(context, targetUserId, targetYear),
  ]);

  return {
    year: targetYear,
    scope: "member",
    vatStatus,
    members: [
      {
        userId: targetUserId,
        name: member?.user.name ?? "",
        incomeType: profile?.incomeType ?? DEFAULT_INCOME_TYPE,
        expenseMethod: profile?.expenseMethod ?? DEFAULT_EXPENSE_METHOD,
        estimate,
      },
    ],
  };
}
