"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * TanStack Query setup — P2 Core Data Layer (TASKS.md: "data fetching ด้วย
 * TanStack Query + refetch on focus").
 *
 * `refetchOnWindowFocus: true` is the library default; set explicitly here
 * so it can't be silently changed later without someone noticing this
 * comment. `staleTime` is short (30s) rather than 0 — most pages here are
 * cheap team-scoped reads, not high-churn data, so a small stale window
 * avoids re-fetching on every tab switch while still feeling "live".
 *
 * One QueryClient per browser tab/session — created once via useState so it
 * survives re-renders but not page reloads, same pattern as ThemeProvider.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: true,
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
