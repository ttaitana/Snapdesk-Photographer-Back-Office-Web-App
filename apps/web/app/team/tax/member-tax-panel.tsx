"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PitExpenseMethod, PitIncomeType, TaxDeductionItem } from "@snapdesk/types";
import {
  getMemberTaxProfileAction,
  getMemberYearEndTaxEstimateAction,
  listMemberTaxProfilesAction,
  upsertMemberTaxProfileAction,
} from "./actions";
import { listTeamMembersAction } from "@/app/jobs/job-assignments-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

const INCOME_TYPE_LABEL: Record<PitIncomeType, string> = {
  "40_2": "มาตรา 40(2) — รับจ้าง/ค่าตอบแทนวิชาชีพอิสระ",
  "40_8": "มาตรา 40(8) — ธุรกิจ/วิชาชีพอื่น",
};

const EXPENSE_METHOD_LABEL: Record<PitExpenseMethod, string> = {
  flat: "หักเหมา (% เพดาน)",
  actual: "หักตามจริง (จากรายจ่ายที่บันทึก)",
};

/**
 * P6 F7 — per-member PIT profile (เหมา/ตามจริง, allowances, WHT rate) +
 * year-end estimate (TASKS.md task #20). A member can only view/edit their
 * own row; owner/admin can pick anyone via the same member picker pattern
 * as FinanceSummaryView/RevenueSplitSection.
 */
export function MemberTaxPanel({
  year,
  canManage,
  myUserId,
}: {
  year: number;
  canManage: boolean;
  myUserId: string;
}) {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState(myUserId);

  const [incomeType, setIncomeType] = useState<PitIncomeType>("40_2");
  const [expenseMethod, setExpenseMethod] = useState<PitExpenseMethod>("flat");
  const [defaultWhtRate, setDefaultWhtRate] = useState("3");
  const [deductions, setDeductions] = useState<TaxDeductionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const membersQuery = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listTeamMembersAction(),
    enabled: canManage,
  });

  const profileQuery = useQuery({
    queryKey: ["member-tax-profile", selectedMemberId],
    queryFn: () => getMemberTaxProfileAction(selectedMemberId),
    enabled: Boolean(selectedMemberId),
  });

  const estimateQuery = useQuery({
    queryKey: ["member-tax-estimate", selectedMemberId, year],
    queryFn: () => getMemberYearEndTaxEstimateAction(selectedMemberId, year),
    enabled: Boolean(selectedMemberId),
  });

  const allProfilesQuery = useQuery({
    queryKey: ["member-tax-profiles-all"],
    queryFn: () => listMemberTaxProfilesAction(),
    enabled: canManage,
  });

  // Re-seed the draft form whenever the selected member (or their loaded
  // profile) changes — schema defaults if they haven't saved one yet, same
  // "existing ?? defaults" precedent as @snapdesk/core's listMemberTaxProfiles.
  // Adjusted during render (not in a useEffect) per React's recommended
  // pattern for syncing state from props/query data.
  const [prevSelectedMemberId, setPrevSelectedMemberId] = useState(selectedMemberId);
  const [prevProfileData, setPrevProfileData] = useState(profileQuery.data);
  if (selectedMemberId !== prevSelectedMemberId || profileQuery.data !== prevProfileData) {
    setPrevSelectedMemberId(selectedMemberId);
    setPrevProfileData(profileQuery.data);
    setIncomeType(profileQuery.data?.incomeType ?? "40_2");
    setExpenseMethod(profileQuery.data?.expenseMethod ?? "flat");
    setDefaultWhtRate(String(profileQuery.data?.defaultWhtRate ?? 3));
    setDeductions(profileQuery.data?.deductions ?? []);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertMemberTaxProfileAction({
        userId: selectedMemberId,
        incomeType,
        expenseMethod,
        defaultWhtRate: Number(defaultWhtRate) || 0,
        deductions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-tax-profile", selectedMemberId] });
      queryClient.invalidateQueries({ queryKey: ["member-tax-estimate", selectedMemberId] });
      queryClient.invalidateQueries({ queryKey: ["member-tax-profiles-all"] });
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => {
      setError(err instanceof Error && err.message ? err.message : "บันทึกไม่สำเร็จ ลองอีกครั้ง");
    },
  });

  const canEditSelected = canManage || selectedMemberId === myUserId;
  const members = membersQuery.data ?? [];
  const memberNameById = new Map(members.map((m) => [m.userId, m.name ?? m.email ?? m.userId]));

  function addDeductionRow() {
    setDeductions((rows) => [...rows, { label: "", amount: 0 }]);
  }
  function updateDeductionRow(index: number, patch: Partial<TaxDeductionItem>) {
    setDeductions((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeDeductionRow(index: number) {
    setDeductions((rows) => rows.filter((_, i) => i !== index));
  }

  const estimate = estimateQuery.data;
  const balanceColor =
    estimate && estimate.balance > 0 ? "text-danger" : estimate && estimate.balance < 0 ? "text-success" : "text-ink";

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg uppercase text-ink">ภาษีเงินได้บุคคลธรรมดารายคน (PIT)</h3>

        {canManage && (
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="h-10 rounded-md border-2 border-ink bg-background px-3 text-sm"
          >
            <option value={myUserId}>ฉัน</option>
            {members
              .filter((m) => m.userId !== myUserId)
              .map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name ?? m.email ?? m.userId}
                </option>
              ))}
          </select>
        )}
      </div>

      {profileQuery.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="incomeType">ประเภทเงินได้</Label>
              <select
                id="incomeType"
                value={incomeType}
                disabled={!canEditSelected}
                onChange={(e) => setIncomeType(e.target.value as PitIncomeType)}
                className="h-10 w-full rounded-md border-2 border-ink bg-background px-3 text-sm"
              >
                <option value="40_2">{INCOME_TYPE_LABEL["40_2"]}</option>
                <option value="40_8">{INCOME_TYPE_LABEL["40_8"]}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expenseMethod">วิธีหักค่าใช้จ่าย</Label>
              <select
                id="expenseMethod"
                value={expenseMethod}
                disabled={!canEditSelected}
                onChange={(e) => setExpenseMethod(e.target.value as PitExpenseMethod)}
                className="h-10 w-full rounded-md border-2 border-ink bg-background px-3 text-sm"
              >
                <option value="flat">{EXPENSE_METHOD_LABEL.flat}</option>
                <option value="actual">{EXPENSE_METHOD_LABEL.actual}</option>
              </select>
              {expenseMethod === "actual" && (
                <p className="text-xs text-muted-foreground">
                  ใช้ยอดรวมรายจ่ายที่บันทึกไว้ในระบบของคนนี้สำหรับปี {year}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="defaultWhtRate">อัตราหัก ณ ที่จ่ายเริ่มต้น (%)</Label>
              <Input
                id="defaultWhtRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={!canEditSelected}
                value={defaultWhtRate}
                onChange={(e) => setDefaultWhtRate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-ink/20 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">ค่าลดหย่อนเพิ่มเติม</p>
              {canEditSelected && (
                <Button type="button" variant="outline" size="sm" onClick={addDeductionRow}>
                  + เพิ่มรายการ
                </Button>
              )}
            </div>

            {deductions.length === 0 ? (
              <p className="text-sm text-muted-foreground">ยังไม่มีรายการลดหย่อนเพิ่มเติม</p>
            ) : (
              <ul className="space-y-2">
                {deductions.map((row, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="เช่น ส่วนตัว, บุตร, ประกันสังคม"
                      value={row.label}
                      disabled={!canEditSelected}
                      onChange={(e) => updateDeductionRow(i, { label: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="จำนวน (บาท)"
                      value={row.amount}
                      disabled={!canEditSelected}
                      onChange={(e) => updateDeductionRow(i, { amount: Number(e.target.value) || 0 })}
                      className="w-32"
                    />
                    {canEditSelected && (
                      <button
                        type="button"
                        onClick={() => removeDeductionRow(i)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        ลบ
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {canEditSelected && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว ✓" : "บันทึกข้อมูลภาษี"}
            </Button>
          )}

          <div className="space-y-1.5 border-t border-ink/20 pt-3 text-sm">
            <p className="font-medium text-ink">ประมาณการภาษีปลายปี {year}</p>
            {estimateQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : estimateQuery.isError || !estimate ? (
              <p className="text-sm text-destructive">โหลดประมาณการภาษีไม่สำเร็จ</p>
            ) : (
              <>
                <Row label="รายได้รวม (ตามสัดส่วนงาน)" value={estimate.grossIncome} />
                <Row label="หักค่าใช้จ่าย" value={estimate.expenseDeduction} negative />
                <Row label="หักลดหย่อนเพิ่มเติม" value={estimate.additionalDeductions} negative />
                <Row label="เงินได้สุทธิหลังหัก" value={estimate.netIncome} />
                <Row label="ภาษีที่ต้องเสีย (ตามขั้นบันได)" value={estimate.taxOwed} />
                <Row label="หัก ณ ที่จ่ายที่ถูกเครดิตไว้แล้ว" value={estimate.whtCredited} negative />
                <div className="flex items-center justify-between border-t border-ink/20 pt-2">
                  <span className="font-medium text-ink">
                    {estimate.balance > 0 ? "ต้องจ่ายเพิ่มปลายปี" : estimate.balance < 0 ? "มีเครดิตภาษีเกิน" : "พอดี ไม่ต้องจ่ายเพิ่ม"}
                  </span>
                  <span className={`font-heading text-lg ${balanceColor}`}>
                    ฿{formatCurrency(Math.abs(estimate.balance))}
                  </span>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {canManage && (
        <div className="space-y-2 border-t border-ink/20 pt-4">
          <p className="text-sm font-medium text-ink">ข้อมูลภาษีของทุกคน (สรุป)</p>
          {allProfilesQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-3">ชื่อ</th>
                    <th className="py-1 pr-3">ประเภทเงินได้</th>
                    <th className="py-1 pr-3">วิธีหักค่าใช้จ่าย</th>
                    <th className="py-1 pr-3">WHT เริ่มต้น</th>
                  </tr>
                </thead>
                <tbody>
                  {(allProfilesQuery.data ?? []).map((p) => (
                    <tr
                      key={p.userId}
                      className="cursor-pointer border-t border-ink/10 hover:bg-secondary/40"
                      onClick={() => setSelectedMemberId(p.userId)}
                    >
                      <td className="py-1.5 pr-3 font-medium text-ink">
                        {memberNameById.get(p.userId) ?? p.name}
                      </td>
                      <td className="py-1.5 pr-3">{p.incomeType === "40_2" ? "40(2)" : "40(8)"}</td>
                      <td className="py-1.5 pr-3">{p.expenseMethod === "flat" ? "เหมา" : "ตามจริง"}</td>
                      <td className="py-1.5 pr-3">{p.defaultWhtRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-ink">
        {negative && value > 0 ? "-" : ""}฿{formatCurrency(value)}
      </span>
    </div>
  );
}
