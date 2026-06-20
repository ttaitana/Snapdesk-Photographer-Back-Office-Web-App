// Microsoft Graph change-notification receiver — P8 "job: รับ/ประมวลผล
// webhook จาก Google/MS" (TASKS.md). See the longer status note in
// app/api/webhooks/google-calendar/route.ts — same caveat applies: no
// Microsoft OAuth/token storage or `subscriptions` resource exists yet
// (that's P9), so this can receive and queue but not yet sync anything.
//
// The validationToken handshake below IS a real, spec-correct piece of the
// Graph webhook contract (https://learn.microsoft.com/graph/webhooks) —
// worth having ready now since Graph performs this handshake the moment a
// subscription is created, with no OAuth involved on this side.
//
// Public on purpose (see middleware.ts PUBLIC_PATHS).

import { NextResponse, type NextRequest } from "next/server";
import { enqueueCalendarWebhook } from "@/lib/queue";

export async function POST(request: NextRequest) {
  const validationToken = request.nextUrl.searchParams.get("validationToken");
  if (validationToken !== null) {
    // Subscription-creation handshake: echo the token back as plain text
    // within ~10s (Graph's requirement) — no auth check, this query param
    // *is* the auth for this one request.
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Empty/non-JSON body — still ack so Graph doesn't retry forever.
  }

  await enqueueCalendarWebhook({
    provider: "microsoft",
    payload: body,
    receivedAt: new Date().toISOString(),
  });

  // Graph recommends 202 Accepted for change notifications.
  return new NextResponse(null, { status: 202 });
}
