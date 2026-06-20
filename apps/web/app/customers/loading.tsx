import { SectionLoadingSkeleton } from "@/components/section-loading-skeleton";

// Shown while customers/layout.tsx resolves session + team context on
// navigation (task #6, TASKS.md).
export default function CustomersLoading() {
  return <SectionLoadingSkeleton />;
}
