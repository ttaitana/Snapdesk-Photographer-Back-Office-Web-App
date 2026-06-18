// PDF layout for "ใบเสนอราคา" (P4 F2, TASKS.md: "export PDF (โลโก้/ชื่อร้าน/
// เลขผู้เสียภาษี/วันหมดอายุ) — @react-pdf/renderer"). Kept in its own file
// (rather than inline in quotation-section.tsx) so it can be imported with
// `await import("@react-pdf/renderer")`-style dynamic loading from the
// click handler without dragging the whole quotation UI along.
//
// Default fonts (Helvetica/Times/Courier) have no Thai glyphs, so this
// registers "Sarabun" — a Thai-government-standard, openly licensed Google
// Font — from a static TTF mirror. There is no static-weight Noto Sans Thai
// build left in the google/fonts repo (it moved to variable-only), so
// Sarabun is the safer pick for @react-pdf/renderer, which only loads
// static TTF/OTF.
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";

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
  page: { padding: 36, fontSize: 11, fontFamily: "Sarabun", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  logo: { width: 56, height: 56, objectFit: "contain" },
  shopName: { fontSize: 16, fontWeight: "bold" },
  metaLine: { fontSize: 9, color: "#555", marginTop: 2 },
  docTitle: { fontSize: 18, fontWeight: "bold", textAlign: "right" },
  docMeta: { fontSize: 9, color: "#555", textAlign: "right", marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginTop: 14, marginBottom: 6 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  label: { color: "#555" },
  value: { fontWeight: "bold" },
  itemRow: { flexDirection: "row", paddingVertical: 3 },
  itemBullet: { width: 14 },
  itemText: { flex: 1 },
  totalsBox: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#1a1a1a", paddingTop: 8 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  grandTotalLabel: { fontSize: 12, fontWeight: "bold" },
  grandTotalValue: { fontSize: 14, fontWeight: "bold" },
  footer: { marginTop: 24, fontSize: 9, color: "#777" },
});

function formatBaht(amount: number) {
  return `${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
}

export type QuotationPdfProps = {
  shopName: string;
  businessName?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
  customerName: string;
  jobTitle: string;
  shootType?: string | null;
  shootDateLabel?: string | null;
  items: string[];
  totalPrice: number;
  discount: number;
  netTotal: number;
  quotedDeposit: number;
  quoteExpiresAtLabel?: string | null;
  issuedAtLabel: string;
};

export function QuotationDocument(props: QuotationPdfProps) {
  ensureFontsRegistered();

  const {
    shopName,
    businessName,
    taxId,
    logoUrl,
    customerName,
    jobTitle,
    shootType,
    shootDateLabel,
    items,
    totalPrice,
    discount,
    netTotal,
    quotedDeposit,
    quoteExpiresAtLabel,
    issuedAtLabel,
  } = props;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            <View>
              <Text style={styles.shopName}>{businessName || shopName}</Text>
              {taxId ? <Text style={styles.metaLine}>เลขประจำตัวผู้เสียภาษี: {taxId}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>ใบเสนอราคา</Text>
            <Text style={styles.docMeta}>วันที่ออก: {issuedAtLabel}</Text>
            {quoteExpiresAtLabel ? <Text style={styles.docMeta}>ใช้ได้ถึง: {quoteExpiresAtLabel}</Text> : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>ข้อมูลลูกค้าและงาน</Text>
        <View style={styles.row}>
          <Text style={styles.label}>ลูกค้า</Text>
          <Text style={styles.value}>{customerName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>งาน</Text>
          <Text style={styles.value}>{jobTitle}</Text>
        </View>
        {shootType ? (
          <View style={styles.row}>
            <Text style={styles.label}>รูปแบบ</Text>
            <Text style={styles.value}>{shootType}</Text>
          </View>
        ) : null}
        {shootDateLabel ? (
          <View style={styles.row}>
            <Text style={styles.label}>วันที่ถ่าย</Text>
            <Text style={styles.value}>{shootDateLabel}</Text>
          </View>
        ) : null}

        {items.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>รายการในแพ็กเกจ</Text>
            {items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemBullet}>•</Text>
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.label}>ราคารวม</Text>
            <Text>{formatBaht(totalPrice)}</Text>
          </View>
          {discount > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.label}>ส่วนลด</Text>
              <Text>-{formatBaht(discount)}</Text>
            </View>
          ) : null}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>ยอดสุทธิ</Text>
            <Text style={styles.grandTotalValue}>{formatBaht(netTotal)}</Text>
          </View>
          {quotedDeposit > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.label}>มัดจำที่เสนอ</Text>
              <Text style={styles.value}>{formatBaht(quotedDeposit)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>
          ใบเสนอราคานี้ออกโดย {businessName || shopName}
          {quoteExpiresAtLabel ? ` และมีผลถึงวันที่ ${quoteExpiresAtLabel}` : ""}
        </Text>
      </Page>
    </Document>
  );
}
