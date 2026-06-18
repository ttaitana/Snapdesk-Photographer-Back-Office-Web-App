"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Job, Payment, PaymentInput } from "@snapdesk/types";
import { listPaymentsAction, createPaymentAction, getJobFinancialSummaryAction } from "../payments-actions";
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
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";

const PAYMENT_TYPE_LABEL: Record<PaymentInput["type"], string> = {
  DEPOSIT: "มัดจำ",
  BALANCE: "ยอดคงเหลือ",
  FULL: "เต็มจำนวน",
};

/**
 * P4 F3 — "สถานะการเงินต่องาน" + "ประวัติการจ่าย" + "ปุ่มบันทึกรับเงินเร็ว".
 * Quick-record buttons (deposit/balance/full) open a small Dialog pre-filled
 * with a sensible amount (deposit → job.quotedDeposit if set, balance/full →
 * current outstanding) that the user can still adjust before saving.
 */
export function FinancialSection({ job }: { job: Job }) {
  const queryClient = useQueryClient();
  const [dialogType, setDialogType] = useState<PaymentInput["type"] | null>(null);
  const [amount, setAmount] = useState("0");
  const [whtRate, setWhtRate] = useState("0");
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");

  const summaryQuery = useQuery({
    queryKey: ["job-financial-summary", job.id],
    queryFn: () => getJobFinancialSummaryAction(job.id),
  });
  const paymentsQuery = useQuery({
    queryKey: ["payments", job.id],
    queryFn: () => listPaymentsAction(job.id),
  });

  const summary = summaryQuery.data;
  const payments = paymentsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (input: PaymentInput) => createPaymentAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-financial-summary", job.id] });
      queryClient.invalidateQueries({ queryKey: ["payments", job.id] });
      queryClient.invalidateQueries({ queryKey: ["team-outstanding-summary"] });
      setDialogType(null);
    },
  });

  function openDialog(type: PaymentInput["type"]) {
    const outstanding = summary?.outstanding ?? 0;
    const suggested =
      type === "DEPOSIT" ? job.quotedDeposit || outstanding : Math.max(0, outstanding);
    setAmount(String(round2(suggested)));
    setWhtRate("0");
    setMethod("");
    setNote("");
    setDialogType(type);
  }

  function handleConfirm() {
    if (!dialogType) return;
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return;
    createMutation.mutate({
      teamId: job.teamId,
      jobId: job.id,
      amount: amountNum,
      whtRate: Number(whtRate) || 0,
      type: dialogType,
      method: method || undefined,
      note: note || undefined,
    });
  }

  const outstanding = summary?.outstanding ?? job.totalPrice;
  const statusColor =
    outstanding > 0 ? "text-danger" : outstanding < 0 ? "text-primary" : "text-success";

  return (
    <div className="panel space-y-4 p-5">
      <h3 className="font-heading text-lg uppercase text-ink">สถานะการเงิน</h3>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">ราคารวม</dt>
          <dd className="font-heading text-lg text-ink">฿{formatCurrency(summary?.totalPrice ?? job.totalPrice)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">จ่ายแล้ว</dt>
          <dd className="font-heading text-lg text-success">฿{formatCurrency(summary?.paid ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">ยอดค้าง</dt>
          <dd className={cn("font-heading text-lg", statusColor)}>฿{formatCurrency(outstanding)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink/20 pt-4">
        <span className="text-sm text-muted-foreground">บันทึกรับเงิน:</span>
        <Button type="button" size="sm" variant="outline" onClick={() => openDialog("DEPOSIT")}>
          มัดจำ
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => openDialog("BALANCE")}>
          ยอดคงเหลือ
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => openDialog("FULL")}>
          เต็มจำนวน
        </Button>
      </div>

      <div className="space-y-2 border-t border-ink/20 pt-4">
        <p className="text-sm font-medium text-ink">ประวัติการจ่าย</p>
        {payments.length > 0 ? (
          <ul className="space-y-2">
            {payments.map((payment: Payment) => (
              <li key={payment.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-ink">{PAYMENT_TYPE_LABEL[payment.type]}</span>
                  <span className="ml-2 text-muted-foreground">
                    {payment.paidAt.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    {payment.method ? ` · ${payment.method}` : ""}
                  </span>
                </div>
                <span className="font-medium text-ink">฿{formatCurrency(payment.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการจ่ายเงิน</p>
        )}
      </div>

      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกรับเงิน{dialogType ? ` — ${PAYMENT_TYPE_LABEL[dialogType]}` : ""}</DialogTitle>
            <DialogDescription>กรอกจำนวนเงินที่ได้รับจริง ระบบจะคำนวณภาษี ณ ที่จ่ายให้อัตโนมัติ</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
              <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whtRate">หัก ณ ที่จ่าย (%)</Label>
              <Input id="whtRate" type="number" min="0" max="100" step="0.01" value={whtRate} onChange={(e) => setWhtRate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="method">วิธีจ่าย</Label>
              <Input id="method" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="โอนเงิน, เงินสด, ..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">หมายเหตุ</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogType(null)}>
              ยกเลิก
            </Button>
            <Button type="button" variant="primary" onClick={handleConfirm} disabled={createMutation.isPending}>
              {createMutation.isPending ? "กำลังบันทึก..." : "บันทึกรับเงิน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
