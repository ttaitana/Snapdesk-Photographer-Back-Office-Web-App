"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";

import { getCustomerAction } from "../../actions";
import { CustomerForm } from "../../customer-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Client wrapper for /customers/[id]/edit (task #12) — same shape as
 * job-edit-client.tsx. Shares the ["customer", id] query key with the detail
 * page so the cache is reused.
 */
export function CustomerEditClient({ id }: { id: string }) {
  const customerQuery = useQuery({
    queryKey: ["customer", id],
    queryFn: () => getCustomerAction(id),
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
        <BackLink id={id} />
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

  return (
    <div className="space-y-4">
      <BackLink id={id} />

      <div className="panel space-y-4 p-5">
        <h2 className="font-heading text-2xl uppercase text-ink">แก้ไขข้อมูลลูกค้า</h2>
        <CustomerForm mode="edit" customer={customer} />
      </div>
    </div>
  );
}

function BackLink({ id }: { id: string }) {
  return (
    <Link
      href={`/customers/${id}`}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" />
      กลับไปที่รายละเอียดลูกค้า
    </Link>
  );
}
