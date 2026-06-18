import { FinanceSummaryView } from "./finance-summary-view";

/**
 * P6 F7 — income/expense summary (task #8, TASKS.md: "สรุปตามช่วงเวลา
 * (เดือน/ไตรมาส/ปี)... 2 มุมมองสลับได้: ทีม/รายคน"). Session + team-context
 * checks already happened in app/finance/layout.tsx.
 */
export default function FinancePage() {
  return <FinanceSummaryView />;
}
