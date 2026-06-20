import { SectionLoadingSkeleton } from "@/components/section-loading-skeleton";

// Shown while packages/layout.tsx resolves session + team context on
// navigation (task #6, TASKS.md).
export default function PackagesLoading() {
  return <SectionLoadingSkeleton />;
}
