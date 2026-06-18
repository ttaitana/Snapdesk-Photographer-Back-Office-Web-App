"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { Customer } from "@snapdesk/types";
import { createCustomerAction, updateCustomerAction } from "./actions";
import { useActiveOrganization } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormValues = {
  name: string;
  phone: string;
  email: string;
  lineId: string;
  instagram: string;
  channel: string;
  note: string;
};

const EMPTY_VALUES: FormValues = {
  name: "",
  phone: "",
  email: "",
  lineId: "",
  instagram: "",
  channel: "",
  note: "",
};

function valuesFromCustomer(customer: Customer): FormValues {
  return {
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    lineId: customer.lineId ?? "",
    instagram: customer.instagram ?? "",
    channel: customer.channel ?? "",
    note: customer.note ?? "",
  };
}

/**
 * Shared create/edit form for /customers/new and /customers/[id]/edit (task
 * #12, TASKS.md F5: "form เพิ่ม/แก้ลูกค้า (เบอร์/อีเมล/Line/IG/ช่องทางหลัก/
 * โน้ต)"). No auto-save draft here — that bullet was specific to the job
 * form (F1), not this one.
 *
 * `channel` (ช่องทางหลัก) is free text rather than a fixed enum, same
 * reasoning as customers-list.tsx's channel filter: there's no DB-level enum
 * to pick from, so a plain text input (with a placeholder suggesting
 * "โทร/Line/IG") is what's offered instead of a `<select>`.
 *
 * teamId resolution mirrors job-form.tsx: edit mode reuses the
 * already-fetched customer.teamId, create mode reads the active team from
 * Better Auth's useActiveOrganization().
 */
export function CustomerForm({ mode, customer }: { mode: "create" | "edit"; customer?: Customer }) {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>(() =>
    customer ? valuesFromCustomer(customer) : EMPTY_VALUES,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: activeOrganization } = useActiveOrganization();

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.name.trim()) {
      setError("กรุณากรอกชื่อลูกค้า");
      return;
    }

    const teamId = mode === "edit" ? customer!.teamId : activeOrganization?.id;
    if (!teamId) {
      setError("ไม่พบทีมที่ใช้งานอยู่ ลองรีเฟรชหน้านี้");
      return;
    }

    const payload = {
      teamId,
      name: values.name.trim(),
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
      lineId: values.lineId.trim() || undefined,
      instagram: values.instagram.trim() || undefined,
      channel: values.channel.trim() || undefined,
      note: values.note.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await createCustomerAction(payload)
          : await updateCustomerAction({ id: customer!.id, ...payload });

      if (!result) {
        setError("บันทึกไม่สำเร็จ ลองอีกครั้ง");
        return;
      }

      router.push(`/customers/${result.id}`);
      router.refresh();
    } catch {
      setError("บันทึกไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">ชื่อลูกค้า</Label>
          <Input id="name" value={values.name} onChange={(e) => update("name", e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">เบอร์โทร</Label>
          <Input id="phone" value={values.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">อีเมล</Label>
          <Input id="email" type="email" value={values.email} onChange={(e) => update("email", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lineId">Line ID</Label>
          <Input id="lineId" value={values.lineId} onChange={(e) => update("lineId", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="instagram">IG</Label>
          <Input
            id="instagram"
            value={values.instagram}
            onChange={(e) => update("instagram", e.target.value)}
            placeholder="ไม่ต้องใส่ @"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="channel">ช่องทางหลัก</Label>
          <Input
            id="channel"
            value={values.channel}
            onChange={(e) => update("channel", e.target.value)}
            placeholder="เช่น โทร, Line, IG"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="note">โน้ต</Label>
          <textarea
            id="note"
            rows={3}
            value={values.note}
            onChange={(e) => update("note", e.target.value)}
            className="w-full rounded-md border-2 border-ink bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : mode === "create" ? "เพิ่มลูกค้า" : "บันทึกการเปลี่ยนแปลง"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}
