// File picker — P7 F6 ("ส่งมอบงานผ่าน QR"), the "(optional) file picker จาก
// Drive ถ้าเชื่อม account แล้ว" line in TASKS.md that was blocked on P9's
// Calendar OAuth plumbing. Lets a photographer browse their already-
// connected Google Drive / OneDrive instead of pasting a delivery link by
// hand (apps/web's delivery-qr-section.tsx) — the picked file's link still
// flows through the existing setDeliveryQr/detectProvider path unchanged.
//
// Like calendar-sync, this is a PERSONAL resource (Better Auth's Account is
// keyed by userId, not teamId) — every exported function here takes a bare
// `userId`, same convention and same caller contract as calendar-sync's
// header comment.
//
// Deliberately thin: reuses calendar-sync's withFreshToken instead of
// duplicating the proactive-refresh/reactive-retry dance — that function's
// `fn` callback is generic over what it calls with the access token, see
// the comment on withFreshToken itself. Also reuses
// CalendarSyncProviderConfig (clientId/clientSecret per provider) verbatim
// — it's really just "OAuth app credentials per provider", nothing
// calendar-specific about its shape, despite the name.
//
// ── Scope dependency ──
// This requires the user's Account to carry drive.readonly (Google) /
// Files.Read (Microsoft) in addition to the calendar scope. Settings →
// Integrations' connect button now requests both together in one consent
// screen (see @snapdesk/integrations' CONNECT_OAUTH_SCOPES) — but anyone
// who connected a provider BEFORE this feature shipped only has the
// narrower calendar-only scope on their stored token, and will get a
// 401/403 from the provider here. The fix is reconnecting once via that
// same button (linkSocial overwrites the stored scope) — not a separate
// "upgrade scope" flow; see scopes.ts for the full reasoning.

import {
  createGoogleDriveClient,
  createOutlookOneDriveClient,
  type DriveFile,
  type FileClient,
} from "@snapdesk/integrations";
import type { CalendarProvider } from "@snapdesk/types";

import { withFreshToken, type CalendarSyncProviderConfig } from "../calendar-sync";

function getFileClient(provider: CalendarProvider): FileClient {
  return provider === "google" ? createGoogleDriveClient() : createOutlookOneDriveClient();
}

/**
 * Lists the user's most recently modified Drive/OneDrive files (or files
 * matching `query`, provider-side search) — backs the file picker in
 * delivery-qr-section.tsx. Throws CalendarNotConnectedError (from
 * withFreshToken) if this provider has no Account row at all, and
 * ProviderNotConfiguredError if the server has no clientId/clientSecret for
 * it — same two errors listAvailableCalendars throws, for the same reasons;
 * neither is calendar-specific despite living in calendar-sync/index.ts.
 */
export async function listDriveFiles(
  userId: string,
  provider: CalendarProvider,
  providerConfig: CalendarSyncProviderConfig,
  query?: string
): Promise<DriveFile[]> {
  const client = getFileClient(provider);
  return withFreshToken(userId, provider, providerConfig, (accessToken) =>
    client.listFiles(accessToken, query)
  );
}
