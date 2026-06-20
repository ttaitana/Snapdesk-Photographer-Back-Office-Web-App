import type {
  CalendarClient,
  CalendarEventInput,
  CalendarEventResult,
  CalendarListItem,
  RefreshedToken,
} from "./types";
import { CalendarAuthError, CalendarApiError } from "./types";

const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * Thin REST wrapper over Google Calendar API v3 — plain `fetch` + the
 * access token Better Auth already obtained via the `calendar.events` scope
 * (see packages/auth's incremental-scope linking, P9 task #9), not the
 * `googleapis` SDK. We're not doing our own OAuth dance here — Better
 * Auth's Account table already holds the tokens — so the SDK's main value
 * (managing an OAuth2Client) doesn't apply, and hand-rolling these few
 * endpoints keeps this package's dependency footprint at zero npm packages.
 *
 * NOTE: written without network access to verify against a live Google
 * account — endpoint shapes match Google's public Calendar API v3 reference
 * docs as of this writing. Re-check `listCalendars`'s response field names
 * (`summary`/`primary`) against a real `GET .../users/me/calendarList` call
 * the first time this runs against production credentials.
 */
export function createGoogleCalendarClient(config: GoogleCalendarConfig): CalendarClient {
  async function request<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${GOOGLE_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (res.status === 401) {
      throw new CalendarAuthError(
        "google",
        "Google Calendar API returned 401 — access token expired or revoked."
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CalendarApiError("google", res.status, `Google Calendar API error ${res.status}: ${body}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    async listCalendars(accessToken): Promise<CalendarListItem[]> {
      const data = await request<{
        items: Array<{ id: string; summary: string; primary?: boolean }>;
      }>(accessToken, "/users/me/calendarList");
      return data.items.map((item) => ({ id: item.id, name: item.summary, primary: item.primary }));
    },

    async createEvent(
      accessToken,
      calendarId,
      event: CalendarEventInput
    ): Promise<CalendarEventResult> {
      const data = await request<{ id: string }>(
        accessToken,
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: "POST", body: JSON.stringify(toGoogleEvent(event)) }
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
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: "PATCH", body: JSON.stringify(toGoogleEvent(event)) }
      );
      return { id: data.id };
    },

    async deleteEvent(accessToken, calendarId, eventId): Promise<void> {
      try {
        await request<void>(
          accessToken,
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          { method: "DELETE" }
        );
      } catch (err) {
        // 404/410 — already gone (deleted on the provider side, or the
        // calendar itself was unlinked since). Not a failure for our
        // purposes: the caller wanted this event gone, and it is.
        if (err instanceof CalendarApiError && (err.status === 404 || err.status === 410)) return;
        throw err;
      }
    },

    async refreshAccessToken(refreshToken): Promise<RefreshedToken> {
      const res = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new CalendarAuthError("google", `Google token refresh failed (${res.status}): ${body}`);
      }

      const data = (await res.json()) as {
        access_token: string;
        expires_in: number;
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

function toGoogleEvent(event: CalendarEventInput) {
  return {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: { dateTime: event.start.toISOString() },
    end: { dateTime: event.end.toISOString() },
  };
}
