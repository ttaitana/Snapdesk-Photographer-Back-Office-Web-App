import type { Metadata } from "next";

import { integrations } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ — Snapdesk" };

// Server component so it's safe to read lib/env.ts (integrations flags) —
// only the resulting booleans cross into the client form below, never the
// underlying env values. See social-auth-buttons.tsx for why.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return (
    <LoginForm
      googleEnabled={integrations.google}
      microsoftEnabled={integrations.microsoft}
      // middleware.ts sets ?redirect=<original path> when bouncing an
      // unauthenticated visitor here (e.g. from an /invite/[id] link) — send
      // them back there after a successful sign-in instead of /dashboard.
      redirectTo={redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard"}
    />
  );
}
