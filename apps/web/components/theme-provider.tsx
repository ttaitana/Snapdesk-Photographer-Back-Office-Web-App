"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";

/**
 * Light/dark/system theme, persisted across reloads.
 * `attribute="class"` toggles the `.dark` class consumed by app/globals.css.
 * SPEC.md §3 / §8 — "สลับ light/dark ได้ จำค่าไว้".
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
