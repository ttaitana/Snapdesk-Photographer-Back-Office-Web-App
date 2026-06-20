import { Skeleton } from "@/components/ui/skeleton";

// Root-level fallback (task #6, TASKS.md) — catches any top-level navigation
// without a closer loading.tsx of its own: "/", (auth)/* (login/register/
// logout), /invite/[id], /offline. Generic on purpose since this group has
// no shared chrome like AppShell to mirror (landing page vs. centered auth
// card vs. invite page all look different).
export default function RootLoading() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-sm space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-10 w-full" />
      </div>
    </main>
  );
}
