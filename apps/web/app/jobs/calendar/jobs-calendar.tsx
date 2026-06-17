"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import type { Job } from "@snapdesk/types";
import { listJobsAction } from "../actions";
import { useCustomerNames } from "../use-customer-names";
import { JobsViewTabs } from "../jobs-view-tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMonthGrid, toDateKey } from "@/lib/calendar";

const WEEKDAY_LABELS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const MAX_VISIBLE_PER_DAY = 3;

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Month calendar for /jobs/calendar (task #8). Reuses the same
 * listJobsAction({ range: "all" }) the list page would use for "ทั้งหมด"
 * (separate TanStack Query cache key, since this always wants the full set
 * regardless of the list page's filter state) and groups results by day
 * client-side with getMonthGrid/toDateKey — listJobs has no month-window
 * filter beyond today/this_week/all, and one team's job volume is small
 * enough that this is fine (same reasoning as the customer-name join, see
 * use-customer-names.ts).
 */
export function JobsCalendar() {
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));

  const jobsQuery = useQuery({
    queryKey: ["jobs", "all"],
    queryFn: () => listJobsAction({ range: "all" }),
  });

  const { customerNameById } = useCustomerNames();

  const jobsByDate = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobsQuery.data ?? []) {
      if (!job.shootDate) continue;
      const key = toDateKey(job.shootDate);
      const bucket = map.get(key);
      if (bucket) bucket.push(job);
      else map.set(key, [job]);
    }
    return map;
  }, [jobsQuery.data]);

  const days = useMemo(() => getMonthGrid(monthDate), [monthDate]);
  const todayKey = toDateKey(new Date());

  function goToMonth(offset: number) {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl uppercase text-ink">คิวถ่าย</h2>
        <JobsViewTabs active="calendar" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-heading text-lg text-ink">
          {monthDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => goToMonth(-1)}>
            ก่อนหน้า
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setMonthDate(startOfMonth(new Date()))}>
            วันนี้
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => goToMonth(1)}>
            ถัดไป
          </Button>
        </div>
      </div>

      {jobsQuery.isLoading ? (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : jobsQuery.isError ? (
        <p className="text-sm text-destructive">โหลดข้อมูลคิวถ่ายไม่สำเร็จ ลองรีเฟรชหน้านี้</p>
      ) : (
        <div className="overflow-hidden rounded-lg border-2 border-ink">
          <div className="grid grid-cols-7 border-b-2 border-ink bg-secondary">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = toDateKey(day);
              const dayJobs = jobsByDate.get(key) ?? [];
              const isCurrentMonth = day.getMonth() === monthDate.getMonth();
              const isToday = key === todayKey;

              return (
                <div
                  key={key}
                  className={`min-h-24 border-b border-r border-ink/20 p-1.5 last:border-r-0 ${
                    isCurrentMonth ? "bg-card" : "bg-muted/30"
                  }`}
                >
                  <span
                    className={
                      isToday
                        ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
                        : `text-xs ${isCurrentMonth ? "text-ink" : "text-muted-foreground"}`
                    }
                  >
                    {day.getDate()}
                  </span>

                  <div className="mt-1 space-y-0.5">
                    {dayJobs.slice(0, MAX_VISIBLE_PER_DAY).map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        title={`${job.title} — ${customerNameById.get(job.customerId) ?? ""}`}
                        className="block truncate rounded border border-ink/30 bg-secondary px-1 py-0.5 text-[11px] text-ink hover:bg-secondary/80"
                      >
                        {job.shootTime ? `${job.shootTime} ` : ""}
                        {job.title}
                      </Link>
                    ))}
                    {dayJobs.length > MAX_VISIBLE_PER_DAY ? (
                      <p className="text-[11px] text-muted-foreground">
                        +{dayJobs.length - MAX_VISIBLE_PER_DAY} เพิ่มเติม
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
