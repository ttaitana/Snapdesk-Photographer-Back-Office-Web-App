import { SectionLoadingSkeleton } from "@/components/section-loading-skeleton";

// Shown while finance/layout.tsx resolves session + team context on
// navigation (task #6, TASKS.md). Covers /finance and /finance/expenses/*.
export default function FinanceLoading() {
  return <SectionLoadingSkeleton />;
}
