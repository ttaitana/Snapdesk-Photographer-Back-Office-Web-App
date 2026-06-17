"use client";

import { useState } from "react";

import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/**
 * Google/Microsoft buttons shared by login + register — Better Auth treats
 * sign-in and sign-up via OAuth as the same call (an unrecognized account
 * gets created automatically), so one component covers both pages.
 *
 * `googleEnabled`/`microsoftEnabled` come from the server (lib/env.ts's
 * `integrations` flags) rather than being checked client-side, since
 * lib/env.ts must never be imported into a "use client" file — see the
 * comment in lib/auth.ts.
 */
export function SocialAuthButtons({
  googleEnabled,
  microsoftEnabled,
  callbackURL = "/dashboard",
}: {
  googleEnabled: boolean;
  microsoftEnabled: boolean;
  /** Where Better Auth sends the browser back to after the OAuth round
   * trip. login-form.tsx passes the page's `?redirect=` target through here
   * so an unauthenticated visitor bounced from e.g. /invite/[id] lands back
   * there instead of /dashboard. */
  callbackURL?: string;
}) {
  const [pending, setPending] = useState<"google" | "microsoft" | null>(null);

  if (!googleEnabled && !microsoftEnabled) return null;

  async function handleSocial(provider: "google" | "microsoft") {
    setPending(provider);
    try {
      await signIn.social({ provider, callbackURL });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      {googleEnabled && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending !== null}
          onClick={() => handleSocial("google")}
        >
          {pending === "google" ? "กำลังเชื่อมต่อ..." : "เข้าสู่ระบบด้วย Google"}
        </Button>
      )}
      {microsoftEnabled && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending !== null}
          onClick={() => handleSocial("microsoft")}
        >
          {pending === "microsoft" ? "กำลังเชื่อมต่อ..." : "เข้าสู่ระบบด้วย Microsoft"}
        </Button>
      )}
      <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>หรือ</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
