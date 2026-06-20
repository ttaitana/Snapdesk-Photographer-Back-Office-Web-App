// P9 — Calendar Sync (F4). Export barrel, same explicit-named-exports
// convention as packages/core/src/index.ts (no `export *` for service
// modules — see that file's header note).

export {
  type CalendarProvider,
  type CalendarEventInput,
  type CalendarEventResult,
  type CalendarListItem,
  type RefreshedToken,
  type CalendarClient,
  CalendarAuthError,
  CalendarApiError,
} from "./types";

export { createGoogleCalendarClient, type GoogleCalendarConfig } from "./google-calendar";
export { createOutlookCalendarClient, type OutlookCalendarConfig } from "./outlook-calendar";

export { CALENDAR_OAUTH_SCOPES, FILE_OAUTH_SCOPES, CONNECT_OAUTH_SCOPES } from "./scopes";

// P7 (unblocked by P9) — Drive/OneDrive file picker.
export { type DriveFile, type FileClient } from "./file-types";
export { createGoogleDriveClient } from "./google-drive";
export { createOutlookOneDriveClient } from "./outlook-onedrive";
