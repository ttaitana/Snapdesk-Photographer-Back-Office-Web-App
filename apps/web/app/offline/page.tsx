"use client";

// /offline — P10 PWA fallback (TASKS.md: "ดูคิววันนี้แบบ offline").
//
// sw.js serves this page when a navigation fails outright (no network). It
// then fetches /api/jobs/today itself — that request is intercepted by the
// same service worker's stale-while-revalidate handler, so it resolves from
// cache even though we're offline. No team-context/session plumbing needed
// here: the API route already scoped the data before it was cached.

import { useEffect, useState } from "react";
import { WifiOff, Camera } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { JOB_STATUS_LABEL } from "@/lib/job-status";
import { formatCurrency } from "@/lib/utils";

type TodayJob = {
  id: string;
  title: string;
  shootTime: string | null;
  status: keyof typeof JOB_STATUS_LABEL;
  totalPrice: number;
};

export default function OfflinePage() {
  const [jobs, setJobs] = useState<TodayJob[] | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/jobs/today")
      .then((res) => {
        if (!res.ok) throw new Error("not cached");
        return res.json();
      })
      .then((data) => {
        setJobs(data.jobs ?? []);
        setCachedAt(data.cachedAt ?? null);
      })
      .catch(() => setFailed(true));
  }, []);

  return (
    <main className="relative min-h-screen bg-bg p-6 md:p-10">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-lg space-y-6">
        <div className="panel flex items-center gap-3 p-4">
          <WifiOff className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-heading text-sm uppercase text-ink">ออฟไลน์อยู่</p>
            <p className="text-xs text-muted-foreground">
              {cachedAt
                ? `แสดงคิวถ่ายวันนี้ที่บันทึกไว้ล่าสุด (${new Date(cachedAt).toLocaleTimeString("th-TH")})`
                : "กำลังโหลดข้อมูลที่บันทึกไว้ล่าสุด..."}
            </p>
          </div>
        </div>

        <div className="panel space-y-3 p-5">
          <h1 className="font-heading text-lg uppercase text-ink">คิวถ่ายวันนี้</h1>

          {jobs === null && !failed ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : failed || jobs?.length === 0 ? (
            <EmptyState
              icon={Camera}
              title="ไม่มีข้อมูลที่บันทึกไว้"
              description="เชื่อมต่ออินเทอร์เน็ตแล้วเปิดหน้า Dashboard อีกครั้งเพื่อบันทึกคิวถ่ายวันนี้ไว้ใช้แบบออฟไลน์"
            />
          ) : (
            <ul className="space-y-2">
              {jobs?.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-ink/20 p-3 text-sm"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-medium text-ink">{job.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {job.shootTime ? `${job.shootTime} น. · ` : ""}
                      {JOB_STATUS_LABEL[job.status]}
                    </p>
                  </div>
                  <span className="shrink-0 font-heading text-ink">฿{formatCurrency(job.totalPrice)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          การแก้ไขข้อมูล ใบเสนอราคา และการเงินต้องใช้อินเทอร์เน็ต
        </p>
      </div>
    </main>
  );
}
