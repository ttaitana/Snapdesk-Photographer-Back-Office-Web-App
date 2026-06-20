"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, QrCode } from "lucide-react";

import type { Job } from "@snapdesk/types";
import {
  getDeliveryQrAction,
  setDeliveryQrAction,
  deleteDeliveryQrAction,
} from "../delivery-qr-actions";
import { DeliveryFilePicker } from "./delivery-file-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google Drive",
  onedrive: "OneDrive",
};

/**
 * P7 F6 — "ส่งมอบงานผ่าน QR": paste a Drive/OneDrive link, generate a QR
 * that encodes it directly (scanning goes straight to the folder — no
 * redirect through our app, see schema.prisma's DeliveryQr comment), then
 * retrieve the link again / download the QR image / copy the link for chat.
 */
export function DeliveryQrSection({ job }: { job: Job }) {
  const queryClient = useQueryClient();
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const qrQuery = useQuery({
    queryKey: ["delivery-qr", job.id],
    queryFn: () => getDeliveryQrAction(job.id),
  });

  const deliveryQr = qrQuery.data ?? null;

  const setMutation = useMutation({
    mutationFn: () => setDeliveryQrAction({ teamId: job.teamId, jobId: job.id, sourceUrl: sourceUrl.trim() }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["delivery-qr", job.id], updated);
      setSourceUrl("");
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error && err.message ? err.message : "สร้าง QR ไม่สำเร็จ ลองอีกครั้ง");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDeliveryQrAction(job.id),
    onSuccess: () => {
      queryClient.setQueryData(["delivery-qr", job.id], null);
    },
  });

  function handleGenerate() {
    setError(null);
    if (!sourceUrl.trim()) {
      setError("กรุณาวางลิงก์ Google Drive หรือ OneDrive");
      return;
    }
    setMutation.mutate();
  }

  async function handleCopy(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="panel space-y-4 p-5">
      <h3 className="flex items-center gap-2 font-heading text-lg uppercase text-ink">
        <QrCode className="h-5 w-5" />
        ส่งมอบงานผ่าน QR
      </h3>

      {deliveryQr ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start gap-4">
            <img
              src={deliveryQr.qrImageUrl}
              alt="QR ลิงก์ส่งมอบงาน"
              className="h-40 w-40 rounded-md border-2 border-ink bg-white p-2"
            />
            <div className="flex-1 space-y-2 text-sm">
              <p className="text-muted-foreground">
                ผู้ให้บริการ:{" "}
                <span className="font-medium text-ink">
                  {(deliveryQr.provider && PROVIDER_LABEL[deliveryQr.provider]) || "ลิงก์อื่น"}
                </span>
              </p>
              <p className="break-all text-ink">{deliveryQr.sourceUrl}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="outline">
                  <a href={deliveryQr.qrImageUrl} download={`delivery-qr-${job.id}.png`}>
                    <Download className="mr-1.5 h-4 w-4" />
                    ดาวน์โหลด QR
                  </a>
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => handleCopy(deliveryQr.sourceUrl)}>
                  <Copy className="mr-1.5 h-4 w-4" />
                  {copied ? "ก็อปแล้ว" : "ก็อปลิงก์"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  ลบ
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-ink/20 pt-4">
            <p className="text-sm font-medium text-ink">เปลี่ยนลิงก์</p>
            <DeliveryLinkForm
              sourceUrl={sourceUrl}
              setSourceUrl={setSourceUrl}
              onSubmit={handleGenerate}
              pending={setMutation.isPending}
              error={error}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            วางลิงก์โฟลเดอร์/ไฟล์จาก Google Drive หรือ OneDrive แล้วระบบจะสร้าง QR ให้ลูกค้าสแกนเข้าถึงงานได้ทันที
          </p>
          <DeliveryLinkForm
            sourceUrl={sourceUrl}
            setSourceUrl={setSourceUrl}
            onSubmit={handleGenerate}
            pending={setMutation.isPending}
            error={error}
          />
        </div>
      )}
    </div>
  );
}

function DeliveryLinkForm({
  sourceUrl,
  setSourceUrl,
  onSubmit,
  pending,
  error,
}: {
  sourceUrl: string;
  setSourceUrl: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="deliveryLink">ลิงก์ Google Drive / OneDrive</Label>
          <DeliveryFilePicker onSelect={setSourceUrl} />
        </div>
        <Input
          id="deliveryLink"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://drive.google.com/..."
        />
      </div>
      <Button type="submit" size="sm" variant="primary" disabled={pending}>
        {pending ? "กำลังสร้าง..." : "สร้าง QR"}
      </Button>
      {error ? <p className="text-sm text-destructive sm:basis-full">{error}</p> : null}
    </form>
  );
}
