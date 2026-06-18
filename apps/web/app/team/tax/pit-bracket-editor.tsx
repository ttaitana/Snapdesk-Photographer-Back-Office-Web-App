"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PitBracket } from "@snapdesk/types";
import { getTaxSettingAction, upsertTaxSettingAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors @snapdesk/tax-th's DEFAULT_PIT_BRACKETS — duplicated here only as
 * the editor's starting point when a team hasn't saved an override yet.
 * apps/web doesn't depend on @snapdesk/tax-th directly (only @snapdesk/core
 * does); the server-side default in packages/core/src/tax/index.ts's
 * getEffectiveBrackets() remains the actual source of truth used in every
 * calculation — this is display/editing convenience only. */
const STANDARD_BRACKETS: PitBracket[] = [
  { min: 0, max: 150_000, rate: 0 },
  { min: 150_000, max: 300_000, rate: 5 },
  { min: 300_000, max: 500_000, rate: 10 },
  { min: 500_000, max: 750_000, rate: 15 },
  { min: 750_000, max: 1_000_000, rate: 20 },
  { min: 1_000_000, max: 2_000_000, rate: 25 },
  { min: 2_000_000, max: 5_000_000, rate: 30 },
  { min: 5_000_000, max: null, rate: 35 },
];

/**
 * P6 F7 — "ตารางขั้นบันไดที่แก้ไขได้" (TASKS.md): editable override of the
 * standard 0–35% PIT bracket table, stored on TaxSetting.pitBrackets and
 * used by every member's year-end estimate (getEffectiveBrackets() in
 * packages/core/src/tax/index.ts falls back to the standard table whenever
 * a team hasn't saved one). Owner/admin only.
 */
export function PitBracketEditor({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [brackets, setBrackets] = useState<PitBracket[]>(STANDARD_BRACKETS);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const settingQuery = useQuery({
    queryKey: ["tax-setting"],
    queryFn: () => getTaxSettingAction(),
  });

  // Adjusted during render (not in a useEffect) per React's recommended
  // pattern for syncing state from query data.
  const [prevSettingData, setPrevSettingData] = useState(settingQuery.data);
  if (settingQuery.data !== prevSettingData) {
    setPrevSettingData(settingQuery.data);
    if (settingQuery.data) {
      const savedBrackets = settingQuery.data.pitBrackets;
      setBrackets(savedBrackets && savedBrackets.length > 0 ? savedBrackets : STANDARD_BRACKETS);
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => upsertTaxSettingAction({ pitBrackets: brackets }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-setting"] });
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => {
      setError(err instanceof Error && err.message ? err.message : "บันทึกไม่สำเร็จ ลองอีกครั้ง");
    },
  });

  function updateRow(index: number, patch: Partial<PitBracket>) {
    setBrackets((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeRow(index: number) {
    setBrackets((rows) => rows.filter((_, i) => i !== index));
  }
  function addRow() {
    setBrackets((rows) => {
      const last = rows[rows.length - 1];
      const newMin = last?.max ?? 0;
      return [...rows, { min: newMin, max: null, rate: 0 }];
    });
  }
  function resetToStandard() {
    setBrackets(STANDARD_BRACKETS);
  }

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-lg uppercase text-ink">ตารางขั้นบันไดภาษี (PIT)</h3>
        {!canManage && (
          <span className="text-xs text-muted-foreground">เฉพาะเจ้าของหรือผู้ดูแลทีมเท่านั้นที่แก้ไขได้</span>
        )}
      </div>

      {settingQuery.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3">ตั้งแต่ (บาท)</th>
                  <th className="py-1 pr-3">ถึง (บาท, เว้นว่าง = ไม่จำกัด)</th>
                  <th className="py-1 pr-3">อัตรา (%)</th>
                  {canManage && <th className="py-1" />}
                </tr>
              </thead>
              <tbody>
                {brackets.map((b, i) => (
                  <tr key={i} className="border-t border-ink/10">
                    <td className="py-1.5 pr-3">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        className="h-9 w-32"
                        value={b.min}
                        disabled={!canManage}
                        onChange={(e) => updateRow(i, { min: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        className="h-9 w-32"
                        value={b.max ?? ""}
                        disabled={!canManage}
                        placeholder="ไม่จำกัด"
                        onChange={(e) =>
                          updateRow(i, { max: e.target.value === "" ? null : Number(e.target.value) || 0 })
                        }
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="h-9 w-24"
                        value={b.rate}
                        disabled={!canManage}
                        onChange={(e) => updateRow(i, { rate: Number(e.target.value) || 0 })}
                      />
                    </td>
                    {canManage && (
                      <td className="py-1.5">
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          ลบ
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                + เพิ่มขั้น
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetToStandard}>
                ใช้ค่ามาตรฐาน
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว ✓" : "บันทึกตาราง"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
