"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { Package } from "@snapdesk/types";
import { createPackageAction, updatePackageAction } from "./actions";
import { useActiveOrganization } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormValues = {
  name: string;
  price: string;
  description: string;
  items: string;
};

const EMPTY_VALUES: FormValues = {
  name: "",
  price: "",
  description: "",
  items: "",
};

function valuesFromPackage(pkg: Package): FormValues {
  return {
    name: pkg.name,
    price: String(pkg.price),
    description: pkg.description ?? "",
    items: (pkg.items ?? []).join("\n"),
  };
}

/**
 * Shared create/edit form for /packages/new and /packages/[id]/edit (task
 * #8, TASKS.md F2: "Prisma model Package + CRUD แพ็กเกจ"). `items` is the
 * list of line items shown on a quotation PDF/card (e.g. "ช่างภาพ 1 คน") —
 * edited as one item per line in a textarea and split on submit, same
 * reasoning as customer-form.tsx's plain-text `note` field: no dedicated
 * dynamic-row UI exists yet in this codebase, and a textarea is the
 * simplest faithful match for an unordered string list.
 *
 * teamId resolution mirrors customer-form.tsx: edit mode reuses the
 * already-fetched package.teamId, create mode reads the active team from
 * Better Auth's useActiveOrganization().
 */
export function PackageForm({ mode, pkg }: { mode: "create" | "edit"; pkg?: Package }) {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>(() =>
    pkg ? valuesFromPackage(pkg) : EMPTY_VALUES,
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
      setError("กรุณากรอกชื่อแพ็กเกจ");
      return;
    }

    const price = values.price.trim() === "" ? 0 : Number(values.price);
    if (Number.isNaN(price) || price < 0) {
      setError("ราคาต้องเป็นตัวเลขและไม่ติดลบ");
      return;
    }

    const teamId = mode === "edit" ? pkg!.teamId : activeOrganization?.id;
    if (!teamId) {
      setError("ไม่พบทีมที่ใช้งานอยู่ ลองรีเฟรชหน้านี้");
      return;
    }

    const items = values.items
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      teamId,
      name: values.name.trim(),
      price,
      description: values.description.trim() || undefined,
      items: items.length > 0 ? items : undefined,
    };

    setSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await createPackageAction(payload)
          : await updatePackageAction({ id: pkg!.id, ...payload });

      if (!result) {
        setError("บันทึกไม่สำเร็จ ลองอีกครั้ง");
        return;
      }

      router.push("/packages");
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
          <Label htmlFor="name">ชื่อแพ็กเกจ</Label>
          <Input id="name" value={values.name} onChange={(e) => update("name", e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="price">ราคา</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step="0.01"
            value={values.price}
            onChange={(e) => update("price", e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">รายละเอียด</Label>
          <textarea
            id="description"
            rows={2}
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full rounded-md border-2 border-ink bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="items">รายการที่รวมในแพ็กเกจ</Label>
          <textarea
            id="items"
            rows={4}
            value={values.items}
            onChange={(e) => update("items", e.target.value)}
            placeholder={"หนึ่งรายการต่อบรรทัด เช่น\nช่างภาพ 1 คน\nไฟล์ภาพดิจิทัล 50 รูป"}
            className="w-full rounded-md border-2 border-ink bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : mode === "create" ? "เพิ่มแพ็กเกจ" : "บันทึกการเปลี่ยนแปลง"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}
