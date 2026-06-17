import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Loading placeholder — P2 ("skeleton loading + empty states" in TASKS.md).
 * Plain pulsing block; compose into list-row/card shapes at the call site
 * (e.g. <Skeleton className="h-4 w-32" />) rather than building per-page
 * skeleton variants here.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-secondary border border-border", className)}
      {...props}
    />
  );
}

export { Skeleton };
