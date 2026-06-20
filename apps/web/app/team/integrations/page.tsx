import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getProviderStatuses,
  getCalendarConnections,
  listAvailableCalendars,
} from "@snapdesk/core";
import type { CalendarInfo, CalendarProvider } from "@snapdesk/types";

import { auth } from "@/lib/auth";
import { integrations, calendarProviderConfig } from "@/lib/env";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegrationsPanel, type ProviderPanelData } from "./integrations-panel";

const PROVIDER_LABELS: Record<CalendarProvider, string> = {
  google: "Google Calendar",
  microsoft: "Outlook / Microsoft Calendar",
};

/**
 * P9 — Calendar Sync (F4). Personal page (calendar connections are
 * userId-scoped, not team-scoped — see @snapdesk/core's calendar-sync file
 * header), but kept under /team/* so team/layout.tsx's existing
 * session+team guard applies for free, same as every other settings page.
 * Still re-checks the session itself below, matching that layout's own
 * comment that child pages shouldn't assume the parent ran.
 */
export default async function IntegrationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }
  const userId = session.user.id;

  // Always returns both providers, even ones never connected — see
  // getProviderStatuses' own doc comment in @snapdesk/core.
  const statuses = await getProviderStatuses(userId);

  const providers: ProviderPanelData[] = await Promise.all(
    statuses.map(async (status) => {
      const configured = integrations[status.provider];

      if (!status.connected) {
        return {
          provider: status.provider,
          label: PROVIDER_LABELS[status.provider],
          configured,
          connected: false,
          calendars: null,
          saved: [],
          fetchFailed: false,
        };
      }

      const savedConnections = await getCalendarConnections(userId, status.provider);
      const saved = savedConnections
        .filter((c) => c.enabled)
        .map((c) => ({ calendarId: c.calendarId, calendarName: c.calendarName }));

      let calendars: CalendarInfo[] | null = null;
      let fetchFailed = false;
      try {
        calendars = await listAvailableCalendars(userId, status.provider, calendarProviderConfig);
      } catch (err) {
        // Token revoked outside the app, transient provider outage, etc. —
        // don't let one provider's API hiccup break the whole page. `saved`
        // (above, read straight from our own table) still renders so the
        // user can see/keep what's synced; they just can't change it until
        // this succeeds again.
        console.warn(`[integrations] listAvailableCalendars(${status.provider}) failed:`, err);
        fetchFailed = true;
      }

      return {
        provider: status.provider,
        label: PROVIDER_LABELS[status.provider],
        configured,
        connected: true,
        calendars,
        saved,
        fetchFailed,
      };
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>การเชื่อมต่อ</CardTitle>
        <CardDescription>
          เชื่อมต่อปฏิทิน Google หรือ Outlook เพื่อให้คิวถ่ายของคุณซิงค์เข้าปฏิทินอัตโนมัติ
          เลือกได้มากกว่าหนึ่งปฏิทินต่อผู้ให้บริการ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <IntegrationsPanel providers={providers} />
      </CardContent>
    </Card>
  );
}
