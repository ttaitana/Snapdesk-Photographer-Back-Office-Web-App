"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { File as FileIcon, Folder, Loader2, Search } from "lucide-react";

import type { CalendarProvider } from "@snapdesk/types";
import type { DriveFile } from "@snapdesk/integrations";
import { getConnectedProvidersAction, listDriveFilesAction } from "../delivery-qr-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PROVIDER_LABEL: Record<CalendarProvider, string> = {
  google: "Google Drive",
  microsoft: "OneDrive",
};

/**
 * P7 (unblocked by P9) — file picker for delivery-qr-section.tsx. Picking a
 * file fills in the same `sourceUrl` the paste-link form already uses
 * (`onSelect`), so setDeliveryQrAction/detectProvider don't need any
 * changes — the picker is purely an alternative way to get a link into that
 * one input.
 */
export function DeliveryFilePicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<CalendarProvider | null>(null);
  const [query, setQuery] = useState("");

  const providersQuery = useQuery({
    queryKey: ["delivery-qr-connected-providers"],
    queryFn: getConnectedProvidersAction,
    enabled: open,
  });

  const connected = providersQuery.data ?? [];
  const activeProvider = provider ?? connected[0] ?? null;

  const filesQuery = useQuery({
    queryKey: ["delivery-qr-drive-files", activeProvider, query],
    queryFn: async (): Promise<DriveFile[]> => {
      if (!activeProvider) return [];
      return listDriveFilesAction(activeProvider, query.trim() || undefined);
    },
    enabled: open && !!activeProvider,
  });

  function handlePick(file: DriveFile) {
    onSelect(file.webViewUrl);
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          เลือกจาก Drive / OneDrive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เลือกไฟล์ส่งมอบงาน</DialogTitle>
          <DialogDescription>เลือกไฟล์หรือโฟลเดอร์จากบัญชีที่เชื่อมต่อไว้แล้วใน &quot;การเชื่อมต่อ&quot;</DialogDescription>
        </DialogHeader>

        {providersQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : connected.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            ยังไม่ได้เชื่อมต่อ Google Drive หรือ OneDrive —{" "}
            <a href="/team/integrations" className="underline">
              ไปที่หน้าการเชื่อมต่อ
            </a>{" "}
            ก่อน
          </p>
        ) : (
          <div className="space-y-3">
            {connected.length > 1 && (
              <div className="flex gap-2">
                {connected.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={activeProvider === p ? "primary" : "outline"}
                    onClick={() => setProvider(p)}
                  >
                    {PROVIDER_LABEL[p]}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาไฟล์..." />
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto">
              {filesQuery.isLoading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังโหลดไฟล์...
                </p>
              )}
              {filesQuery.isError && (
                <p className="text-sm text-destructive">
                  โหลดรายการไฟล์ไม่สำเร็จ — ถ้าเพิ่งเชื่อมต่อก่อนฟีเจอร์นี้เปิดใช้งาน ลองยกเลิกการเชื่อมต่อแล้วเชื่อมต่อใหม่อีกครั้งที่หน้า
                  &quot;การเชื่อมต่อ&quot;
                </p>
              )}
              {filesQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">ไม่พบไฟล์</p>}
              {filesQuery.data?.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => handlePick(file)}
                  className="flex w-full items-center gap-2 rounded-md border border-ink/20 px-3 py-2 text-left text-sm hover:border-ink"
                >
                  {file.isFolder ? (
                    <Folder className="h-4 w-4 shrink-0" />
                  ) : (
                    <FileIcon className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
