"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import type { Expense } from "@snapdesk/types";
import { SUGGESTED_EXPENSE_CATEGORIES } from "@snapdesk/types";
import { createExpenseAction, updateExpenseAction } from "./actions";
import { listJobsAction } from "@/app/jobs/actions";
import { useActiveOrganization } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormValues = {
  category: string;
  amount: string;
  spentAt: string;
  jobId: string;
  note: string;
  receiptUrl: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_VALUES: FormValues = {
  category: "",
  amount: "",
  spentAt: today(),
  jobId: "",
  note: "",
  receiptUrl: "",
};

function valuesFromExpense(expense: Expense): FormValues {
  return {
    category: expense.category,
    amount: String(expense.amount),
    spentAt: expense.spentAt.toISOString().slice(0, 10),
    jobId: expense.jobId ?? "",
    note: expense.note ?? "",
    receiptUrl: expense.receiptUrl ?? "",
  };
}

/**
 * Shared create/edit form for /finance/expenses/new and
 * /finance/expenses/[id]/edit (task #7, TASKS.md P6 F7: "บันทึกรายจ่าย +
 * แนบใบเสร็จ (URL)"). No detail page in scope — same precedent as
 * package-form.tsx.
 *
 * `category` is free text (expenseCategorySchema, @snapdesk/types) with
 * SUGGESTED_EXPENSE_CATEGORIES offered via a <datalist> rather than a
 * <select>, same reasoning as customer-form.tsx's `channel` field.
 *
 * `receiptUrl` is a plain URL input — no real file-upload infra exists
 * anywhere in this project yet (Team.logoUrl uses the same pattern), so
 * "attach a receipt" means pasting a link to wherever the photographer
 * already stored the photo/scan (e.g. Google Drive, Line).
 *
 * `jobId` is optional (Expense.jobId is nullable) and populated via
 * listJobsAction() — same useQuery-for-a-relational-<select> pattern as
 * job-form.tsx's customer picker.
 *
 * teamId resolution mirrors customer-form.tsx / package-form.tsx: edit mode
 * reuses the already-fetched expense.teamId, create mode reads the active
 * team from Better Auth's useActiveOrganization().
 */
export function ExpenseForm({ mode, expense }: { mode: "create" | "edit"; expense?: Expense }) {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>(() =>
    expense ? valuesFromExpense(expense) : EMPTY_VALUES,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: activeOrganization } = useActiveOrganization();

  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: () => listJobsAction(),
  });

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.category.trim()) {
      setError("กรุณากรอกหมวดรายจ่าย");
      return;
    }

    const amount = values.amount.trim() === "" ? NaN : Number(values.amount);
    if (Number.isNaN(amount) || amount < 0) {
      setError("จำนวนเงินต้องเป็นตัวเลขและไม่ติดลบ");
      return;
    }

    const teamId = mode === "edit" ? expense!.teamId : activeOrganization?.id;
    if (!teamId) {
      setError("ไม่พบทีมที่ใช้งานอยู่ ลองรีเฟรชหน้านี้");
      return;
    }

    const payload = {
      teamId,
      category: values.category.trim(),
      amount,
      jobId: values.jobId || undefined,
      spentAt: values.spentAt ? new Date(values.spentAt) : undefined,
      note: values.note.trim() || undefined,
      receiptUrl: values.receiptUrl.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await createExpenseAction(payload)
          : await updateExpenseAction({ id: expense!.id, ...payload });

      if (!result) {
        setError("บันทึกไม่สำเร็จ ลองอีกครั้ง");
        return;
      }

      router.push("/finance/expenses");
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
        <div className="space-y-1.5">
          <Label htmlFor="category">หมวดรายจ่าย</Label>
          <Input
            id="category"
            value={values.category}
            onChange={(e) => update("category", e.target.value)}
            list="category-suggestions"
            placeholder="เช่น เดินทาง, อุปกรณ์"
            required
          />
          <datalist id="category-suggestions">
            {SUGGESTED_EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount">จำนวนเงิน</Label>
          <Input
            id="amount"
            type="number"
            min={0}
            step="0.01"
            value={values.amount}
            onChange={(e) => update("amount", e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="spentAt">วันที่จ่าย</Label>
          <Input
            id="spentAt"
            type="date"
            value={values.spentAt}
            onChange={(e) => update("spentAt", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jobId">เชื่อมกับงาน (ถ้ามี)</Label>
          <select
            id="jobId"
            value={values.jobId}
            onChange={(e) => update("jobId", e.target.value)}
            className="h-10 w-full rounded-md border-2 border-ink bg-background px-3 text-sm"
          >
            <option value="">ไม่เชื่อมกับงาน</option>
            {(jobsQuery.data ?? []).map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="receiptUrl">ลิงก์ใบเสร็จ</Label>
          <Input
            id="receiptUrl"
            type="url"
            value={values.receiptUrl}
            onChange={(e) => update("receiptUrl", e.target.value)}
            placeholder="https://..."
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
          {submitting ? "กำลังบันทึก..." : mode === "create" ? "บันทึกรายจ่าย" : "บันทึกการเปลี่ยนแปลง"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}
