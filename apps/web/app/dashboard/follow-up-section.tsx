"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";

import { getFollowUpJobsAction } from "./actions";
import { useCustomerNames } from "@/app/jobs/use-customer-names";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

/** P5 F8 — "งานที่ต้องตามต่อ (ยังไม่ส่งงาน / ใบเสนอราคารอตอบ)". Data comes
 * from getFollowUpJobsAction (app/dashboard/actions.ts) — see
 * packages/core/src/dashboard for why CONFIRMED jobs are excluded (they're
 * already covered by ShootQueue). */
export function FollowUpSection() {
  const query = useQuery({
    queryKey: ["follow-up-jobs"],
    queryFn: () => getFollowUpJobsAction(),
  });
  const { customerNameById } = useCustomerNames();

  if (query.isLoading) {
    return (
      <div className="panel space-y-3 p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="panel p-5">
        <p className="text-sm text-destructive">โหลดงานที่ต้องตามต่อไม่สำเร็จ ลองรีเฟรชหน้านี้</p>
      </div>
    );
  }

  const { awaitingQuoteResponse, notDelivered } = query.data;
  const isEmpty = awaitingQuoteResponse.length === 0 && notDelivered.length === 0;

  return (
    <div className="panel space-y-4 p-5">
      <h3 className="font-heading text-lg uppercase text-ink">งานที่ต้องตามต่อ</h3>

      {isEmpty ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" /> ไม่มีงานที่ต้องตามต่อตอนนี้
        </p>
      ) : (
        <div className="space-y-4">
          <FollowUpGroup
            title={`ใบเสนอราคารอตอบ (${awaitingQuoteResponse.length})`}
            jobs={awaitingQuoteResponse}
            customerNameById={customerNameById}
          />
          <FollowUpGroup
            title={`ยังไม่ส่งงาน (${notDelivered.length})`}
            jobs={notDelivered}
            customerNameById={customerNameById}
          />
        </div>
      )}
    </div>
  );
}

function FollowUpGroup({
  title,
  jobs,
  customerNameById,
}: {
  title: string;
  jobs: { id: string; title: string; customerId: string; totalPrice: number }[];
  customerNameById: Map<string, string>;
}) {
  if (jobs.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-1.5">
        {jobs.map((job) => (
          <li key={job.id}>
            <Link
              href={`/jobs/${job.id}`}
              className="flex items-center justify-between gap-3 text-sm hover:underline"
            >
              <span className="min-w-0 truncate text-ink">
                {job.title}
                <span className="ml-2 text-muted-foreground">
                  {customerNameById.get(job.customerId) ?? "ไม่พบชื่อลูกค้า"}
                </span>
              </span>
              <span className="shrink-0 font-medium text-ink">฿{formatCurrency(job.totalPrice)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
