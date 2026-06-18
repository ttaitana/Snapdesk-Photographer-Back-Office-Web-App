"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getTeamVatStatusAction, upsertTaxSettingAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

/**
 * P6 F7 — "VAT ระดับทีม: on/off + อัตรา + เตือนใกล้ 1.8 ล้าน" (TASKS.md).
 * Status (revenue/threshold/warning) is visible to every member; the
 * on/off toggle and rate are only editable by owner/admin — `canManage`
 * is asked from the server, never re-derived client-side (same precedent
 * as FinanceSummaryView's canSeeEveryone).
 */
export function VatSettingsPanel({ year, canManage }: { year: number; canManage: boolean }) {
  const queryClient = useQueryClient();
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatRate, setVatRate] = useState("7");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["tax-vat-status", year],
    queryFn: () => getTeamVatStatusAction(year),
  });

  // Adjusted during render (not in a useEffect) per React's recommended
  // pattern for syncing state from query data.
  const [prevStatusData, setPrevStatusData] = useState(statusQuery.data);
  if (statusQuery.data !== prevStatusData) {
    setPrevStatusData(statusQuery.data);
    if (statusQuery.data) {
      setVatRegistered(statusQuery.data.vatRegistered);
      setVatRate(String(statusQuery.data.vatRate));
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => upsertTaxSettingAction({ vatRegistered, vatRate: Number(vatRate) || 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-vat-status"] });
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => {
      setError(err instanceof Error && err.message ? err.message : "บันทึกไม่สำเร็จ ลองอีกครั้ง");
    },
  });

  const status = statusQuery.data;

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-lg uppercase text-ink">VAT ระดับทีม</h3>
        {!canManage && (
          <span className="text-xs text-muted-foreground">เฉพาะเจ้าของหรือผู้ดูแลทีมเท่านั้นที่แก้ไขได้</span>
        )}
      </div>

      {statusQuery.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : statusQuery.isError || !status ? (
        <p className="text-sm text-destructive">โหลดสถานะ VAT ไม่สำเร็จ ลองรีเฟรชหน้านี้</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={vatRegistered ? "primary" : "outline"}
              disabled={!canManage}
              onClick={() => canManage && setVatRegistered(true)}
            >
              จดทะเบียน VAT
            </Button>
            <Button
              type="button"
              variant={!vatRegistered ? "primary" : "outline"}
              disabled={!canManage}
              onClick={() => canManage && setVatRegistered(false)}
            >
              ยังไม่จดทะเบียน
            </Button>

            <div className="ml-2 flex items-center gap-2">
              <Label htmlFor="vatRate" className="whitespace-nowrap">
                อัตรา VAT (%)
              </Label>
              <Input
                id="vatRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="h-9 w-24"
                value={vatRate}
                disabled={!canManage}
                onChange={(e) => setVatRate(e.target.value)}
              />
            </div>

            {canManage && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว ✓" : "บันทึก"}
              </Button>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="space-y-1.5 border-t border-ink/20 pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">รายได้สะสมปี {year}</span>
              <span className="font-medium text-ink">฿{formatCurrency(status.revenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">เกณฑ์จดทะเบียน VAT บังคับ</span>
              <span className="font-medium text-ink">฿{formatCurrency(status.threshold)}</span>
            </div>
            {status.exceeded ? (
              <p className="text-sm font-medium text-danger">
                ⚠️ รายได้เกินเกณฑ์ 1.8 ล้านบาทแล้ว — ต้องจดทะเบียน VAT ตามกฎหมาย
              </p>
            ) : status.approaching ? (
              <p className="text-sm font-medium text-amber-700">
                ⚠️ ใกล้ถึงเกณฑ์ 1.8 ล้านบาท (เหลืออีก ฿{formatCurrency(status.remaining)}) — เตรียมตัวจดทะเบียน VAT
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                ยังเหลืออีก ฿{formatCurrency(status.remaining)} ก่อนถึงเกณฑ์จดทะเบียน VAT บังคับ
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
