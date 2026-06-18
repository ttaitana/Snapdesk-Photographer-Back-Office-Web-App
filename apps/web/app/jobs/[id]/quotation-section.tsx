"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Job } from "@snapdesk/types";
import { updateJobAction, sendQuotationAction } from "../actions";
import { listPackagesAction } from "@/app/packages/actions";
import { getTeamAction } from "@/app/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

/**
 * P4 F2 ใบเสนอราคา — quotation builder embedded on the job detail page.
 * Lets the user pick a saved Package (auto-filling totalPrice) or type a
 * total manually, set discount/มัดจำที่เสนอ/วันหมดอายุ, save those fields
 * back onto the Job, then either export a PDF, copy a Thai text summary for
 * chat, or send the quotation (marks the job QUOTED).
 *
 * Kept separate from job-form.tsx — that form owns the job's core fields;
 * this is a job-detail workflow that reuses updateJobAction's existing
 * partial quotation fields (packageId/totalPrice/discount/quotedDeposit/
 * quoteExpiresAt) and the existing sendQuotationAction.
 */
export function QuotationSection({ job, customerName }: { job: Job; customerName: string }) {
  const queryClient = useQueryClient();

  const packagesQuery = useQuery({
    queryKey: ["packages"],
    queryFn: () => listPackagesAction(),
  });
  const teamQuery = useQuery({
    queryKey: ["team"],
    queryFn: () => getTeamAction(),
  });

  const [packageId, setPackageId] = useState(job.packageId ?? "");
  const [totalPrice, setTotalPrice] = useState(String(job.totalPrice ?? 0));
  const [discount, setDiscount] = useState(String(job.discount ?? 0));
  const [quotedDeposit, setQuotedDeposit] = useState(String(job.quotedDeposit ?? 0));
  const [quoteExpiresAt, setQuoteExpiresAt] = useState(toDateInputValue(job.quoteExpiresAt));
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [pdfState, setPdfState] = useState<"idle" | "generating" | "error">("idle");

  const totalPriceNum = Number(totalPrice) || 0;
  const discountNum = Number(discount) || 0;
  const quotedDepositNum = Number(quotedDeposit) || 0;
  const netTotal = Math.max(0, totalPriceNum - discountNum);

  const packages = packagesQuery.data ?? [];
  const selectedPackage = packages.find((p) => p.id === packageId);

  function handlePackageChange(id: string) {
    setPackageId(id);
    const pkg = packages.find((p) => p.id === id);
    if (pkg) {
      setTotalPrice(String(pkg.price));
    }
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      updateJobAction({
        id: job.id,
        teamId: job.teamId,
        packageId: packageId || undefined,
        totalPrice: totalPriceNum,
        discount: discountNum,
        quotedDeposit: quotedDepositNum,
        quoteExpiresAt: quoteExpiresAt ? new Date(quoteExpiresAt) : undefined,
      }),
    onSuccess: (updated) => {
      if (updated) queryClient.setQueryData(["job", job.id], updated);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      return sendQuotationAction({ teamId: job.teamId, jobId: job.id });
    },
    onSuccess: (updated) => {
      if (updated) queryClient.setQueryData(["job", job.id], updated);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const summaryText = useMemo(
    () =>
      buildSummaryText({
        shopName: teamQuery.data?.businessName || teamQuery.data?.name || "",
        customerName,
        jobTitle: job.title,
        items: selectedPackage?.items ?? [],
        totalPrice: totalPriceNum,
        discount: discountNum,
        netTotal,
        quotedDeposit: quotedDepositNum,
        quoteExpiresAt,
      }),
    [teamQuery.data, customerName, job.title, selectedPackage, totalPriceNum, discountNum, netTotal, quotedDepositNum, quoteExpiresAt],
  );

  async function handleCopySummary() {
    await navigator.clipboard.writeText(summaryText);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  }

  async function handleDownloadPdf() {
    setPdfState("generating");
    try {
      const [{ pdf }, { QuotationDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./quotation-pdf"),
      ]);
      const team = teamQuery.data;
      const blob = await pdf(
        <QuotationDocument
          shopName={team?.name || "ร้านถ่ายภาพ"}
          businessName={team?.businessName}
          taxId={team?.taxId}
          logoUrl={team?.logoUrl}
          customerName={customerName}
          jobTitle={job.title}
          shootType={job.shootType}
          shootDateLabel={
            job.shootDate
              ? job.shootDate.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
              : null
          }
          items={selectedPackage?.items ?? []}
          totalPrice={totalPriceNum}
          discount={discountNum}
          netTotal={netTotal}
          quotedDeposit={quotedDepositNum}
          quoteExpiresAtLabel={
            quoteExpiresAt
              ? new Date(quoteExpiresAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
              : null
          }
          issuedAtLabel={new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ใบเสนอราคา-${job.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setPdfState("idle");
    } catch (err) {
      console.error(err);
      setPdfState("error");
    }
  }

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-lg uppercase text-ink">ใบเสนอราคา</h3>
        {job.status === "QUOTED" ? (
          <span className="rounded-full border border-success px-3 py-1 text-xs font-medium text-success">
            ส่งใบเสนอราคาแล้ว
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="packageId">เลือกแพ็กเกจ (ถ้ามี)</Label>
          <select
            id="packageId"
            value={packageId}
            onChange={(e) => handlePackageChange(e.target.value)}
            className="h-9 w-full rounded-md border-2 border-ink bg-surface px-3 text-sm text-ink"
          >
            <option value="">กรอกราคาเอง</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} — ฿{formatCurrency(pkg.price)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="totalPrice">ราคารวม (บาท)</Label>
          <Input
            id="totalPrice"
            type="number"
            min="0"
            step="0.01"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="discount">ส่วนลด (บาท)</Label>
          <Input
            id="discount"
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quotedDeposit">มัดจำที่เสนอ (บาท)</Label>
          <Input
            id="quotedDeposit"
            type="number"
            min="0"
            step="0.01"
            value={quotedDeposit}
            onChange={(e) => setQuotedDeposit(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quoteExpiresAt">ใบเสนอราคาหมดอายุวันที่</Label>
          <Input
            id="quoteExpiresAt"
            type="date"
            value={quoteExpiresAt}
            onChange={(e) => setQuoteExpiresAt(e.target.value)}
          />
        </div>

        <div className="flex flex-col justify-end space-y-1.5">
          <p className="text-sm text-muted-foreground">ยอดสุทธิ</p>
          <p className="font-heading text-xl text-ink">฿{formatCurrency(netTotal)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink/20 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "กำลังบันทึก..." : "บันทึกใบเสนอราคา"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfState === "generating"}>
          {pdfState === "generating" ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleCopySummary}>
          {copyState === "copied" ? "คัดลอกแล้ว!" : "คัดลอกข้อความสรุป"}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => sendMutation.mutate()}
          disabled={sendMutation.isPending}
        >
          {sendMutation.isPending ? "กำลังส่ง..." : "ส่งใบเสนอราคา"}
        </Button>
      </div>
      {pdfState === "error" ? (
        <p className="text-sm text-destructive">สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
      ) : null}
    </div>
  );
}

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function buildSummaryText(args: {
  shopName: string;
  customerName: string;
  jobTitle: string;
  items: string[];
  totalPrice: number;
  discount: number;
  netTotal: number;
  quotedDeposit: number;
  quoteExpiresAt: string;
}): string {
  const { shopName, customerName, jobTitle, items, totalPrice, discount, netTotal, quotedDeposit, quoteExpiresAt } = args;
  const lines: string[] = [];
  lines.push(`ใบเสนอราคา${shopName ? ` — ${shopName}` : ""}`);
  lines.push(`ลูกค้า: ${customerName}`);
  lines.push(`งาน: ${jobTitle}`);
  if (items.length > 0) {
    lines.push("");
    lines.push("รายการ:");
    for (const item of items) lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push(`ราคารวม: ${formatCurrency(totalPrice)} บาท`);
  if (discount > 0) lines.push(`ส่วนลด: -${formatCurrency(discount)} บาท`);
  lines.push(`ยอดสุทธิ: ${formatCurrency(netTotal)} บาท`);
  if (quotedDeposit > 0) lines.push(`มัดจำที่เสนอ: ${formatCurrency(quotedDeposit)} บาท`);
  if (quoteExpiresAt) {
    lines.push(
      `ใบเสนอราคานี้ใช้ได้ถึง: ${new Date(quoteExpiresAt).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`,
    );
  }
  return lines.join("\n");
}
