"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import type { Job } from "@snapdesk/types";
import { createJobAction, updateJobAction } from "./actions";
import { listCustomersAction } from "@/app/customers/actions";
import { useActiveOrganization } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { draftKeyFor, saveDraft, loadDraft, clearDraft } from "@/lib/job-draft";

type FormValues = {
  customerId: string;
  title: string;
  shootType: string;
  shootDate: string;
  shootTime: string;
  locationName: string;
  locationLat: string;
  locationLng: string;
  locationUrl: string;
  description: string;
  totalPrice: string;
};

const EMPTY_VALUES: FormValues = {
  customerId: "",
  title: "",
  shootType: "",
  shootDate: "",
  shootTime: "",
  locationName: "",
  locationLat: "",
  locationLng: "",
  locationUrl: "",
  description: "",
  totalPrice: "0",
};

function valuesFromJob(job: Job): FormValues {
  return {
    customerId: job.customerId,
    title: job.title,
    shootType: job.shootType ?? "",
    shootDate: job.shootDate ? job.shootDate.toISOString().slice(0, 10) : "",
    shootTime: job.shootTime ?? "",
    locationName: job.locationName ?? "",
    locationLat: job.locationLat != null ? String(job.locationLat) : "",
    locationLng: job.locationLng != null ? String(job.locationLng) : "",
    locationUrl: job.locationUrl ?? "",
    description: job.description ?? "",
    totalPrice: String(job.totalPrice),
  };
}

/**
 * Shared create/edit form for /jobs/new and /jobs/[id]/edit (task #10).
 * Checklist editing already lives on the detail page (task #9) — kept off
 * this form rather than duplicated. Auto-saves a draft to localStorage on
 * every change (debounced), restored on mount if present, cleared after a
 * successful submit — see lib/job-draft.ts.
 *
 * teamId source differs by mode: edit reuses the already-fetched job.teamId
 * (same workaround as the detail page's updateJobAction calls — there's no
 * client team-context hook), while create has no job yet so it reads the
 * active team from Better Auth's useActiveOrganization().
 */
export function JobForm({ mode, job }: { mode: "create" | "edit"; job?: Job }) {
  const router = useRouter();
  const draftKey = draftKeyFor(mode, job?.id);

  const [values, setValues] = useState<FormValues>(() => {
    const draft = loadDraft<FormValues>(draftKey);
    return draft ?? (job ? valuesFromJob(job) : EMPTY_VALUES);
  });
  const [restoredDraft] = useState(() => loadDraft<FormValues>(draftKey) !== null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isFirstRender = useRef(true);

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomersAction(),
  });

  const { data: activeOrganization } = useActiveOrganization();

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(() => saveDraft(draftKey, values), 400);
    return () => clearTimeout(timeout);
  }, [values, draftKey]);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function discardDraft() {
    clearDraft(draftKey);
    setValues(job ? valuesFromJob(job) : EMPTY_VALUES);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.customerId) {
      setError("กรุณาเลือกลูกค้า");
      return;
    }
    if (!values.title.trim()) {
      setError("กรุณากรอกชื่องาน");
      return;
    }

    const teamId = mode === "edit" ? job!.teamId : activeOrganization?.id;
    if (!teamId) {
      setError("ไม่พบทีมที่ใช้งานอยู่ ลองรีเฟรชหน้านี้");
      return;
    }

    const payload = {
      teamId,
      customerId: values.customerId,
      title: values.title.trim(),
      shootType: values.shootType.trim() || undefined,
      shootDate: values.shootDate ? new Date(values.shootDate) : undefined,
      shootTime: values.shootTime.trim() || undefined,
      locationName: values.locationName.trim() || undefined,
      locationLat: values.locationLat.trim() !== "" ? Number(values.locationLat) : undefined,
      locationLng: values.locationLng.trim() !== "" ? Number(values.locationLng) : undefined,
      locationUrl: values.locationUrl.trim() || undefined,
      description: values.description.trim() || undefined,
      totalPrice: values.totalPrice.trim() !== "" ? Number(values.totalPrice) : 0,
    };

    setSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await createJobAction(payload)
          : await updateJobAction({ id: job!.id, ...payload });

      if (!result) {
        setError("บันทึกไม่สำเร็จ ลองอีกครั้ง");
        return;
      }

      clearDraft(draftKey);
      router.push(`/jobs/${result.id}`);
      router.refresh();
    } catch {
      setError("บันทึกไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {restoredDraft ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-ink/30 bg-secondary px-3 py-2 text-sm text-ink">
          <span>กู้คืนข้อมูลที่กรอกไว้ล่าสุด</span>
          <button type="button" onClick={discardDraft} className="shrink-0 text-xs underline">
            ล้างข้อมูลร่าง
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="customerId">ลูกค้า</Label>
          <select
            id="customerId"
            value={values.customerId}
            onChange={(e) => update("customerId", e.target.value)}
            className="h-10 w-full rounded-md border-2 border-ink bg-background px-3 text-sm"
          >
            <option value="">เลือกลูกค้า</option>
            {(customersQuery.data ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">ชื่องาน</Label>
          <Input id="title" value={values.title} onChange={(e) => update("title", e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="shootType">ถ่ายอะไร/แบบไหน</Label>
          <Input id="shootType" value={values.shootType} onChange={(e) => update("shootType", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="totalPrice">ราคารวม (บาท)</Label>
          <Input
            id="totalPrice"
            type="number"
            min="0"
            step="0.01"
            value={values.totalPrice}
            onChange={(e) => update("totalPrice", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="shootDate">วันที่ถ่าย</Label>
          <Input id="shootDate" type="date" value={values.shootDate} onChange={(e) => update("shootDate", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="shootTime">เวลาถ่าย</Label>
          <Input id="shootTime" type="time" value={values.shootTime} onChange={(e) => update("shootTime", e.target.value)} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="locationName">ชื่อสถานที่</Label>
          <Input id="locationName" value={values.locationName} onChange={(e) => update("locationName", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="locationLat">พิกัด Latitude</Label>
          <Input
            id="locationLat"
            type="number"
            step="any"
            value={values.locationLat}
            onChange={(e) => update("locationLat", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="locationLng">พิกัด Longitude</Label>
          <Input
            id="locationLng"
            type="number"
            step="any"
            value={values.locationLng}
            onChange={(e) => update("locationLng", e.target.value)}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="locationUrl">ลิงก์ Google Maps (ถ้าไม่มีพิกัด)</Label>
          <Input
            id="locationUrl"
            type="url"
            placeholder="https://maps.google.com/..."
            value={values.locationUrl}
            onChange={(e) => update("locationUrl", e.target.value)}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">รายละเอียดเพิ่มเติม</Label>
          <textarea
            id="description"
            rows={3}
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full rounded-md border-2 border-ink bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : mode === "create" ? "สร้างคิวถ่าย" : "บันทึกการเปลี่ยนแปลง"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}
