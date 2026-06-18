"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getTaxExportSummaryAction } from "./actions";
import { getTeamAction } from "@/app/team/actions";
import { listTeamMembersAction } from "@/app/jobs/job-assignments-actions";
import { Button } from "@/components/ui/button";

/**
 * P6 F7 "Export" (TASKS.md task #22): "export สรุปภาษี (PDF/Excel) เลือก
 * ระดับทีม/รายคน". Lets owner/admin pick ทั้งทีม or a specific member (a
 * plain member can only export their own); generates the PDF via
 * @react-pdf/renderer + tax-summary-pdf.tsx or the workbook via exceljs +
 * tax-summary-excel.ts, both dynamically imported so neither library is in
 * the page's initial bundle (same pattern as quotation-section.tsx).
 */
export function TaxExportSection({
  year,
  canManage,
  myUserId,
}: {
  year: number;
  canManage: boolean;
  myUserId: string;
}) {
  const [scope, setScope] = useState<"team" | "member">(canManage ? "team" : "member");
  const [memberId, setMemberId] = useState(myUserId);
  const [pdfState, setPdfState] = useState<"idle" | "generating" | "error">("idle");
  const [excelState, setExcelState] = useState<"idle" | "generating" | "error">("idle");

  const teamQuery = useQuery({ queryKey: ["team"], queryFn: () => getTeamAction() });
  const membersQuery = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listTeamMembersAction(),
    enabled: canManage && scope === "member",
  });

  function handleScopeChange(next: "team" | "member") {
    setScope(next);
    if (next === "member" && !memberId) setMemberId(myUserId);
  }

  async function handleDownloadPdf() {
    setPdfState("generating");
    try {
      const [summary, { pdf }, { TaxSummaryDocument }] = await Promise.all([
        getTaxExportSummaryAction({ year, scope, memberId: scope === "member" ? memberId : undefined }),
        import("@react-pdf/renderer"),
        import("./tax-summary-pdf"),
      ]);
      const team = teamQuery.data;
      const blob = await pdf(
        <TaxSummaryDocument
          shopName={team?.name || "ร้านถ่ายภาพ"}
          businessName={team?.businessName}
          taxId={team?.taxId}
          summary={summary}
          issuedAtLabel={new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `สรุปภาษี-${scope === "team" ? "ทีม" : "รายคน"}-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setPdfState("idle");
    } catch (err) {
      console.error(err);
      setPdfState("error");
    }
  }

  async function handleDownloadExcel() {
    setExcelState("generating");
    try {
      const [summary, { buildTaxSummaryExcel }] = await Promise.all([
        getTaxExportSummaryAction({ year, scope, memberId: scope === "member" ? memberId : undefined }),
        import("./tax-summary-excel"),
      ]);
      const buffer = await buildTaxSummaryExcel(summary);
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `สรุปภาษี-${scope === "team" ? "ทีม" : "รายคน"}-${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setExcelState("idle");
    } catch (err) {
      console.error(err);
      setExcelState("error");
    }
  }

  return (
    <div className="panel space-y-4 p-5">
      <h3 className="font-heading text-lg uppercase text-ink">ส่งออกสรุปภาษี</h3>

      <div className="flex flex-wrap items-center gap-2">
        {canManage && (
          <div className="flex items-center gap-1.5">
            <Button type="button" variant={scope === "team" ? "primary" : "outline"} size="sm" onClick={() => handleScopeChange("team")}>
              ทั้งทีม
            </Button>
            <Button type="button" variant={scope === "member" ? "primary" : "outline"} size="sm" onClick={() => handleScopeChange("member")}>
              รายคน
            </Button>
          </div>
        )}

        {scope === "member" && canManage && (
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="h-9 rounded-md border-2 border-ink bg-surface px-3 text-sm text-ink"
          >
            {(membersQuery.data ?? []).map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name ?? member.email ?? member.userId}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfState === "generating"}>
          {pdfState === "generating" ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleDownloadExcel} disabled={excelState === "generating"}>
          {excelState === "generating" ? "กำลังสร้าง Excel..." : "ดาวน์โหลด Excel"}
        </Button>
      </div>

      {(pdfState === "error" || excelState === "error") && (
        <p className="text-sm text-destructive">ส่งออกไม่สำเร็จ ลองใหม่อีกครั้ง</p>
      )}
    </div>
  );
}
