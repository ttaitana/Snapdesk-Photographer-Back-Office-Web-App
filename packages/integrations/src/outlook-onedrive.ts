import type { FileClient, DriveFile } from "./file-types";
import { CalendarAuthError, CalendarApiError } from "./types";

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Thin REST wrapper over Microsoft Graph's OneDrive endpoints — plain
 * `fetch`, same zero-SDK convention as outlook-calendar.ts. Better Auth
 * already holds the access token (via the `Files.Read` scope, see
 * @snapdesk/integrations' scopes.ts).
 *
 * No config param, no refreshAccessToken — same reasoning as
 * google-drive.ts: token refresh is reused from calendar-sync's
 * withFreshToken, not duplicated here.
 *
 * NOTE: written without network access to verify against a live Microsoft
 * account — endpoint/body shapes match Microsoft Graph's public v1.0
 * reference docs (`/me/drive/recent`, `/me/drive/root/search`) as of this
 * writing. Re-check the first time this runs against production
 * credentials, same caveat as outlook-calendar.ts.
 */
export function createOutlookOneDriveClient(): FileClient {
  async function request<T>(accessToken: string, path: string): Promise<T> {
    const res = await fetch(`${GRAPH_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      throw new CalendarAuthError(
        "microsoft",
        "Microsoft Graph (OneDrive) returned 401 — access token expired, revoked, or missing the Files.Read scope."
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CalendarApiError("microsoft", res.status, `Microsoft Graph (OneDrive) error ${res.status}: ${body}`);
    }
    return (await res.json()) as T;
  }

  return {
    async listFiles(accessToken, query): Promise<DriveFile[]> {
      // search() needs the term wrapped in single quotes inside the OData
      // function call; doubling an embedded quote is Graph's escape rule.
      const path = query
        ? `/me/drive/root/search(q='${encodeURIComponent(query.replace(/'/g, "''"))}')`
        : `/me/drive/recent`;
      const data = await request<{
        value: Array<{ id: string; name: string; webUrl: string; folder?: unknown }>;
      }>(accessToken, path);
      return data.value.map((item) => ({
        id: item.id,
        name: item.name,
        webViewUrl: item.webUrl,
        isFolder: Boolean(item.folder),
      }));
    },
  };
}
