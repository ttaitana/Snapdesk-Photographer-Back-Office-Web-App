"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { CalendarInfo, CalendarProvider } from "@snapdesk/types";
import { linkSocial } from "@/lib/auth-client";
import { CONNECT_OAUTH_SCOPES } from "@snapdesk/integrations";
import { Button } from "@/components/ui/button";
import { disconnectProviderAction, saveCalendarSelectionAction } from "./actions";

export interface ProviderPanelData {
  provider: CalendarProvider;
  label: string;
  /** From lib/env.ts's `integrations` flags — false means no CLIENT_ID/SECRET
   * is configured for this provider at all, not just "not connected yet". */
  configured: boolean;
  connected: boolean;
  /** Live list from the provider's API, fetched server-side. null when not
   * connected, or when connected but the fetch failed (see fetchFailed). */
  calendars: CalendarInfo[] | null;
  /** Currently-synced calendars, read straight from our own CalendarConnection
   * table — kept separate from `calendars` so the saved selection still
   * renders even if the live list fetch below failed. */
  saved: { calendarId: string; calendarName: string }[];
  fetchFailed: boolean;
}

/**
 * P9 — Calendar Sync (F4) Settings UI. One card per provider; renders
 * regardless of connection state (SPEC.md: "show status" for each provider
 * independently — see getProviderStatuses' doc comment for why the server
 * always returns both rows).
 */
export function IntegrationsPanel({ providers }: { providers: ProviderPanelData[] }) {
  return (
    <div className="space-y-6">
      {providers.map((p) => (
        <ProviderCard key={p.provider} data={p} />
      ))}
    </div>
  );
}

function ProviderCard({ data }: { data: ProviderPanelData }) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectNote, setDisconnectNote] = useState<string | null>(null);
  const [saving, startSaveTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(data.saved.map((c) => c.calendarId))
  );

  async function handleConnect() {
    setConnecting(true);
    try {
      // CONNECT_OAUTH_SCOPES = calendar + Drive/Files scopes requested
      // together in one consent screen — see @snapdesk/integrations'
      // scopes.ts for why (avoids relying on incremental-grant scope
      // union, which isn't verified for either provider). Also reuses the
      // verified better-auth re-link behavior documented there: this
      // safely shares the same Account row as "Sign in with
      // Google/Microsoft" if the user already used one of those, rather
      // than erroring.
      await linkSocial({
        provider: data.provider,
        scopes: [...CONNECT_OAUTH_SCOPES[data.provider]],
        callbackURL: "/team/integrations",
      });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setDisconnectNote(null);
    try {
      const result = await disconnectProviderAction(data.provider);
      if (!result.unlinkedAccount) {
        setDisconnectNote(
          "หยุดการซิงค์ปฏิทินแล้ว แต่ยังเข้าสู่ระบบด้วยผู้ให้บริการนี้ได้อยู่ เนื่องจากเป็นวิธีเข้าสู่ระบบเดียวที่คุณมี"
        );
      }
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  function toggle(calendarId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }
      return next;
    });
    setSaveSuccess(false);
  }

  function handleSave() {
    if (!data.calendars) return;
    setSaveError(null);
    setSaveSuccess(false);
    const calendars = data.calendars.filter((c) => selected.has(c.id));
    startSaveTransition(async () => {
      try {
        await saveCalendarSelectionAction({ provider: data.provider, calendars });
        setSaveSuccess(true);
        router.refresh();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ ลองอีกครั้ง");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border-2 border-ink p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{data.label}</p>
          <p className="text-sm text-muted-foreground">
            {!data.configured
              ? "ระบบยังไม่ได้ตั้งค่าผู้ให้บริการนี้ — ติดต่อผู้ดูแลระบบ"
              : data.connected
                ? "เชื่อมต่อแล้ว"
                : "ยังไม่เชื่อมต่อ"}
          </p>
        </div>

        {data.configured && (
          <Button
            type="button"
            variant={data.connected ? "outline" : "primary"}
            disabled={connecting || disconnecting}
            onClick={data.connected ? handleDisconnect : handleConnect}
          >
            {data.connected
              ? disconnecting
                ? "กำลังยกเลิก..."
                : "ยกเลิกการเชื่อมต่อ"
              : connecting
                ? "กำลังเชื่อมต่อ..."
                : "เชื่อมต่อ"}
          </Button>
        )}
      </div>

      {disconnectNote && <p className="text-sm text-muted-foreground">{disconnectNote}</p>}

      {data.connected && data.calendars && (
        <div className="space-y-2 pt-2">
          <p className="text-sm text-muted-foreground">
            เลือกปฏิทินที่ต้องการซิงค์คิวถ่าย (เลือกได้มากกว่าหนึ่ง)
          </p>
          <div className="flex flex-wrap gap-2">
            {data.calendars.length === 0 && (
              <p className="text-sm text-muted-foreground">ไม่พบปฏิทินในบัญชีนี้</p>
            )}
            {data.calendars.map((cal) => (
              <Button
                key={cal.id}
                type="button"
                size="sm"
                variant={selected.has(cal.id) ? "primary" : "outline"}
                onClick={() => toggle(cal.id)}
              >
                {cal.name}
                {cal.primary ? " (หลัก)" : ""}
              </Button>
            ))}
          </div>
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          {saveSuccess && <p className="text-sm text-primary">บันทึกแล้ว</p>}
          <Button type="button" variant="primary" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "กำลังบันทึก..." : "บันทึกการเลือกปฏิทิน"}
          </Button>
        </div>
      )}

      {data.connected && data.fetchFailed && (
        <div className="space-y-2 pt-2">
          <p className="text-sm text-destructive">
            ไม่สามารถโหลดรายการปฏิทินล่าสุดได้ในขณะนี้ ปฏิทินที่ซิงค์อยู่ก่อนหน้านี้ยังทำงานต่อไป:
          </p>
          {data.saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีปฏิทินที่เลือกไว้</p>
          ) : (
            <ul className="list-inside list-disc text-sm">
              {data.saved.map((c) => (
                <li key={c.calendarId}>{c.calendarName}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
