"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";

import { getPackageAction } from "../../actions";
import { PackageForm } from "../../package-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Client wrapper for /packages/[id]/edit (task #8) — same shape as
 * customer-edit-client.tsx.
 */
export function PackageEditClient({ id }: { id: string }) {
  const packageQuery = useQuery({
    queryKey: ["package", id],
    queryFn: () => getPackageAction(id),
  });

  const pkg = packageQuery.data;

  if (packageQuery.isLoading) {
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

  if (packageQuery.isError || !pkg) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={Search}
          title="ไม่พบแพ็กเกจนี้"
          description="แพ็กเกจนี้อาจถูกลบ หรือไม่อยู่ในทีมของคุณ"
          action={
            <Button asChild variant="primary">
              <Link href="/packages">กลับไปที่แพ็กเกจ</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="panel space-y-4 p-5">
        <h2 className="font-heading text-2xl uppercase text-ink">แก้ไขแพ็กเกจ</h2>
        <PackageForm mode="edit" pkg={pkg} />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/packages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink">
      <ArrowLeft className="h-4 w-4" />
      กลับไปที่แพ็กเกจ
    </Link>
  );
}
