import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared Suspense fallback for every authed section's loading.tsx (task #6,
 * TASKS.md "error/loading/empty states ครบทุกหน้า"). Each section layout
 * (app/dashboard/layout.tsx, app/jobs/layout.tsx, ...) does an
 * await auth.api.getSession() + resolveTeamContext() DB round trip before
 * rendering AppShell — this is what Next shows during that gap on
 * navigation, so it mirrors AppShell's own header/sidebar/content frame
 * instead of a generic centered spinner, to avoid a layout jump when the
 * real page swaps in.
 */
export function SectionLoadingSkeleton() {
  return (
    <main className="relative min-h-screen bg-bg p-6 pb-24 md:p-10 md:pb-10">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <Skeleton className="h-9 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>

        <div className="flex gap-6">
          <div className="hidden w-48 shrink-0 space-y-2 md:block">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <Skeleton className="h-8 w-40" />
            <div className="panel space-y-3 p-5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="panel space-y-3 p-5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
