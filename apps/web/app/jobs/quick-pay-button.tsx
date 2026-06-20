"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { PaymentInput, TeamOutstandingJob } from "@snapdesk/types";
import { createPaymentAction } from "./payments-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

const PAYMENT_TYPE_LABEL: Record<PaymentInput["type"], string> = {
  DEPOSIT: "มัดจำ",
  BALANCE: "ยอดคงเหลือ",
  FULL: "เต็มจำนวน",
};

/**
 * P10 3-tap rule fix (TASKS.md, SPEC.md §3.5 rule #1). Before this, the only
 * way to "บันทึกรับเงิน" from the dashboard was: quick action → /jobs (tap
 * 1) → open a job (tap 2) → preset button opens the dialog in
 * financial-section.tsx (tap 3) → confirm (tap 4) — one over budget.
 *
 * This renders inline on each row of OutstandingSummaryPanel (dashboard +
 * /jobs), pre-filled to the job's full outstanding balance, so the flow is
 * tap "รับเงิน" (1, opens pre-filled) → tap "ยืนยันรับเงิน" (2). It calls the
 * same createPaymentAction mutation financial-section.tsx uses, so a payment
 * recorded here shows up identically in that job's history — this is a
 * second entry point to the same data, not a parallel path.
 */
export function QuickPayButton({ job }: { job: TeamOutstandingJob }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(() => String(job.outstanding));
  const [type, setType] = useState<PaymentInput["type"]>("FULL");

  const createMutation = useMutation({
    mutationFn: (input: PaymentInput) => createPaymentAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-outstanding-summary"] });
      queryClient.invalidateQueries({ queryKey: ["job-financial-summary", job.jobId] });
      queryClient.invalidateQueries({ queryKey: ["payments", job.jobId] });
      setOpen(false);
    },
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      setAmount(String(job.outstanding));
      setType("FULL");
    }
    setOpen(next);
  }

  function handleConfirm() {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return;
    createMutation.mutate({
      teamId: job.teamId,
      jobId: job.jobId,
      amount: amountNum,
      whtRate: 0,
      type,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="primary" aria-label={`บันทึกรับเงิน — ${job.title}`}>
          รับเงิน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกรับเงิน — {job.title}</DialogTitle>
          <DialogDescription>ค้างอยู่ ฿{formatCurrency(job.outstanding)} ปรับจำนวนหรือประเภทได้ก่อนยืนยัน</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`quick-pay-amount-${job.jobId}`}>จำนวนเงิน (บาท)</Label>
            <Input
              id={`quick-pay-amount-${job.jobId}`}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["DEPOSIT", "BALANCE", "FULL"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={type === t ? "primary" : "outline"}
                onClick={() => setType(t)}
              >
                {PAYMENT_TYPE_LABEL[t]}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm} disabled={createMutation.isPending}>
            {createMutation.isPending ? "กำลังบันทึก..." : "ยืนยันรับเงิน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
