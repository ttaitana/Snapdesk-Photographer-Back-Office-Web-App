"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Job, ShareType } from "@snapdesk/types";
import {
  getJobRevenueSplitAction,
  createJobAssignmentAction,
  deleteJobAssignmentAction,
  listTeamMembersAction,
} from "../job-assignments-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

const SHARE_TYPE_LABEL: Record<ShareType, string> = {
  PERCENT: "เปอร์เซ็นต์ (%)",
  FIXED: "จำนวนคงที่ (บาท)",
};

/** Mirrors calculateRevenueSplit() in packages/core/src/job-assignments —
 * duplicated here (rather than imported) only for the client-side "live
 * calc" preview before the new assignment is saved, since client components
 * call Server Actions, not @snapdesk/core, directly. The server re-validates
 * with the real function regardless. */
function previewAmount(
  jobTotal: number,
  existing: Array<{ shareType: ShareType; shareValue: number }>,
  draft: { shareType: ShareType; shareValue: number },
): { amount: number; teamPool: number } {
  const all = [...existing, draft];
  const fixedTotal = round2(all.filter((a) => a.shareType === "FIXED").reduce((s, a) => s + a.shareValue, 0));
  const remaining = Math.max(round2(jobTotal - fixedTotal), 0);
  const amounts = all.map((a) => (a.shareType === "FIXED" ? a.shareValue : round2(remaining * (a.shareValue / 100))));
  const assignedTotal = round2(amounts.reduce((s, a) => s + a, 0));
  // `all` always has >= 1 element (draft is always appended), so this is
  // never actually undefined — the ?? 0 just satisfies
  // noUncheckedIndexedAccess.
  return { amount: amounts[amounts.length - 1] ?? 0, teamPool: round2(jobTotal - assignedTotal) };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * P4 F3 — "แบ่งรายได้": assign สมาชิก + role, set %/fixed share with a live
 * per-person calc, validate the sum never exceeds the job total (server
 * enforces this — see JobAssignmentValidationError), and show the leftover
 * team pool.
 */
export function RevenueSplitSection({ job }: { job: Job }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [roleOnJob, setRoleOnJob] = useState("");
  const [shareType, setShareType] = useState<ShareType>("PERCENT");
  const [shareValue, setShareValue] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const splitQuery = useQuery({
    queryKey: ["job-revenue-split", job.id],
    queryFn: () => getJobRevenueSplitAction(job.id),
  });
  const membersQuery = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listTeamMembersAction(),
  });

  const split = splitQuery.data;
  const members = membersQuery.data ?? [];
  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) map.set(m.userId, m.name || m.email || m.userId);
    return map;
  }, [members]);

  const assignedUserIds = new Set((split?.assignments ?? []).map((a) => a.userId));
  const availableMembers = members.filter((m) => !assignedUserIds.has(m.userId));

  const shareValueNum = Number(shareValue) || 0;
  const preview =
    split && userId
      ? previewAmount(
          split.jobTotal,
          split.assignments.map((a) => ({ shareType: a.shareType, shareValue: a.shareValue })),
          { shareType, shareValue: shareValueNum },
        )
      : null;

  const createMutation = useMutation({
    mutationFn: () =>
      createJobAssignmentAction({
        teamId: job.teamId,
        jobId: job.id,
        userId,
        roleOnJob: roleOnJob.trim() || undefined,
        shareType,
        shareValue: shareValueNum,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-revenue-split", job.id] });
      setUserId("");
      setRoleOnJob("");
      setShareType("PERCENT");
      setShareValue("0");
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error && err.message ? err.message : "บันทึกไม่สำเร็จ ลองอีกครั้ง");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJobAssignmentAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-revenue-split", job.id] });
    },
  });

  function handleAdd() {
    setError(null);
    if (!userId) {
      setError("กรุณาเลือกสมาชิก");
      return;
    }
    if (shareValueNum <= 0) {
      setError("สัดส่วน/จำนวนต้องมากกว่า 0");
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="panel space-y-4 p-5">
      <h3 className="font-heading text-lg uppercase text-ink">แบ่งรายได้ทีม</h3>

      {split && split.assignments.length > 0 ? (
        <ul className="space-y-2">
          {split.assignments.map((a) => (
            <li key={a.assignmentId} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <span className="font-medium text-ink">{memberNameById.get(a.userId) ?? a.userId}</span>
                {a.roleOnJob ? <span className="ml-2 text-muted-foreground">({a.roleOnJob})</span> : null}
                <span className="ml-2 text-muted-foreground">
                  {a.shareType === "PERCENT" ? `${a.shareValue}%` : `฿${formatCurrency(a.shareValue)}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-ink">฿{formatCurrency(a.amount)}</span>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(a.assignmentId)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  ลบ
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">ยังไม่มีการแบ่งรายได้ในงานนี้</p>
      )}

      <div className="flex items-center justify-between border-t border-ink/20 pt-3 text-sm">
        <span className="text-muted-foreground">ส่วนของทีม/สตูดิโอ (team pool)</span>
        <span className="font-heading text-lg text-ink">฿{formatCurrency(split?.teamPool ?? job.totalPrice)}</span>
      </div>

      <div className="space-y-3 border-t border-ink/20 pt-4">
        <p className="text-sm font-medium text-ink">เพิ่มสมาชิกในงานนี้</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="userId">สมาชิก</Label>
            <select
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-9 w-full rounded-md border-2 border-ink bg-surface px-3 text-sm text-ink"
            >
              <option value="">เลือกสมาชิก</option>
              {availableMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name || m.email || m.userId}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roleOnJob">บทบาทในงานนี้</Label>
            <Input
              id="roleOnJob"
              value={roleOnJob}
              onChange={(e) => setRoleOnJob(e.target.value)}
              placeholder="ช่างภาพหลัก, ผู้ช่วย, ตัดต่อ..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shareType">ประเภทส่วนแบ่ง</Label>
            <select
              id="shareType"
              value={shareType}
              onChange={(e) => setShareType(e.target.value as ShareType)}
              className="h-9 w-full rounded-md border-2 border-ink bg-surface px-3 text-sm text-ink"
            >
              <option value="PERCENT">{SHARE_TYPE_LABEL.PERCENT}</option>
              <option value="FIXED">{SHARE_TYPE_LABEL.FIXED}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shareValue">{shareType === "PERCENT" ? "เปอร์เซ็นต์" : "จำนวนเงิน (บาท)"}</Label>
            <Input
              id="shareValue"
              type="number"
              min="0"
              step="0.01"
              value={shareValue}
              onChange={(e) => setShareValue(e.target.value)}
            />
          </div>
        </div>

        {preview ? (
          <p className="text-sm text-muted-foreground">
            ยอดที่จะได้รับ (คำนวณสด): <span className="font-medium text-ink">฿{formatCurrency(preview.amount)}</span>
            {" · "}
            ทีมเหลือ: <span className="font-medium text-ink">฿{formatCurrency(preview.teamPool)}</span>
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="button" variant="primary" size="sm" onClick={handleAdd} disabled={createMutation.isPending}>
          {createMutation.isPending ? "กำลังบันทึก..." : "เพิ่มสมาชิก"}
        </Button>
      </div>
    </div>
  );
}
