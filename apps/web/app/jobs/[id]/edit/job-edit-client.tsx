"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";

import { getJobAction } from "../../actions";
import { JobForm } from "../../job-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Client wrapper for /jobs/[id]/edit (task #10) — fetches the job via the
 * same ["job", id] query key used by the detail page so the cache is shared,
 * then renders the shared JobForm in edit mode. Loading/not-found states
 * mirror job-detail.tsx.
 */
export function JobEditClient({ id }: { id: string }) {
  const jobQuery = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJobAction(id),
  });

  const job = jobQuery.data;

  if (jobQuery.isLoading) {
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

  if (jobQuery.isError || !job) {
    return (
      <div className="space-y-4">
        <BackLink id={id} />
        <EmptyState
          icon={Search}
          title="ไม่พบงานนี้"
          description="งานนี้อาจถูกลบ หรือไม่อยู่ในทีมของคุณ"
          action={
            <Button asChild variant="primary">
              <Link href="/jobs">กลับไปที่คิวถ่าย</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackLink id={id} />

      <div className="panel space-y-4 p-5">
        <h2 className="font-heading text-2xl uppercase text-ink">แก้ไขคิวถ่าย</h2>
        <JobForm mode="edit" job={job} />
      </div>
    </div>
  );
}

function BackLink({ id }: { id: string }) {
  return (
    <Link
      href={`/jobs/${id}`}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" />
      กลับไปที่รายละเอียดงาน
    </Link>
  );
}
