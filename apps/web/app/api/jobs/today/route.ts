// GET /api/jobs/today — P10 PWA offline support (TASKS.md: "ดูคิวงานวันนี้แบบ offline").
//
// listJobsAction (app/jobs/actions.ts) is a Server Action — those are POSTs
// to the current route with framework-internal headers, which the service
// worker can't address as a stable, cacheable URL. This route exposes the
// same "today" slice as a plain GET so sw.js can runtime-cache it
// (stale-while-revalidate) and the /offline page can read the cached copy
// when there's no network. Auth/team-scoping mirrors requireActionContext —
// just done inline since Server Actions can't be called from a route GET.

import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { requireTeamContext } from "@snapdesk/core";
import { listJobs } from "@snapdesk/core";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const context = await requireTeamContext({
    userId: session.user.id,
    activeTeamId: session.session.activeOrganizationId,
  }).catch(() => null);

  if (!context) {
    return NextResponse.json({ error: "no-team" }, { status: 404 });
  }

  const jobs = await listJobs(context, { range: "today" });

  // Trimmed shape — only what the offline view renders. Keeps the cached
  // payload small and avoids leaking fields the offline page doesn't need.
  const today = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    shootTime: job.shootTime,
    status: job.status,
    totalPrice: job.totalPrice,
  }));

  return NextResponse.json(
    { jobs: today, cachedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
