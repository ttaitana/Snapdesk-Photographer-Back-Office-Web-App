"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { getTeamOutstandingSummaryAction } from "./payments-actions";
import { useCustomerNames } from "./use-customer-names";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

/**
 * P4 F3 — "สรุปยอดค้างรวมทุกงาน". Sits at the top of the /jobs list so the
 * photographer sees total receivables at a glance, with a breakdown of which
 * jobs still owe money (only outstanding > 0 jobs — see
 * getTeamOutstandingSummary in packages/core/src/payments).
 */
export function OutstandingSummaryPanel() {
  const summaryQuery = useQuery({
    queryKey: ["team-outstanding-summary"],
    queryFn: () => getTeamOutstandingSummaryAction(),
  });
  const { customerNameById } = useCustomerNames();

  if (summaryQuery.isLoading) {
    return (
      <div className="panel space-y-2 p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-32" />
      </div>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) return null;

  const { totalOutstanding, jobs } = summaryQuery.data;

  if (jobs.length === 0) {
    return (
      <div className="panel flex items-center justify-between gap-3 p-4">
        <p className="text-sm text-muted-foreground">ยอดค้างรับรวมทุกงาน</p>
        <p className="font-heading text-xl text-success">฿0</p>
      </div>
    );
  }

  return (
    <div className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">ยอดค้างรับรวมทุกงาน ({jobs.length} งาน)</p>
        <p className="font-heading text-xl text-danger">฿{formatCurrency(totalOutstanding)}</p>
      </div>
      <ul className="space-y-1.5 border-t border-ink/20 pt-3">
        {jobs.map((job) => (
          <li key={job.jobId}>
            <Link
              href={`/jobs/${job.jobId}`}
              className="flex items-center justify-between gap-3 text-sm hover:underline"
            >
              <span className="min-w-0 truncate text-ink">
                {job.title}
                <span className="ml-2 text-muted-foreground">
                  {customerNameById.get(job.customerId) ?? "ไม่พบชื่อลูกค้า"}
                </span>
              </span>
              <span className="shrink-0 font-medium text-danger">฿{formatCurrency(job.outstanding)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
