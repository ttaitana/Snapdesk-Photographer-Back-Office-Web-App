"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js — P10 PWA (TASKS.md). Mounted once in the root
 * layout so it runs on every page, not just /dashboard. Renders nothing;
 * registration failures (unsupported browser, dev HTTP without localhost,
 * etc.) are swallowed since the app must work identically without a service
 * worker — offline support is a bonus, never a requirement.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No-op — see file header.
    });
  }, []);

  return null;
}
