// PDF layout for the tax summary export (P6 F7 "Export": "export สรุปภาษี
// (PDF/Excel) เลือกระดับทีม/รายคน", TASKS.md task #22). Kept in its own file,
// same precedent as ../../jobs/[id]/quotation-pdf.tsx, so the triggering
// button can `await import("@react-pdf/renderer")` + `await
// import("./tax-summary-pdf")` without dragging the whole tax settings page
// along.
//
// Reuses the same "Sarabun" Thai font registration pattern as
// quotation-pdf.tsx (default PDF fonts have no Thai glyphs).
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

import type { TaxExportSummary } from "@snapdesk/core";
import { TAX_ESTIMATE_DISCLAIMER } from "@snapdesk/types";

let fontsRegistered = false;
function ensureFontsRegistered() {
  if (fontsRegistered) return;
  Font.register({
    family: "Sarabun",
    fonts: [
      { src: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Regular.ttf", fontWeight: "normal" },
      { src: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Bold.ttf", fontWeight: "bold" },
    ],
  });
  fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Sarabun", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  shopName: { fontSize: 16, fontWeight: "bold" },
  metaLine: { fontSize: 9, color: "#555", marginTop: 2 },
  docTitle: { fontSize: 18, fontWeight: "bold", textAlign: "right" },
  docMeta: { fontSize: 9, color: "#555", textAlign: "right", marginTop: 2 },
  disclaimer: {
    fontSize: 8,
    color: "#7a5200",
    backgroundColor: "#fff6e0",
    padding: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e0c068",
  },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginTop: 12, marginBottom: 6 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  label: { color: "#555" },
  value: { fontWeight: "bold" },
  table: { marginTop: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 4,
    marginBottom: 2,
  },
  tableRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
  colName: { flex: 2 },
  colNum: { flex: 1.2, textAlign: "right" },
  th: { fontWeight: "bold", fontSize: 9, color: "#555" },
  footer: { marginTop: 18, fontSize: 8, color: "#888" },
});

function formatBaht(amount: number) {
  return amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type TaxSummaryPdfProps = {
  shopName: string;
  businessName?: string | null;
  taxId?: string | null;
  summary: TaxExportSummary;
  issuedAtLabel: string;
};

export function TaxSummaryDocument({ shopName, businessName, taxId, summary, issuedAtLabel }: TaxSummaryPdfProps) {
  ensureFontsRegistered();

  const { year, scope, vatStatus, members } = summary;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.shopName}>{businessName || shopName}</Text>
            {taxId ? <Text style={styles.metaLine}>เลขประจำตัวผู้เสียภาษี: {taxId}</Text> : null}
          </View>
          <View>
            <Text style={styles.docTitle}>สรุปภาษี ปี {year}</Text>
            <Text style={styles.docMeta}>ระดับ: {scope === "team" ? "ทั้งทีม" : "รายบุคคล"}</Text>
            <Text style={styles.docMeta}>วันที่ออก: {issuedAtLabel}</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>{TAX_ESTIMATE_DISCLAIMER}</Text>

        <Text style={styles.sectionTitle}>สถานะ VAT ของทีม</Text>
        <View style={styles.row}>
          <Text style={styles.label}>รายรับสะสมปีนี้</Text>
          <Text style={styles.value}>{formatBaht(vatStatus.revenue)} บาท</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>เกณฑ์จดทะเบียน VAT</Text>
          <Text style={styles.value}>{formatBaht(vatStatus.threshold)} บาท</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>คงเหลือก่อนถึงเกณฑ์</Text>
          <Text style={styles.value}>{formatBaht(vatStatus.remaining)} บาท</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>จดทะเบียน VAT แล้ว</Text>
          <Text style={styles.value}>{vatStatus.vatRegistered ? `ใช่ (${vatStatus.vatRate}%)` : "ยังไม่จด"}</Text>
        </View>
        {vatStatus.exceeded ? (
          <Text style={{ fontSize: 9, color: "#b91c1c", marginTop: 4 }}>เกินเกณฑ์ 1.8 ล้านบาทแล้ว — ควรพิจารณาจดทะเบียน VAT</Text>
        ) : vatStatus.approaching ? (
          <Text style={{ fontSize: 9, color: "#b45309", marginTop: 4 }}>ใกล้ถึงเกณฑ์ 1.8 ล้านบาท</Text>
        ) : null}

        <Text style={styles.sectionTitle}>ประมาณการภาษีปลายปีรายบุคคล</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colName, styles.th]}>ชื่อ</Text>
            <Text style={[styles.colNum, styles.th]}>เงินได้รวม</Text>
            <Text style={[styles.colNum, styles.th]}>หักค่าใช้จ่าย</Text>
            <Text style={[styles.colNum, styles.th]}>เงินได้สุทธิ</Text>
            <Text style={[styles.colNum, styles.th]}>ภาษีที่คำนวณ</Text>
            <Text style={[styles.colNum, styles.th]}>WHT เครดิต</Text>
            <Text style={[styles.colNum, styles.th]}>คงเหลือ/คืน</Text>
          </View>
          {members.map((m) => (
            <View key={m.userId} style={styles.tableRow}>
              <Text style={styles.colName}>{m.name}</Text>
              <Text style={styles.colNum}>{formatBaht(m.estimate.grossIncome)}</Text>
              <Text style={styles.colNum}>{formatBaht(m.estimate.expenseDeduction)}</Text>
              <Text style={styles.colNum}>{formatBaht(m.estimate.netIncome)}</Text>
              <Text style={styles.colNum}>{formatBaht(m.estimate.taxOwed)}</Text>
              <Text style={styles.colNum}>{formatBaht(m.estimate.whtCredited)}</Text>
              <Text style={styles.colNum}>{formatBaht(m.estimate.balance)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          ตัวเลขทั้งหมดเป็นประมาณการเพื่อการวางแผนเท่านั้น ไม่ใช่การคำนวณภาษีที่ใช้ยื่นจริง — ออกโดย {businessName || shopName}
        </Text>
      </Page>
    </Document>
  );
}
