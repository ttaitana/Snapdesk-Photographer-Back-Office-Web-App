import { SectionLoadingSkeleton } from "@/components/section-loading-skeleton";

// Shown while dashboard/layout.tsx resolves session + team context on
// navigation (task #6, TASKS.md). See that component for why it mirrors
// AppShell's frame instead of a bare spinner.
export default function DashboardLoading() {
  return <SectionLoadingSkeleton />;
}
