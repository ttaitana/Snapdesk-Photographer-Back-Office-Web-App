"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { TAX_ESTIMATE_DISCLAIMER } from "@snapdesk/types";
import { getMyTeamContextAction } from "./actions";
import { VatSettingsPanel } from "./vat-settings-panel";
import { PitBracketEditor } from "./pit-bracket-editor";
import { MemberTaxPanel } from "./member-tax-panel";
import { TaxExportSection } from "./tax-export-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * P6 F7 "ภาษี" — orchestrator for the tax settings page (TASKS.md task #20).
 * Renders the mandatory disclaimer, a shared year selector, and the three
 * sub-panels (VAT, PIT brackets, per-member PIT + year-end estimate).
 * `canManage`/`myUserId` come from one shared getMyTeamContextAction() call
 * rather than each panel re-deriving role client-side.
 */
export function TaxSettingsView() {
  const [year, setYear] = useState<number>(() => new Date().getFullYear());

  const contextQuery = useQuery({
    queryKey: ["my-team-context"],
    queryFn: () => getMyTeamContextAction(),
  });

  const canManage = contextQuery.data?.role === "owner" || contextQuery.data?.role === "admin";
  const myUserId = contextQuery.data?.userId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl uppercase text-ink">ภาษี</h1>
        <p className="text-sm text-muted-foreground">VAT ระดับทีม, ภาษีเงินได้บุคคลธรรมดารายคน, และประมาณการภาษีปลายปี</p>
      </div>

      <div className="panel border-2 border-amber-700/40 bg-amber-50 p-4 text-sm text-amber-900">
        {TAX_ESTIMATE_DISCLAIMER}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" onClick={() => setYear((y) => y - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-20 text-center font-heading text-lg text-ink">ปี {year}</span>
        <Button type="button" variant="outline" size="icon" onClick={() => setYear((y) => y + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {contextQuery.isLoading || !myUserId ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-6">
          <VatSettingsPanel year={year} canManage={canManage} />
          <PitBracketEditor canManage={canManage} />
          <MemberTaxPanel year={year} canManage={canManage} myUserId={myUserId} />
          <TaxExportSection year={year} canManage={canManage} myUserId={myUserId} />
        </div>
      )}
    </div>
  );
}
