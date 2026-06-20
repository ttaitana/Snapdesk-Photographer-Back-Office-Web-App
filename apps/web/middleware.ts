import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic auth gate — checks for the presence of a session cookie only
 * (no DB round trip), per Better Auth's own recommended middleware pattern:
 * https://better-auth.com — Next.js middleware runs on the Edge runtime,
 * which can't load Prisma, so this can't call auth.api.getSession() the way
 * app/dashboard/page.tsx does. A forged/expired-but-present cookie would
 * pass this check; pages still must verify the real session themselves
 * (see DashboardPage) — this middleware only prevents the common case of
 * an obviously-logged-out visitor reaching a protected URL.
 *
 * Add new public routes to PUBLIC_PATHS as they're built. /invite/[id]
 * (task #23) is deliberately NOT here — accepting/viewing an invitation
 * requires a logged-in session per Better Auth's organization plugin docs,
 * so an unauthenticated visitor is correctly bounced to /login first; the
 * ?redirect= param this sets sends them straight back afterwards.
 *
 * /api/qr (P8) and /api/webhooks (P8) ARE here deliberately — the former is
 * hit by customers scanning a QR with no session, the latter by Google/MS
 * servers with no cookie at all. Without this, both would 302 to /login and
 * silently break (a customer gets bounced to a login page instead of their
 * files; a webhook provider gets an HTML redirect instead of a 200/202 and
 * treats it as a delivery failure).
 *
 * /offline (P10 PWA, TASKS.md) is here for a similar reason: sw.js's
 * navigation fallback serves this page straight from the Cache API when the
 * network is unreachable, which never reaches this middleware at all — but
 * if a visitor hits the URL directly while online (or a stale tab reloads
 * it), it shouldn't bounce them to /login first. The page itself has no
 * secrets; it only re-displays whatever /api/jobs/today already returned
 * (and that route IS still session-gated) before the connection dropped.
 */
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/logout",
  "/api/auth",
  "/api/qr",
  "/api/webhooks",
  "/offline",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets and Next internals; everything else goes through the
  // gate above (including app/page.tsx, but isPublicPath("/") covers that).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
