// CalendarSync service — P9 Calendar Sync (F4).
//
// Unlike every other service in this package, calendar connections are a
// PERSONAL resource (Better Auth's Account + our own CalendarConnection are
// both keyed by userId, not teamId — SPEC.md F4: each photographer connects
// their own Google/Outlook account). So this module takes a bare `userId`
// instead of a `TeamContext` — there is no team-scoping question to ask.
// Every caller (a Server Action, or apps/worker's calendar-sync processor)
// must supply a `userId` it already trusts: a Server Action gets it from
// the signed-in session (see apps/web/lib/require-action-context.ts —
// `context.userId`, never client input); the worker gets it from the queue
// job payload, itself written by that same already-authenticated action at
// enqueue time (see @snapdesk/queue's CalendarSyncJobData).
//
// Deviation from the P8 pattern: shoot-reminder.ts calls Resend directly
// from apps/worker rather than through @snapdesk/core, because there's no
// shared concern to centralize (no token refresh, one provider). Calendar
// sync is exactly the opposite — two providers, both needing OAuth token
// refresh-and-retry — which is the user's own stated reason for creating
// packages/integrations as a separate package in this pass. So this module
// DOES depend on @snapdesk/integrations and DOES own the refresh-and-retry
// dance (see withFreshToken below), once, rather than duplicating it in
// both apps/web (Settings → Integrations) and apps/worker (the sync job).
//
// Credentials (GOOGLE_CLIENT_ID/SECRET, MS_CLIENT_ID/SECRET/MS_TENANT_ID)
// are never read from process.env in here — every exported function that
// talks to a provider takes a `CalendarSyncProviderConfig` argument, same
// convention as setDeliveryQr's `appUrl` and createAuth's `resend` config.

import { prisma, Prisma } from "@snapdesk/db";
import {
  calendarInfoSchema,
  providerStatusSchema,
  calendarConnectionSchema,
  saveCalendarSelectionInputSchema,
  type CalendarProvider,
  type CalendarInfo,
  type ProviderStatus,
  type CalendarConnection,
  type SaveCalendarSelectionInput,
  type CalendarEventIds,
} from "@snapdesk/types";
import {
  createGoogleCalendarClient,
  createOutlookCalendarClient,
  CalendarAuthError,
  CalendarApiError,
  type CalendarClient,
  type CalendarEventInput,
} from "@snapdesk/integrations";

export interface CalendarSyncProviderConfig {
  google?: { clientId: string; clientSecret: string };
  microsoft?: { clientId: string; clientSecret: string; tenantId?: string };
}

export class CalendarNotConnectedError extends Error {
  constructor(provider: CalendarProvider) {
    super(`ยังไม่ได้เชื่อมต่อ ${provider === "google" ? "Google" : "Outlook"} Calendar`);
    this.name = "CalendarNotConnectedError";
  }
}

/** Thrown when a provider is asked for but its clientId/clientSecret aren't
 * present in CalendarSyncProviderConfig — an app-config issue (missing env
 * vars), distinct from CalendarNotConnectedError (a per-user issue). Callers
 * should generally avoid hitting this by checking apps/web/lib/env.ts's
 * `integrations.google`/`integrations.microsoft` flags before even showing
 * a "Connect" button — see Task #10. */
export class ProviderNotConfiguredError extends Error {
  constructor(provider: CalendarProvider) {
    super(`${provider === "google" ? "Google" : "Outlook"} integration is not configured on this server`);
    this.name = "ProviderNotConfiguredError";
  }
}

function getCalendarClient(
  provider: CalendarProvider,
  providerConfig: CalendarSyncProviderConfig
): CalendarClient {
  if (provider === "google") {
    if (!providerConfig.google) throw new ProviderNotConfiguredError("google");
    return createGoogleCalendarClient(providerConfig.google);
  }
  if (!providerConfig.microsoft) throw new ProviderNotConfiguredError("microsoft");
  return createOutlookCalendarClient(providerConfig.microsoft);
}

/** Better Auth's Account.providerId values — "google" / "microsoft" — match
 * CalendarProvider exactly (see calendar.ts's comment in @snapdesk/types),
 * so no translation needed between the two. */
async function getAccount(userId: string, provider: CalendarProvider) {
  return prisma.account.findFirst({
    where: { userId, providerId: provider },
    select: { id: true, accessToken: true, refreshToken: true, accessTokenExpiresAt: true },
  });
}

/**
 * Runs `fn` with a valid access token for (userId, provider), refreshing
 * proactively if it's already expired and reactively (one retry) if `fn`
 * throws CalendarAuthError mid-call — covers both "we knew it was stale"
 * and "the provider rejected it anyway" (clock skew, early revocation).
 * Persists any refreshed token back to the Account row immediately, so a
 * later call in the same sync (e.g. one connection per calendar) reuses it
 * instead of refreshing again.
 *
 * Exported (not just used internally below) so packages/core/src/file-picker
 * can reuse it for Drive/OneDrive calls (P7, unblocked by this P9 work) —
 * `fn` is generic over what it does with the access token, it just happened
 * to only ever be called with calendar API methods until now. Refresh
 * itself is provider-credential-scoped, not API-scoped, so this is a safe
 * reuse: getCalendarClient(provider, providerConfig).refreshAccessToken is
 * the same OAuth-app client_id/secret/token-endpoint regardless of whether
 * the caller is about to list calendars or list Drive files with the result.
 */
export async function withFreshToken<T>(
  userId: string,
  provider: CalendarProvider,
  providerConfig: CalendarSyncProviderConfig,
  fn: (accessToken: string) => Promise<T>
): Promise<T> {
  const account = await getAccount(userId, provider);
  if (!account?.accessToken) throw new CalendarNotConnectedError(provider);

  const client = getCalendarClient(provider, providerConfig);

  let accessToken = account.accessToken;
  const isExpired = account.accessTokenExpiresAt ? account.accessTokenExpiresAt.getTime() < Date.now() + 60_000 : false;

  if (isExpired) {
    if (!account.refreshToken) throw new CalendarNotConnectedError(provider);
    accessToken = await refreshAndPersist(account.id, provider, client, account.refreshToken);
  }

  try {
    return await fn(accessToken);
  } catch (err) {
    if (!(err instanceof CalendarAuthError)) throw err;
    // Reactive path — token looked valid but the provider says otherwise.
    if (!account.refreshToken) throw err;
    accessToken = await refreshAndPersist(account.id, provider, client, account.refreshToken);
    return await fn(accessToken);
  }
}

async function refreshAndPersist(
  accountId: string,
  provider: CalendarProvider,
  client: CalendarClient,
  refreshToken: string
): Promise<string> {
  const refreshed = await client.refreshAccessToken(refreshToken);
  await prisma.account.update({
    where: { id: accountId },
    data: {
      accessToken: refreshed.accessToken,
      accessTokenExpiresAt: refreshed.expiresAt,
      // Only overwrite if the provider actually rotated it (Google usually
      // doesn't) — see RefreshedToken's comment in @snapdesk/integrations.
      ...(refreshed.refreshToken && { refreshToken: refreshed.refreshToken }),
    },
  });
  void provider; // kept for symmetry/future per-provider persistence quirks
  return refreshed.accessToken;
}

// ── User-facing: Settings → Integrations ───────────────────────────────────

/** Always returns both providers (even if google/microsoft aren't connected)
 * so the Settings page can render a row per provider with its own
 * connect/disconnect state — SPEC.md F4's "ยังไม่เชื่อมต่อ" degrade. */
export async function getProviderStatuses(userId: string): Promise<ProviderStatus[]> {
  const accounts = await prisma.account.findMany({
    where: { userId, providerId: { in: ["google", "microsoft"] } },
    select: { providerId: true },
  });
  const connected = new Set(accounts.map((a) => a.providerId));

  return (["google", "microsoft"] as const).map((provider) =>
    providerStatusSchema.parse({ provider, connected: connected.has(provider) })
  );
}

/** Calls the provider's "list calendars" API live — used to render the
 * picker before the user has saved any selection. Throws
 * CalendarNotConnectedError if this provider has no Account row yet. */
export async function listAvailableCalendars(
  userId: string,
  provider: CalendarProvider,
  providerConfig: CalendarSyncProviderConfig
): Promise<CalendarInfo[]> {
  const client = getCalendarClient(provider, providerConfig);
  const items = await withFreshToken(userId, provider, providerConfig, (token) =>
    client.listCalendars(token)
  );
  return items.map((item) => calendarInfoSchema.parse(item));
}

export async function getCalendarConnections(
  userId: string,
  provider?: CalendarProvider
): Promise<CalendarConnection[]> {
  const rows = await prisma.calendarConnection.findMany({
    where: { userId, ...(provider && { provider }) },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => calendarConnectionSchema.parse(row));
}

/**
 * Replaces the full set of selected calendars for one provider in a single
 * transaction — see SaveCalendarSelectionInput's comment in @snapdesk/types
 * for why this is a replace rather than a per-row toggle. Newly-added
 * calendars default to enabled:true.
 */
export async function replaceCalendarSelection(
  userId: string,
  input: SaveCalendarSelectionInput
): Promise<CalendarConnection[]> {
  const parsed = saveCalendarSelectionInputSchema.parse(input);
  const keepIds = parsed.calendars.map((c) => c.id);

  await prisma.$transaction([
    prisma.calendarConnection.deleteMany({
      where: { userId, provider: parsed.provider, calendarId: { notIn: keepIds } },
    }),
    ...parsed.calendars.map((calendar) =>
      prisma.calendarConnection.upsert({
        where: { userId_provider_calendarId: { userId, provider: parsed.provider, calendarId: calendar.id } },
        create: {
          userId,
          provider: parsed.provider,
          calendarId: calendar.id,
          calendarName: calendar.name,
          enabled: true,
        },
        update: { calendarName: calendar.name },
      })
    ),
  ]);

  return getCalendarConnections(userId, parsed.provider);
}

/**
 * Drops our own CalendarConnection rows for this provider. Does NOT call
 * Better Auth's `unlinkAccount` — packages/core must never import
 * @snapdesk/auth (see README.md's dependency-boundary rule). The caller
 * (apps/web's Settings → Integrations action, Task #10) must call both:
 * Better Auth's unlinkAccount client API first (so getProviderStatuses
 * flips back to connected:false), then this function (so stale calendar
 * selections don't linger for a provider the user just disconnected).
 */
export async function disconnectProvider(userId: string, provider: CalendarProvider): Promise<void> {
  await prisma.calendarConnection.deleteMany({ where: { userId, provider } });
}

// ── Worker-facing: unscoped, by design ──────────────────────────────────────
//
// apps/worker's calendar-sync processor is a trusted background process
// acting on a (jobId, userId) pair enqueued by an already-authorized Server
// Action (apps/web/app/jobs/actions.ts) — it has no session of its own.
// Never expose syncJobToCalendars or getJobForCalendarSync through a Server
// Action — same note as packages/core/src/delivery-qr's unscoped functions.

export interface CalendarSyncJobInfo {
  id: string;
  title: string;
  shootDate: Date | null;
  shootTime: string | null;
  locationName: string | null;
  locationUrl: string | null;
  customerName: string;
  calendarEventIds: CalendarEventIds | null;
}

export async function getJobForCalendarSync(jobId: string): Promise<CalendarSyncJobInfo | null> {
  const row = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      shootDate: true,
      shootTime: true,
      locationName: true,
      locationUrl: true,
      calendarEventIds: true,
      customer: { select: { name: true } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    shootDate: row.shootDate,
    shootTime: row.shootTime,
    locationName: row.locationName,
    locationUrl: row.locationUrl,
    customerName: row.customer.name,
    calendarEventIds: (row.calendarEventIds as CalendarEventIds | null) ?? null,
  };
}

function buildEventInput(job: CalendarSyncJobInfo): CalendarEventInput {
  // No explicit duration field on Job (TASKS.md/SPEC.md don't ask for one) —
  // default to a 2-hour block starting at shootTime, or 09:00 local if no
  // shootTime was set. Revisit if photographers report this doesn't match
  // typical shoot lengths.
  const date = job.shootDate as Date;
  const [hStr, mStr] = (job.shootTime ?? "09:00").split(":");
  // parseInt(undefined-as-"9"/"0", 10) always returns `number` (possibly
  // NaN for a malformed shootTime) — destructuring a split() array under
  // noUncheckedIndexedAccess would otherwise leave hStr/mStr typed as
  // `string | undefined`, which is what made `hours`/`minutes` themselves
  // `number | undefined` below; `Number.isFinite` doesn't narrow that away
  // since its signature is `(number: unknown) => boolean`, not a type
  // guard. Defaulting the strings before parseInt sidesteps both problems.
  const hours = parseInt(hStr ?? "9", 10);
  const minutes = parseInt(mStr ?? "0", 10);
  const start = new Date(date);
  start.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  return {
    title: `📷 ${job.title} (${job.customerName})`,
    location: job.locationName ?? job.locationUrl ?? undefined,
    start,
    end,
  };
}

/**
 * Pushes a job's create/update/delete to every enabled CalendarConnection
 * the job's triggering user has — "the token of whoever clicked the action"
 * (apps/web/app/jobs/actions.ts passes context.userId, never the job's
 * createdById, since createdById could differ from whoever's editing it).
 *
 * `eventIdsForDelete` is required for action:"delete" — by the time this
 * runs, deleteJob (packages/core/src/jobs) has already removed the Job row,
 * so there's nothing left in the DB to read calendarEventIds from. The
 * caller must snapshot Job.calendarEventIds *before* calling deleteJob and
 * pass it through the queue payload (see CalendarSyncJobData).
 */
export async function syncJobToCalendars(
  jobId: string,
  userId: string,
  action: "upsert" | "delete",
  providerConfig: CalendarSyncProviderConfig,
  eventIdsForDelete?: CalendarEventIds | null
): Promise<void> {
  const connections = (await getCalendarConnections(userId)).filter((c) => c.enabled);
  if (connections.length === 0) {
    // Graceful degrade — no provider connected, or none selected. Not a
    // failure: most jobs will hit this path for users who never opted in.
    return;
  }

  if (action === "delete") {
    if (!eventIdsForDelete) return;
    await deleteEvents(userId, connections, providerConfig, eventIdsForDelete);
    return;
  }

  const job = await getJobForCalendarSync(jobId);
  if (!job) {
    console.warn(`[calendar-sync] job ${jobId} no longer exists — skipping`);
    return;
  }

  if (!job.shootDate) {
    // shootDate was cleared after a previous sync already created events —
    // treat exactly like a delete, then forget the ids.
    if (job.calendarEventIds) {
      await deleteEvents(userId, connections, providerConfig, job.calendarEventIds);
      // Prisma's Json columns need the `Prisma.JsonNull` sentinel to write an
      // actual JSON `null`, not the plain JS `null` literal (which Prisma's
      // generated types reserve for "leave unset" on nullable Json fields).
      await prisma.job.update({
        where: { id: jobId },
        data: { calendarEventIds: Prisma.JsonNull },
      });
    }
    return;
  }

  const event = buildEventInput(job);
  const updatedEventIds: CalendarEventIds = { ...(job.calendarEventIds ?? {}) };
  const errors: unknown[] = [];

  for (const connection of connections) {
    const client = getCalendarClient(connection.provider, providerConfig);
    const existingEventId = updatedEventIds[connection.provider]?.[connection.calendarId];

    try {
      const result = await withFreshToken(userId, connection.provider, providerConfig, async (token) => {
        if (existingEventId) {
          try {
            return await client.updateEvent(token, connection.calendarId, existingEventId, event);
          } catch (err) {
            // Event was deleted/calendar changed on the provider side since
            // our last sync — fall back to creating a fresh one rather than
            // failing the whole sync over a stale id.
            if (err instanceof CalendarApiError && (err.status === 404 || err.status === 410)) {
              return await client.createEvent(token, connection.calendarId, event);
            }
            throw err;
          }
        }
        return await client.createEvent(token, connection.calendarId, event);
      });

      updatedEventIds[connection.provider] = {
        ...updatedEventIds[connection.provider],
        [connection.calendarId]: result.id,
      };
    } catch (err) {
      errors.push(err);
      console.error(
        `[calendar-sync] failed to sync job ${jobId} to ${connection.provider}/${connection.calendarId}:`,
        err
      );
    }
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { calendarEventIds: updatedEventIds as object },
  });

  // Let BullMQ's retry/backoff handle transient per-connection failures —
  // successfully-synced connections above already persisted, so a retry
  // only re-touches the ones that failed (updateEvent/createEvent are
  // idempotent from our side: worst case it overwrites with the same data).
  if (errors.length > 0) {
    throw new Error(`calendar-sync: ${errors.length} of ${connections.length} connection(s) failed for job ${jobId}`);
  }
}

async function deleteEvents(
  userId: string,
  connections: CalendarConnection[],
  providerConfig: CalendarSyncProviderConfig,
  eventIds: CalendarEventIds
): Promise<void> {
  const errors: unknown[] = [];

  for (const connection of connections) {
    const eventId = eventIds[connection.provider]?.[connection.calendarId];
    if (!eventId) continue;

    const client = getCalendarClient(connection.provider, providerConfig);
    try {
      await withFreshToken(userId, connection.provider, providerConfig, (token) =>
        client.deleteEvent(token, connection.calendarId, eventId)
      );
    } catch (err) {
      errors.push(err);
      console.error(
        `[calendar-sync] failed to delete event for ${connection.provider}/${connection.calendarId}:`,
        err
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`calendar-sync: ${errors.length} delete(s) failed`);
  }
}
