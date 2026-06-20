import { SectionLoadingSkeleton } from "@/components/section-loading-skeleton";

// Shown while team/layout.tsx resolves session + team context on navigation
// (task #6, TASKS.md). Covers /team, /team/members, /team/settings,
// /team/tax, /team/integrations.
export default function TeamLoading() {
  return <SectionLoadingSkeleton />;
}
