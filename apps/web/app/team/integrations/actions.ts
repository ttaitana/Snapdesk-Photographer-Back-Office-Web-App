"use server";

// Server Actions for Settings → Integrations — P9 Calendar Sync (F4).
// Personal resource (userId-scoped, not team-scoped) — see requireUserId's
// comment in lib/require-action-context.ts and the file header of
// @snapdesk/core's calendar-sync module for why this differs from every
// other actions.ts in this app.

import { headers } from "next/headers";

import {
  disconnectProvider as disconnectProviderService,
  replaceCalendarSelection as replaceCalendarSelectionService,
} from "@snapdesk/core";
import type { CalendarProvider, CalendarConnection, SaveCalendarSelectionInput } from "@snapdesk/types";

import { requireUserId } from "@/lib/require-action-context";
import { auth } from "@/lib/auth";

/**
 * Drops our CalendarConnection rows first, then asks Better Auth to unlink
 * the underlying OAuth Account — in that order, so even if the unlink call
 * fails below, syncJobToCalendars has already stopped using this provider
 * (see disconnectProvider's doc comment in @snapdesk/core for why this
 * function never calls unlinkAccount itself).
 *
 * unlinkAccount throws if this is the user's *only* linked Account (Better
 * Auth's own safety net against locking yourself out — see
 * FAILED_TO_UNLINK_LAST_ACCOUNT in better-auth's account.mjs). That's not a
 * failure worth surfacing as an error here: calendar sync is already
 * stopped either way, the user just keeps using this provider to log in.
 * `unlinkedAccount: false` lets the UI explain that distinction instead of
 * showing a generic error.
 *
 * NOTE — auth.api.unlinkAccount's exact call shape ({ body: { providerId },
 * headers }) is inferred from better-auth's own zod schema for the
 * /unlink-account endpoint (verified by reading
 * node_modules/better-auth/dist/api/routes/account.mjs in this environment,
 * not from network-fetched docs) — re-check against the installed
 * better-auth version if this ever starts throwing a validation error.
 */
export async function disconnectProviderAction(
  provider: CalendarProvider
): Promise<{ unlinkedAccount: boolean }> {
  const userId = await requireUserId();

  await disconnectProviderService(userId, provider);

  try {
    await auth.api.unlinkAccount({
      body: { providerId: provider },
      headers: await headers(),
    });
    return { unlinkedAccount: true };
  } catch (err) {
    console.warn(
      `[integrations] could not unlink ${provider} account (calendar sync was already stopped):`,
      err
    );
    return { unlinkedAccount: false };
  }
}

export async function saveCalendarSelectionAction(
  input: SaveCalendarSelectionInput
): Promise<CalendarConnection[]> {
  const userId = await requireUserId();
  return replaceCalendarSelectionService(userId, input);
}
