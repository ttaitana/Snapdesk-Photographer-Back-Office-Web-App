// Raw CSV export (P6 F7 "Export": "export raw CSV (ทุก field + คอลัมน์
// ส่วนแบ่ง) + ใส่ BOM", TASKS.md task #25). Pure string-building — no
// library needed (unlike the PDF/Excel tax export), so this isn't behind a
// dynamic import; it's cheap enough to ship in the page's normal bundle.
//
// Two sections (รายรับ/รายจ่าย) in one file rather than two downloads,
// since they share a year and a "view" scope and an accountant opening this
// in Excel/Sheets just wants the one workbook-ish file. Excel/Sheets both
// recognize a leading UTF-8 BOM (U+FEFF) and switch encoding accordingly —
// without it, Thai text in Excel (Windows) renders as mojibake.
import type { FinanceExportData } from "@snapdesk/core";

const BOM = "\uFEFF";

function formatDateCell(date: Date): string {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? formatDateCell(value) : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCsvCell).join(","));
  return lines.join("\r\n");
}

const INCOME_HEADERS = [
  "รหัสการจ่าย",
  "รหัสงาน",
  "ชื่องาน",
  "ลูกค้า",
  "วันที่รับเงิน",
  "ประเภท",
  "วิธีรับเงิน",
  "จำนวนเงิน",
  "อัตรา WHT (%)",
  "ยอด WHT",
  "ยอดรับสุทธิ",
  "โน้ต",
  "ส่วนแบ่ง",
];

const EXPENSE_HEADERS = [
  "รหัสค่าใช้จ่าย",
  "รหัสงาน",
  "ชื่องาน",
  "หมวดหมู่",
  "จำนวนเงิน",
  "วันที่จ่าย",
  "โน้ต",
  "ลิงก์ใบเสร็จ",
  "บันทึกโดย",
];

export function buildFinanceExportCsv(data: FinanceExportData): string {
  const incomeRows = data.income.map((r) => [
    r.paymentId,
    r.jobId,
    r.jobTitle,
    r.customerName,
    r.paidAt,
    r.type,
    r.method ?? "",
    r.amount,
    r.whtRate,
    r.whtAmount,
    r.netReceived ?? "",
    r.note ?? "",
    r.split,
  ]);

  const expenseRows = data.expenses.map((e) => [
    e.expenseId,
    e.jobId ?? "",
    e.jobTitle ?? "",
    e.category,
    e.amount,
    e.spentAt,
    e.note ?? "",
    e.receiptUrl ?? "",
    e.createdByName,
  ]);

  return (
    BOM +
    `รายรับ (ปี ${data.year})\r\n` +
    rowsToCsv(INCOME_HEADERS, incomeRows) +
    "\r\n\r\n" +
    `รายจ่าย (ปี ${data.year})\r\n` +
    rowsToCsv(EXPENSE_HEADERS, expenseRows) +
    "\r\n"
  );
}

export function downloadFinanceExportCsv(data: FinanceExportData): void {
  const csv = buildFinanceExportCsv(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `รายรับรายจ่าย-${data.view === "team" ? "ทีม" : "รายคน"}-${data.year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
