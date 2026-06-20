import type {
  CalendarClient,
  CalendarEventInput,
  CalendarEventResult,
  CalendarListItem,
  RefreshedToken,
} from "./types";
import { CalendarAuthError, CalendarApiError } from "./types";

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

export interface OutlookCalendarConfig {
  clientId: string;
  clientSecret: string;
  /** Defaults to "common" (multi-tenant + personal accounts) — matches
   * packages/auth's MS_TENANT_ID default for the login flow. Must be the
   * same tenant the access/refresh token were issued against. */
  tenantId?: string;
}

/**
 * Thin REST wrapper over Microsoft Graph's calendar endpoints — plain
 * `fetch`, no `@microsoft/microsoft-graph-client`/MSAL dependency, for the
 * same reason as google-calendar.ts: Better Auth already holds the OAuth
 * tokens (via the `Calendars.ReadWrite` scope, see packages/auth task #9),
 * so we only need the handful of REST calls below, not a full SDK.
 *
 * NOTE: written without network access to verify against a live Microsoft
 * account — endpoint/body shapes match Microsoft Graph's public v1.0
 * reference docs as of this writing (`/me/calendars`,
 * `/me/calendars/{id}/events`). Re-check the first time this runs against
 * production credentials, same caveat as google-calendar.ts.
 */
export function createOutlookCalendarClient(config: OutlookCalendarConfig): CalendarClient {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId ?? "common"}/oauth2/v2.0/token`;

  async function request<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${GRAPH_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: 'outlook.timezone="UTC"',
        ...init?.headers,
      },
    });

    if (res.status === 401) {
      throw new CalendarAuthError(
        "microsoft",
        "Microsoft Graph returned 401 — access token expired or revoked."
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CalendarApiError("microsoft", res.status, `Microsoft Graph error ${res.status}: ${body}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    async listCalendars(accessToken): Promise<CalendarListItem[]> {
      const data = await request<{
        value: Array<{ id: string; name: string; isDefaultCalendar?: boolean }>;
      }>(accessToken, "/me/calendars");
      return data.value.map((item) => ({
        id: item.id,
        name: item.name,
        primary: item.isDefaultCalendar,
      }));
    },

    async createEvent(
      accessToken,
      calendarId,
      event: CalendarEventInput
    ): Promise<CalendarEventResult> {
      const data = await request<{ id: string }>(
        accessToken,
        `/me/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: "POST", body: JSON.stringify(toGraphEvent(event)) }
      );
      return { id: data.id };
    },

    async updateEvent(
      accessToken,
      calendarId,
      eventId,
      event: CalendarEventInput
    ): Promise<CalendarEventResult> {
      const data = await request<{ id: string }>(
        accessToken,
        `/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: "PATCH", body: JSON.stringify(toGraphEvent(event)) }
      );
      return { id: data.id };
    },

    async deleteEvent(accessToken, calendarId, eventId): Promise<void> {
      try {
        await request<void>(
          accessToken,
          `/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          { method: "DELETE" }
        );
      } catch (err) {
        // Same "already gone" tolerance as google-calendar.ts.
        if (err instanceof CalendarApiError && (err.status === 404 || err.status === 410)) return;
        throw err;
      }
    },

    async refreshAccessToken(refreshToken): Promise<RefreshedToken> {
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new CalendarAuthError("microsoft", `Microsoft token refresh failed (${res.status}): ${body}`);
      }

      const data = (await res.json()) as {
        access_token: string;
        expires_in: number;
        // Microsoft always rotates refresh tokens on use (unlike Google) —
        // this is expected to be present on every successful refresh.
        refresh_token?: string;
      };
      return {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        refreshToken: data.refresh_token ?? null,
      };
    },
  };
}

function toGraphEvent(event: CalendarEventInput) {
  return {
    subject: event.title,
    ...(event.description && { body: { contentType: "text", content: event.description } }),
    ...(event.location && { location: { displayName: event.location } }),
    start: { dateTime: event.start.toISOString(), timeZone: "UTC" },
    end: { dateTime: event.end.toISOString(), timeZone: "UTC" },
  };
}
