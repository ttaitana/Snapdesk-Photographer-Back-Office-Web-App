"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package as PackageIcon, Pencil, Trash2 } from "lucide-react";

import { listPackagesAction, deletePackageAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";

/**
 * List view for /packages (task #8, TASKS.md F2: "Prisma model Package +
 * CRUD แพ็กเกจ"). No detail page in scope — rows expose edit/delete
 * directly, same as the quotation builder will later just read this list
 * to populate the package picker.
 */
export function PackageList() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const packagesQuery = useQuery({
    queryKey: ["packages"],
    queryFn: () => listPackagesAction(),
  });

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`ลบแพ็กเกจ "${name}" ใช่หรือไม่?`)) return;
    setDeletingId(id);
    try {
      await deletePackageAction(id);
      await queryClient.invalidateQueries({ queryKey: ["packages"] });
    } finally {
      setDeletingId(null);
    }
  }

  const packages = packagesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl uppercase text-ink">แพ็กเกจ</h2>
        <Button asChild variant="primary" size="sm">
          <Link href="/packages/new">+ เพิ่มแพ็กเกจ</Link>
        </Button>
      </div>

      {packagesQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel flex items-center justify-between gap-3 p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : packagesQuery.isError ? (
        <p className="text-sm text-destructive">โหลดข้อมูลแพ็กเกจไม่สำเร็จ ลองรีเฟรชหน้านี้</p>
      ) : packages.length > 0 ? (
        <ul className="space-y-3">
          {packages.map((pkg) => (
            <li key={pkg.id} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-ink">{pkg.name}</p>
                  <span className="shrink-0 text-sm font-medium text-ink">{formatCurrency(pkg.price)}</span>
                </div>
                {pkg.description ? (
                  <p className="truncate text-sm text-muted-foreground">{pkg.description}</p>
                ) : null}
                {pkg.items && pkg.items.length > 0 ? (
                  <p className="truncate text-xs text-muted-foreground">{pkg.items.join(" · ")}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/packages/${pkg.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    แก้ไข
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deletingId === pkg.id}
                  onClick={() => handleDelete(pkg.id, pkg.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={PackageIcon}
          title="ยังไม่มีแพ็กเกจ"
          description="เพิ่มแพ็กเกจที่ใช้บ่อยไว้เลือกตอนสร้างใบเสนอราคา"
          action={
            <Button asChild variant="primary">
              <Link href="/packages/new">+ เพิ่มแพ็กเกจ</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
