// P9 — Calendar Sync (F4). OAuth scopes requested when a user clicks
// "connect" on the Settings → Integrations page (apps/web calls
// authClient.linkSocial({ provider, scopes: CALENDAR_OAUTH_SCOPES[provider] })
// — see packages/auth/src/client.ts for why linkSocial/unlinkAccount are
// exposed there with no extra plugin needed).
//
// ── Verified against installed better-auth@1.6.19 source ──
// (node_modules/.pnpm/better-auth@1.6.19.../dist/api/routes/callback.mjs,
// the `if (link) {...}` branch): when a user already has an Account row for
// this provider (e.g. they used "Sign in with Google" before ever touching
// Calendar Sync), calling linkSocial again does NOT error or create a
// second row — the OAuth callback looks up the existing Account by
// (providerId, accountId) and calls internalAdapter.updateAccount(),
// overwriting accessToken/refreshToken/scope with whatever this new
// consent grant returned. So "sign in with Google" and "connect Google
// Calendar" safely share one Account row per user+provider; there is no
// separate "calendar account" concept to manage here.
//
// ── Google caveat — unverified against a live Google account (no network
// access in this environment) ──
// TASKS.md names `calendar.events` as the scope, and that's what's
// requested below, but Google's CalendarList endpoint (used by
// google-calendar.ts's listCalendars, which backs "select default
// calendar") is documented as requiring the broader `calendar` or
// `calendar.readonly` scope, not `calendar.events` alone. If
// listAvailableCalendars 403s in practice against a real account, widen
// the google scope below to "https://www.googleapis.com/auth/calendar"
// and re-test — flagging the risk now rather than guessing silently.
export const CALENDAR_OAUTH_SCOPES = {
  google: ["https://www.googleapis.com/auth/calendar.events"],
  microsoft: ["https://graph.microsoft.com/Calendars.ReadWrite"],
} as const;

// ── P7 (unblocked by P9) — Drive/OneDrive file picker for delivery QR ──
// google-drive.ts / outlook-onedrive.ts list the user's files so they can
// pick a delivery folder/file instead of pasting a link by hand. That needs
// its own scope — calendar.events / Calendars.ReadWrite tokens 403 against
// the Drive/Graph-files endpoints; scopes are enforced per-API on both
// providers, not just per-app.
//
// `drive.readonly` rather than `drive.file`: we render our own file list
// (apps/web's delivery-file-picker.tsx), not Google's official Picker
// widget, so `drive.file` (access limited to items the user opened *through
// the Picker UI*) doesn't apply here — without the real Picker widget we'd
// see an empty list for every file the user hasn't already touched with
// this app. `drive.readonly` is the broader, honest scope for "list and read
// any of the user's files", accepted as a deliberate trade-off to avoid
// pulling in Google's Picker JS + a separate API key just for this optional
// feature.
export const FILE_OAUTH_SCOPES = {
  google: ["https://www.googleapis.com/auth/drive.readonly"],
  microsoft: ["https://graph.microsoft.com/Files.Read"],
} as const;

// Requested together with CALENDAR_OAUTH_SCOPES, in the SAME linkSocial call
// — see integrations-panel.tsx's "เชื่อมต่อ" button — rather than asking for
// Drive/Files access later via a second, separate linkSocial call. Reason:
// per this file's verified-against-source note above, linkSocial on an
// existing Account OVERWRITES Account.scope wholesale with whatever this
// grant returned; a later, separate "add Drive scope" call is not
// guaranteed to *union* with the previously-granted calendar scope (that
// depends on Google/Microsoft's incremental-consent behavior, which we have
// not verified live). Requesting everything this app will ever need in one
// consent screen sidesteps that ambiguity entirely. Trade-off: a user who
// only wants calendar sync is also asked to grant file-read access up front
// — acceptable here (small, single-tenant back-office app, not a public
// SaaS under strict OAuth-scope-minimization review).
//
// Anyone who connected a provider BEFORE this constant existed only has the
// narrower calendar-only scope stored on their Account row. listDriveFiles
// (packages/core/src/file-picker) will get a 401/403 from the provider for
// them; the fix is reconnecting once via the same "เชื่อมต่อ" button (which
// now requests the union and overwrites the old narrower scope) — not a new
// "upgrade scope" code path.
export const CONNECT_OAUTH_SCOPES = {
  google: [...CALENDAR_OAUTH_SCOPES.google, ...FILE_OAUTH_SCOPES.google],
  microsoft: [...CALENDAR_OAUTH_SCOPES.microsoft, ...FILE_OAUTH_SCOPES.microsoft],
} as const;
