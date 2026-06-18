"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";

import type { JobFilter, JobStatus } from "@snapdesk/types";
import { listJobsAction } from "./actions";
import { useCustomerNames } from "./use-customer-names";
import { JobsViewTabs } from "./jobs-view-tabs";
import { OutstandingSummaryPanel } from "./outstanding-summary-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { JOB_STATUS_LABEL, JOB_STATUS_ORDER } from "@/lib/job-status";

const RANGE_OPTIONS: { value: JobFilter["range"]; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "today", label: "วันนี้" },
  { value: "this_week", label: "สัปดาห์นี้" },
];

/** Client list view for /jobs (task #7). See use-customer-names.ts for why
 * customer names are joined client-side instead of in the listJobs query. */
export function JobsList() {
  const [range, setRange] = useState<JobFilter["range"]>("all");
  const [status, setStatus] = useState<JobStatus | "all">("all");

  const jobsQuery = useQuery({
    queryKey: ["jobs", range, status],
    queryFn: () => listJobsAction({ range, ...(status !== "all" && { status }) }),
  });

  const { customerNameById } = useCustomerNames();

  const isFiltered = range !== "all" || status !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl uppercase text-ink">คิวถ่าย</h2>
        <div className="flex items-center gap-2">
          <JobsViewTabs active="list" />
          <Button asChild variant="primary" size="sm">
            <Link href="/jobs/new">+ สร้างคิวถ่าย</Link>
          </Button>
        </div>
      </div>

      <OutstandingSummaryPanel />

      <div className="flex flex-wrap items-center gap-2">
        {RANGE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={range === option.value ? "primary" : "outline"}
            onClick={() => setRange(option.value)}
          >
            {option.label}
          </Button>
        ))}

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as JobStatus | "all")}
          className="h-9 rounded-md border-2 border-ink bg-background px-2 text-sm"
        >
          <option value="all">ทุกสถานะ</option>
          {JOB_STATUS_ORDER.map((value) => (
            <option key={value} value={value}>
              {JOB_STATUS_LABEL[value]}
            </option>
          ))}
        </select>
      </div>

      {jobsQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel flex items-center justify-between gap-3 p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      ) : jobsQuery.isError ? (
        <p className="text-sm text-destructive">โหลดข้อมูลคิวถ่ายไม่สำเร็จ ลองรีเฟรชหน้านี้</p>
      ) : jobsQuery.data && jobsQuery.data.length > 0 ? (
        <ul className="space-y-3">
          {jobsQuery.data.map((job) => (
            <li
              key={job.id}
              className="panel flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-ink">{job.title}</p>
                  <span className="shrink-0 rounded-full border border-ink px-2 py-0.5 text-xs font-medium text-ink">
                    {JOB_STATUS_LABEL[job.status]}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {customerNameById.get(job.customerId) ?? "ไม่พบชื่อลูกค้า"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {job.shootDate
                    ? `${job.shootDate.toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}${job.shootTime ? ` · ${job.shootTime} น.` : ""}`
                    : "ยังไม่กำหนดวันถ่าย"}
                </p>
              </div>
              <p className="shrink-0 font-heading text-lg text-ink">
                ฿{formatCurrency(job.totalPrice)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Camera}
          title="ยังไม่มีคิวถ่าย"
          description={isFiltered ? "ไม่พบงานที่ตรงกับตัวกรองนี้" : "เริ่มสร้างคิวถ่ายแรกของคุณ"}
          action={
            <Button asChild variant="primary">
              <Link href="/jobs/new">+ สร้างคิวถ่าย</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
