// P7 (unblocked by P9) — Drive/OneDrive file picker for delivery QR. Shared
// shapes for both provider clients (google-drive.ts, outlook-onedrive.ts) —
// same split as types.ts/the calendar clients, kept in its own file rather
// than added to types.ts so that file stays "calendar shapes" even though
// CalendarAuthError/CalendarApiError (imported from there, not redeclared
// here) are reused as-is below: despite the name, they're just "this
// provider API call needs a fresh token" / "this provider API call failed"
// — nothing calendar-specific about either class, see types.ts's header.

/** One file or folder as returned by the provider's "list files" call. */
export interface DriveFile {
  id: string;
  name: string;
  /** Link to open the file/folder — becomes DeliveryQr.sourceUrl if the
   * photographer picks this instead of pasting a link by hand
   * (packages/core/src/delivery-qr's detectProvider still infers
   * "google"/"onedrive" from this URL's host same as a hand-pasted link —
   * no change needed there). */
  webViewUrl: string;
  isFolder: boolean;
}

/**
 * Common surface both providers implement. packages/core/src/file-picker
 * picks the right client by CalendarProvider, same dispatch pattern as
 * calendar-sync's CalendarClient.
 *
 * No `refreshAccessToken` here (unlike CalendarClient) — token refresh is
 * provider-credential-scoped, not API-scoped, so file-picker reuses
 * calendar-sync's existing withFreshToken/getCalendarClient refresh path
 * instead of duplicating it. See packages/core/src/file-picker's header.
 */
export interface FileClient {
  /** `query` filters by name (provider-side search); omitted = most
   * recently modified files/folders, capped per-implementation (~50). */
  listFiles(accessToken: string, query?: string): Promise<DriveFile[]>;
}
