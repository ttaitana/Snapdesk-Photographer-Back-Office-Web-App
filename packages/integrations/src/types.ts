// P9 — Calendar Sync (F4). Shared shapes/errors for both provider clients
// (google-calendar.ts, outlook-calendar.ts). Deliberately has zero
// dependency on @snapdesk/types or @snapdesk/core — this package is a thin
// wrapper over two external REST APIs and shouldn't know about Job/
// CalendarConnection at all; packages/core/src/calendar-sync is the layer
// that translates between domain types and these provider-agnostic shapes.
//
// CalendarAuthError/CalendarApiError below are also reused as-is by
// google-drive.ts/outlook-onedrive.ts (P7's file picker, see file-types.ts)
// — despite the "Calendar" name, both classes just mean "this provider API
// call needs a fresh token" / "this provider API call failed", with no
// actual dependency on which provider API was being called.

/** Plain string union, not imported from @snapdesk/types — see file header. */
export type CalendarProvider = "google" | "microsoft";

export interface CalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
}

export interface CalendarEventResult {
  /** Provider-assigned event id — stored in Job.calendarEventIds. */
  id: string;
}

/** One calendar as returned by the provider's "list calendars" call. */
export interface CalendarListItem {
  id: string;
  name: string;
  primary?: boolean;
}

export interface RefreshedToken {
  accessToken: string;
  expiresAt: Date;
  /**
   * Google only returns a new refresh_token on first consent (or when the
   * user re-consents) — most refresh calls should keep using the one
   * already stored. Microsoft always rotates it. `null` means "keep the
   * existing one", never overwrite with null.
   */
  refreshToken: string | null;
}

/**
 * Thrown when a calendar API call gets a 401 — signals the caller
 * (packages/core/src/calendar-sync) that the stored access token is expired
 * or revoked and should be refreshed (via refreshAccessToken) before one
 * retry. Kept distinct from CalendarApiError so a genuinely-missing
 * event/calendar (404) is never mistaken for an auth problem.
 */
export class CalendarAuthError extends Error {
  constructor(
    public provider: CalendarProvider,
    message: string
  ) {
    super(message);
    this.name = "CalendarAuthError";
  }
}

/** Thrown for any other non-2xx response (404 on delete is handled inside
 * each client and does not reach the caller as an error — see those files). */
export class CalendarApiError extends Error {
  constructor(
    public provider: CalendarProvider,
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "CalendarApiError";
  }
}

/**
 * Common surface both providers implement. packages/core/src/calendar-sync
 * picks the right client by CalendarConnection.provider and otherwise
 * doesn't care which one it's talking to.
 */
export interface CalendarClient {
  listCalendars(accessToken: string): Promise<CalendarListItem[]>;
  createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEventInput
  ): Promise<CalendarEventResult>;
  updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: CalendarEventInput
  ): Promise<CalendarEventResult>;
  /** No-op (resolves normally) if the event is already gone (404/410) —
   * see the "already gone" comment in each implementation. */
  deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void>;
  refreshAccessToken(refreshToken: string): Promise<RefreshedToken>;
}
