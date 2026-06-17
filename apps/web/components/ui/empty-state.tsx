import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Generic "nothing here yet" placeholder — P2 (TASKS.md: "skeleton loading +
 * empty states"). P3+ pages (job list, customer list, quotation list, etc.)
 * drop this in with page-specific copy/icon/action rather than each building
 * their own empty-state markup.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "panel flex flex-col items-center gap-2 px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-secondary">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : null}
      <p className="font-heading text-lg text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
