import { SectionLoadingSkeleton } from "@/components/section-loading-skeleton";

// Shown while jobs/layout.tsx resolves session + team context on navigation
// (task #6, TASKS.md). Covers /jobs, /jobs/new, /jobs/[id], /jobs/[id]/edit,
// /jobs/calendar — none of them define a closer loading.tsx of their own.
export default function JobsLoading() {
  return <SectionLoadingSkeleton />;
}
