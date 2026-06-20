import type { FileClient, DriveFile } from "./file-types";
import { CalendarAuthError, CalendarApiError } from "./types";

const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

/**
 * Thin REST wrapper over Google Drive API v3 — plain `fetch`, same
 * zero-SDK convention as google-calendar.ts, for the same reason: Better
 * Auth already holds the access token (via the `drive.readonly` scope, see
 * @snapdesk/integrations' scopes.ts), so we only need one endpoint here.
 *
 * No config/clientId/clientSecret param (unlike createGoogleCalendarClient)
 * — this client never refreshes tokens itself; packages/core/src/file-picker
 * reuses calendar-sync's existing withFreshToken for that, since refresh is
 * scoped to the OAuth app's credentials, not to which API is being called.
 *
 * NOTE: written without network access to verify against a live Google
 * account — endpoint/field shapes match Google's public Drive API v3
 * reference docs as of this writing. Re-check `files.list`'s response field
 * names (`webViewLink`, `mimeType`) against a real call the first time this
 * runs against production credentials — same caveat as google-calendar.ts.
 */
export function createGoogleDriveClient(): FileClient {
  async function request<T>(accessToken: string, path: string): Promise<T> {
    const res = await fetch(`${GOOGLE_DRIVE_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      throw new CalendarAuthError(
        "google",
        "Google Drive API returned 401 — access token expired, revoked, or missing the drive.readonly scope."
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CalendarApiError("google", res.status, `Google Drive API error ${res.status}: ${body}`);
    }
    return (await res.json()) as T;
  }

  return {
    async listFiles(accessToken, query): Promise<DriveFile[]> {
      const qParts = ["trashed = false"];
      if (query) {
        // Drive API `q` syntax — single quotes inside the search term must
        // be backslash-escaped per Google's query-syntax reference.
        qParts.push(`name contains '${query.replace(/'/g, "\\'")}'`);
      }
      const params = new URLSearchParams({
        q: qParts.join(" and "),
        fields: "files(id,name,webViewLink,mimeType)",
        pageSize: "50",
        orderBy: "modifiedTime desc",
      });
      const data = await request<{
        files: Array<{ id: string; name: string; webViewLink: string; mimeType: string }>;
      }>(accessToken, `/files?${params.toString()}`);
      return data.files.map((f) => ({
        id: f.id,
        name: f.name,
        webViewUrl: f.webViewLink,
        isFolder: f.mimeType === "application/vnd.google-apps.folder",
      }));
    },
  };
}
