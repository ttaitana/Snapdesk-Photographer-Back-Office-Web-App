// Excel layout for the tax summary export (P6 F7 "Export": "export สรุปภาษี
// (PDF/Excel) เลือกระดับทีม/รายคน", TASKS.md task #22) — same data
// (TaxExportSummary) as tax-summary-pdf.tsx, rendered as a workbook instead
// of a page. `exceljs` is the only Excel-writing dependency in the repo
// (browser-compatible `workbook.xlsx.writeBuffer()`, no Node-only APIs),
// added to apps/web/package.json for this feature.
//
// Kept in its own file, same precedent as quotation-pdf.tsx/tax-summary-
// pdf.tsx, so the click handler can `await import("./tax-summary-excel")`
// without dragging `exceljs` into the page's initial bundle.
import type { TaxExportSummary } from "@snapdesk/core";

export async function buildTaxSummaryExcel(summary: TaxExportSummary): Promise<ArrayBuffer> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Snapdesk";
  workbook.created = new Date();

  const { year, scope, vatStatus, members } = summary;

  const vatSheet = workbook.addWorksheet(`VAT ปี ${year}`);
  vatSheet.columns = [{ header: "รายการ", key: "label", width: 28 }, { header: "ค่า", key: "value", width: 20 }];
  vatSheet.addRows([
    { label: "ปี", value: year },
    { label: "ระดับ", value: scope === "team" ? "ทั้งทีม" : "รายบุคคล" },
    { label: "รายรับสะสมปีนี้ (บาท)", value: vatStatus.revenue },
    { label: "เกณฑ์จดทะเบียน VAT (บาท)", value: vatStatus.threshold },
    { label: "คงเหลือก่อนถึงเกณฑ์ (บาท)", value: vatStatus.remaining },
    { label: "สัดส่วนต่อเกณฑ์", value: vatStatus.ratio },
    { label: "ใกล้ถึงเกณฑ์", value: vatStatus.approaching ? "ใช่" : "ไม่" },
    { label: "เกินเกณฑ์แล้ว", value: vatStatus.exceeded ? "ใช่" : "ไม่" },
    { label: "จดทะเบียน VAT แล้ว", value: vatStatus.vatRegistered ? "ใช่" : "ไม่" },
    { label: "อัตรา VAT (%)", value: vatStatus.vatRate },
  ]);
  vatSheet.getRow(1).font = { bold: true };

  const pitSheet = workbook.addWorksheet("ประมาณการภาษีรายบุคคล");
  pitSheet.columns = [
    { header: "ชื่อ", key: "name", width: 20 },
    { header: "ประเภทเงินได้", key: "incomeType", width: 14 },
    { header: "วิธีหักค่าใช้จ่าย", key: "expenseMethod", width: 16 },
    { header: "เงินได้รวม (บาท)", key: "grossIncome", width: 16 },
    { header: "หักค่าใช้จ่าย (บาท)", key: "expenseDeduction", width: 18 },
    { header: "ลดหย่อนเพิ่มเติม (บาท)", key: "additionalDeductions", width: 18 },
    { header: "เงินได้สุทธิ (บาท)", key: "netIncome", width: 16 },
    { header: "ภาษีที่คำนวณ (บาท)", key: "taxOwed", width: 16 },
    { header: "WHT ที่เครดิต (บาท)", key: "whtCredited", width: 16 },
    { header: "คงเหลือ/คืน (บาท)", key: "balance", width: 16 },
  ];
  for (const m of members) {
    pitSheet.addRow({
      name: m.name,
      incomeType: m.incomeType === "40_2" ? "40(2)" : "40(8)",
      expenseMethod: m.expenseMethod === "flat" ? "เหมา" : "ตามจริง",
      grossIncome: m.estimate.grossIncome,
      expenseDeduction: m.estimate.expenseDeduction,
      additionalDeductions: m.estimate.additionalDeductions,
      netIncome: m.estimate.netIncome,
      taxOwed: m.estimate.taxOwed,
      whtCredited: m.estimate.whtCredited,
      balance: m.estimate.balance,
    });
  }
  pitSheet.getRow(1).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}
