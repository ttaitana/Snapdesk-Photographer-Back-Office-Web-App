"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, MessageCircle, Phone, Search } from "lucide-react";

import { getCustomerAction } from "../actions";
import { listJobsAction } from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { JOB_STATUS_LABEL } from "@/lib/job-status";

/**
 * Customer detail page (task #12, TASKS.md F5):
 *  - "ประวัติงานทั้งหมด + ยอดใช้จ่ายรวม" — full job history (listJobsAction
 *    filtered by customerId, see packages/types/job.ts's jobFilterSchema)
 *    and total spend (sum of each job's totalPrice — the total invoice value
 *    booked with this customer, not just amount paid so far; per-job
 *    paid/outstanding tracking is a separate P4/F3 concern).
 *  - "ปุ่มลัดติดต่อ (โทร/Line/IG)" — tel:/line.me/instagram.com links, each
 *    only shown if that field is set on the customer.
 *  - "สร้างงานใหม่จากหน้าลูกค้า" — links to /jobs/new?customerId=, which
 *    job-form.tsx reads to preselect the customer in create mode.
 */
export function CustomerDetail({ id }: { id: string }) {
  const customerQuery = useQuery({
    queryKey: ["customer", id],
    queryFn: () => getCustomerAction(id),
  });

  const jobsQuery = useQuery({
    queryKey: ["jobs", { customerId: id }],
    queryFn: () => listJobsAction({ customerId: id, range: "all" }),
    enabled: customerQuery.isSuccess && !!customerQuery.data,
  });

  const customer = customerQuery.data;

  if (customerQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="panel space-y-3 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (customerQuery.isError || !customer) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={Search}
          title="ไม่พบลูกค้านี้"
          description="ลูกค้ารายนี้อาจถูกลบ หรือไม่อยู่ในทีมของคุณ"
          action={
            <Button asChild variant="primary">
              <Link href="/customers">กลับไปที่ลูกค้า</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const jobs = jobsQuery.data ?? [];
  const totalSpend = jobs.reduce((sum, job) => sum + job.totalPrice, 0);

  const lineHref = customer.lineId ? `https://line.me/ti/p/~${encodeURIComponent(customer.lineId)}` : null;
  const igHref = customer.instagram
    ? `https://instagram.com/${encodeURIComponent(customer.instagram.replace(/^@/, ""))}`
    : null;

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-heading text-2xl uppercase text-ink">{customer.name}</h2>
            {customer.channel ? (
              <span className="inline-block rounded-full border border-ink px-2.5 py-0.5 text-xs font-medium text-ink">
                ช่องทางหลัก: {customer.channel}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/customers/${customer.id}/edit`}>แก้ไข</Link>
            </Button>
            <Button asChild size="sm" variant="primary">
              <Link href={`/jobs/new?customerId=${customer.id}`}>+ สร้างงานใหม่</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-ink/20 pt-4">
          {customer.phone ? (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${customer.phone}`}>
                <Phone className="mr-1.5 h-4 w-4" />
                โทร {customer.phone}
              </a>
            </Button>
          ) : null}
          {lineHref ? (
            <Button asChild size="sm" variant="outline">
              <a href={lineHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" />
                Line
              </a>
            </Button>
          ) : null}
          {igHref ? (
            <Button asChild size="sm" variant="outline">
              <a href={igHref} target="_blank" rel="noopener noreferrer">
                <Camera className="mr-1.5 h-4 w-4" />
                IG
              </a>
            </Button>
          ) : null}
          {!customer.phone && !lineHref && !igHref ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลติดต่อ</p>
          ) : null}
        </div>

        <dl className="grid grid-cols-1 gap-3 border-t border-ink/20 pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">อีเมล</dt>
            <dd className="text-ink">{customer.email || "ไม่มี"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">โน้ต</dt>
            <dd className="whitespace-pre-wrap text-ink">{customer.note || "ไม่มี"}</dd>
          </div>
        </dl>
      </div>

      <div className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-lg uppercase text-ink">ประวัติงานทั้งหมด</h3>
          <p className="text-sm text-muted-foreground">
            ยอดใช้จ่ายรวม{" "}
            <span className="font-heading text-base text-ink">฿{formatCurrency(totalSpend)}</span>
          </p>
        </div>

        {jobsQuery.isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex flex-col gap-1 rounded-md border border-ink/20 p-3 hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-medium text-ink">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.shootDate
                        ? job.shootDate.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
                        : "ยังไม่กำหนดวันถ่าย"}
                      {" · "}
                      {JOB_STATUS_LABEL[job.status]}
                    </p>
                  </div>
                  <p className="shrink-0 font-heading text-sm text-ink">฿{formatCurrency(job.totalPrice)}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">ลูกค้ารายนี้ยังไม่มีงาน</p>
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink">
      <ArrowLeft className="h-4 w-4" />
      กลับไปที่ลูกค้า
    </Link>
  );
}
