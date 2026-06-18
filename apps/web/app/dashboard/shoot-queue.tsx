"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";

import type { JobFilter } from "@snapdesk/types";
import { listJobsAction } from "@/app/jobs/actions";
import { useCustomerNames } from "@/app/jobs/use-customer-names";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { JOB_STATUS_LABEL } from "@/lib/job-status";

const TABS: { value: Extract<JobFilter["range"], "today" | "this_week">; label: string }[] = [
  { value: "today", label: "วันนี้" },
  { value: "this_week", label: "สัปดาห์นี้" },
];

/** P5 F8 — "การ์ดคิวถ่ายวันนี้ / สัปดาห์นี้". Reuses listJobsAction's
 * existing range filter (no new core code needed — see jobs/index.ts's
 * dateRangeFor). */
export function ShootQueue() {
  const [range, setRange] = useState<(typeof TABS)[number]["value"]>("today");

  const jobsQuery = useQuery({
    queryKey: ["jobs", range],
    queryFn: () => listJobsAction({ range }),
  });
  const { customerNameById } = useCustomerNames();

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg uppercase text-ink">คิวถ่าย</h3>
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={range === tab.value ? "primary" : "outline"}
              onClick={() => setRange(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {jobsQuery.isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : jobsQuery.isError ? (
        <p className="text-sm text-destructive">โหลดคิวถ่ายไม่สำเร็จ ลองรีเฟรชหน้านี้</p>
      ) : jobsQuery.data && jobsQuery.data.length > 0 ? (
        <ul className="space-y-2">
          {jobsQuery.data.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-ink/20 p-3 text-sm hover:bg-secondary"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate font-medium text-ink">{job.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {customerNameById.get(job.customerId) ?? "ไม่พบชื่อลูกค้า"}
                    {job.shootTime ? ` · ${job.shootTime} น.` : ""}
                    {" · "}
                    {JOB_STATUS_LABEL[job.status]}
                  </p>
                </div>
                <span className="shrink-0 font-heading text-ink">฿{formatCurrency(job.totalPrice)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Camera}
          title={range === "today" ? "ไม่มีคิวถ่ายวันนี้" : "ไม่มีคิวถ่ายสัปดาห์นี้"}
        />
      )}
    </div>
  );
}
