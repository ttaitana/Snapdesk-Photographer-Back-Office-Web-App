"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { SummaryPeriod, SummaryView } from "@snapdesk/types";
import { getFinanceSummaryAction, getMyTeamRoleAction } from "./actions";
import { listTeamMembersAction } from "@/app/jobs/job-assignments-actions";
import { CategoryBreakdownChart } from "./category-breakdown-chart";
import { MemberBreakdownTable } from "./member-breakdown-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

const PERIOD_LABEL: Record<SummaryPeriod, string> = {
  month: "เดือน",
  quarter: "ไตรมาส",
  year: "ปี",
};

function shiftReferenceDate(date: Date, period: SummaryPeriod, direction: 1 | -1): Date {
  const next = new Date(date);
  if (period === "month") next.setMonth(next.getMonth() + direction);
  else if (period === "quarter") next.setMonth(next.getMonth() + direction * 3);
  else next.setFullYear(next.getFullYear() + direction);
  return next;
}

function periodLabel(period: SummaryPeriod, referenceDate: Date): string {
  if (period === "year") return `ปี ${referenceDate.getFullYear()}`;
  if (period === "quarter") {
    const quarter = Math.floor(referenceDate.getMonth() / 3) + 1;
    return `ไตรมาส ${quarter}/${referenceDate.getFullYear()}`;
  }
  return referenceDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

/**
 * P6 F7 — income/expense summary page (task #8, TASKS.md):
 *   "สรุปตามช่วงเวลา (เดือน/ไตรมาส/ปี): รายรับ/รายจ่าย/กำไรสุทธิ + กราฟตามหมวด"
 *   "2 มุมมองสลับได้: ทีม (team total) / รายคน (per member)"
 *   "สิทธิ์การเห็น: MEMBER เห็นของตัวเอง+ยอดทีม, OWNER/ADMIN เห็นทุกคน"
 *
 * All visibility/role rules are enforced server-side in
 * @snapdesk/core/finance-summary — this component only asks getMyTeamRoleAction
 * for the caller's role to decide whether to render the member picker /
 * memberBreakdown table, the same "ask, don't duplicate" approach as
 * app/team/members/page.tsx's canManage check.
 */
export function FinanceSummaryView() {
  const [period, setPeriod] = useState<SummaryPeriod>("month");
  const [referenceDate, setReferenceDate] = useState<Date>(() => new Date());
  const [view, setView] = useState<SummaryView>("team");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  const roleQuery = useQuery({
    queryKey: ["my-team-role"],
    queryFn: () => getMyTeamRoleAction(),
  });
  const role = roleQuery.data;
  const canSeeEveryone = role === "owner" || role === "admin";

  const membersQuery = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listTeamMembersAction(),
    enabled: canSeeEveryone,
  });

  const summaryQuery = useQuery({
    queryKey: [
      "finance-summary",
      period,
      referenceDate.toISOString().slice(0, 10),
      view,
      view === "member" ? selectedMemberId : null,
    ],
    queryFn: () =>
      getFinanceSummaryAction({
        period,
        referenceDate,
        view,
        memberId: view === "member" && selectedMemberId ? selectedMemberId : undefined,
      }),
  });

  function handlePeriodChange(next: SummaryPeriod) {
    setPeriod(next);
  }

  function handleViewChange(next: SummaryView) {
    setView(next);
    if (next === "team") setSelectedMemberId("");
  }

  const summary = summaryQuery.data;
  const netProfitColor =
    summary && summary.netProfit > 0
      ? "text-success"
      : summary && summary.netProfit < 0
        ? "text-danger"
        : "text-ink";

  return (
    <div className="space-y-6">
      <div className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-2xl uppercase text-ink">สรุปรายรับ-รายจ่าย</h2>

          <div className="flex items-center gap-1.5">
            {(["month", "quarter", "year"] as const).map((p) => (
              <Button
                key={p}
                type="button"
                variant={period === p ? "primary" : "outline"}
                onClick={() => handlePeriodChange(p)}
              >
                {PERIOD_LABEL[p]}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setReferenceDate((d) => shiftReferenceDate(d, period, -1))}
              aria-label="ช่วงก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="min-w-[8rem] text-center text-sm font-medium text-ink">
              {periodLabel(period, referenceDate)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setReferenceDate((d) => shiftReferenceDate(d, period, 1))}
              aria-label="ช่วงถัดไป"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant={view === "team" ? "primary" : "outline"}
                onClick={() => handleViewChange("team")}
              >
                ทีม
              </Button>
              <Button
                type="button"
                variant={view === "member" ? "primary" : "outline"}
                onClick={() => handleViewChange("member")}
              >
                {canSeeEveryone ? "รายคน" : "ของฉัน"}
              </Button>
            </div>

            {view === "member" && canSeeEveryone && (
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="h-10 rounded-md border-2 border-ink bg-background px-3 text-sm"
              >
                <option value="">ตัวเอง</option>
                {(membersQuery.data ?? []).map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name ?? member.email ?? member.userId}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {summaryQuery.isLoading ? (
        <div className="panel space-y-3 p-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : summaryQuery.isError || !summary ? (
        <div className="panel p-5">
          <p className="text-sm text-destructive">โหลดสรุปรายรับ-รายจ่ายไม่สำเร็จ ลองรีเฟรชหน้านี้</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="panel space-y-1 p-4">
              <p className="text-sm text-muted-foreground">รายรับ</p>
              <p className="font-heading text-xl text-success">฿{formatCurrency(summary.totalIncome)}</p>
            </div>
            <div className="panel space-y-1 p-4">
              <p className="text-sm text-muted-foreground">รายจ่าย</p>
              <p className="font-heading text-xl text-danger">฿{formatCurrency(summary.totalExpense)}</p>
            </div>
            <div className="panel space-y-1 p-4">
              <p className="text-sm text-muted-foreground">กำไรสุทธิ</p>
              <p className={`font-heading text-xl ${netProfitColor}`}>฿{formatCurrency(summary.netProfit)}</p>
            </div>
          </div>

          <div className="panel space-y-3 p-5">
            <h3 className="font-heading text-lg uppercase text-ink">รายจ่ายตามหมวด</h3>
            <CategoryBreakdownChart data={summary.expensesByCategory} />
          </div>

          {summary.memberBreakdown && (
            <div className="panel space-y-3 p-5">
              <h3 className="font-heading text-lg uppercase text-ink">รายรับแยกตามสมาชิก</h3>
              <MemberBreakdownTable members={summary.memberBreakdown} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
