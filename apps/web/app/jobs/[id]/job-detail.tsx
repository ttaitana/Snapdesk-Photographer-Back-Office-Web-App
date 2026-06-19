"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Search } from "lucide-react";

import type { ChecklistItem } from "@snapdesk/types";
import { getJobAction, updateJobAction } from "../actions";
import { useCustomerNames } from "../use-customer-names";
import { QuotationSection } from "./quotation-section";
import { StatusTimeline } from "./status-timeline";
import { FinancialSection } from "./financial-section";
import { RevenueSplitSection } from "./revenue-split-section";
import { DeliveryQrSection } from "./delivery-qr-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { buildMapsUrl } from "@/lib/maps";
import { JOB_STATUS_LABEL } from "@/lib/job-status";

/**
 * Job detail page (task #9, TASKS.md F1 bullets: shoot info display,
 * checklist add/remove/check, location + Google Maps deep link). Status
 * changes ("timeline สถานะงาน") are a separate P4/F3 task — this page only
 * displays the current status badge, same as the list page.
 */
export function JobDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [newItemText, setNewItemText] = useState("");

  const jobQuery = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJobAction(id),
  });

  const { customerNameById } = useCustomerNames();

  const job = jobQuery.data;

  const checklistMutation = useMutation({
    mutationFn: (checklist: ChecklistItem[]) => {
      if (!job) throw new Error("job not loaded");
      return updateJobAction({ id: job.id, teamId: job.teamId, checklist });
    },
    onSuccess: (updated) => {
      if (updated) queryClient.setQueryData(["job", id], updated);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  function saveChecklist(next: ChecklistItem[]) {
    checklistMutation.mutate(next);
  }

  function handleAddItem() {
    const text = newItemText.trim();
    if (!text || !job) return;
    const next = [...(job.checklist ?? []), { id: crypto.randomUUID(), item: text, done: false }];
    saveChecklist(next);
    setNewItemText("");
  }

  function handleToggleItem(itemId: string) {
    if (!job?.checklist) return;
    const next = job.checklist.map((entry) =>
      entry.id === itemId ? { ...entry, done: !entry.done } : entry,
    );
    saveChecklist(next);
  }

  function handleRemoveItem(itemId: string) {
    if (!job?.checklist) return;
    saveChecklist(job.checklist.filter((entry) => entry.id !== itemId));
  }

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
        <BackLink />
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

  const mapsUrl = buildMapsUrl(job);
  const checklist = job.checklist ?? [];

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-heading text-2xl uppercase text-ink">{job.title}</h2>
            <p className="text-sm text-muted-foreground">
              {customerNameById.get(job.customerId) ?? "ไม่พบชื่อลูกค้า"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-ink px-3 py-1 text-xs font-medium text-ink">
              {JOB_STATUS_LABEL[job.status]}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href={`/jobs/${job.id}/edit`}>แก้ไข</Link>
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">ถ่ายอะไร/แบบไหน</dt>
            <dd className="text-ink">{job.shootType || "ยังไม่ระบุ"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">วันเวลาถ่าย</dt>
            <dd className="text-ink">
              {job.shootDate
                ? `${job.shootDate.toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}${job.shootTime ? ` · ${job.shootTime} น.` : ""}`
                : "ยังไม่กำหนดวันถ่าย"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">รายละเอียดเพิ่มเติม</dt>
            <dd className="whitespace-pre-wrap text-ink">{job.description || "ไม่มี"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ราคารวม</dt>
            <dd className="font-heading text-lg text-ink">฿{formatCurrency(job.totalPrice)}</dd>
          </div>
        </dl>

        <div className="space-y-2 border-t border-ink/20 pt-4">
          <p className="text-sm text-muted-foreground">สถานที่ถ่าย</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink">{job.locationName || "ยังไม่ได้เพิ่มสถานที่"}</p>
            {mapsUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <MapPin className="mr-1.5 h-4 w-4" />
                  เปิด Google Maps
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <StatusTimeline job={job} />

      <QuotationSection job={job} customerName={customerNameById.get(job.customerId) ?? "ไม่พบชื่อลูกค้า"} />

      <FinancialSection job={job} />

      <RevenueSplitSection job={job} />

      <DeliveryQrSection job={job} />

      <div className="panel space-y-3 p-5">
        <h3 className="font-heading text-lg uppercase text-ink">checklist อุปกรณ์</h3>

        {checklist.length > 0 ? (
          <ul className="space-y-2">
            {checklist.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={entry.done}
                  onChange={() => handleToggleItem(entry.id)}
                  className="h-4 w-4 shrink-0 rounded border-2 border-ink accent-primary"
                />
                <span className={`flex-1 text-sm ${entry.done ? "text-muted-foreground line-through" : "text-ink"}`}>
                  {entry.item}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(entry.id)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  ลบ
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีรายการอุปกรณ์</p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddItem();
          }}
          className="flex items-center gap-2 pt-2"
        >
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="เพิ่มรายการอุปกรณ์ เช่น กล้อง, เลนส์, ไฟ"
            className="h-9"
          />
          <Button type="submit" size="sm" variant="primary" disabled={!newItemText.trim()}>
            เพิ่ม
          </Button>
        </form>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink">
      <ArrowLeft className="h-4 w-4" />
      กลับไปที่คิวถ่าย
    </Link>
  );
}
