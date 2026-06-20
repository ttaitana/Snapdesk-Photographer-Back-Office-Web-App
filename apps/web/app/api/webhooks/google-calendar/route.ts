// Google Calendar push-notification receiver — P8 "job: รับ/ประมวลผล webhook
// จาก Google/MS" (TASKS.md).
//
// ── Honest status (decided with the user via AskUserQuestion before
// building this) ── There is no Google Calendar OAuth, no stored
// access/refresh token, and no `calendar.events.watch()` channel
// subscription anywhere in this codebase yet — all of that is P9 (Calendar
// Sync). So this endpoint can receive and queue a notification, but
// apps/worker/src/jobs/calendar-webhook.ts can't actually *do* anything
// with it yet (no Job ↔ calendarEventId mapping exists to act on). It's
// built now so: (1) the queue/worker plumbing is exercised end-to-end, and
// (2) P9 has a real endpoint to register with Google instead of building
// this from scratch later.
//
// Public on purpose (see middleware.ts PUBLIC_PATHS) — Google calls this
// with no session/cookie. Channel-token verification (X-Goog-Channel-Token)
// is skipped because there's no subscription yet to have set a token on;
// add that check in P9 alongside calendar.events.watch().

import { NextResponse, type NextRequest } from "next/server";
import { enqueueCalendarWebhook } from "@/lib/queue";

export async function POST(request: NextRequest) {
  await enqueueCalendarWebhook({
    provider: "google",
    payload: {
      channelId: request.headers.get("x-goog-channel-id"),
      resourceState: request.headers.get("x-goog-resource-state"),
      resourceId: request.headers.get("x-goog-resource-id"),
      resourceUri: request.headers.get("x-goog-resource-uri"),
      messageNumber: request.headers.get("x-goog-message-number"),
    },
    receivedAt: new Date().toISOString(),
  });

  // Google just needs a prompt 200 — no particular body expected.
  return new NextResponse(null, { status: 200 });
}
