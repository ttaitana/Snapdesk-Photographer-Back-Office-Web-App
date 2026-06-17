"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes has no "exports" map in package.json, so the subpath import
// "next-themes/dist/types" doesn't resolve under this project's
// moduleResolution (and the installed version's dist/index.d.ts doesn't
// re-export ThemeProviderProps anyway). Deriving the prop type straight from
// NextThemesProvider's own signature sidesteps both problems and stays
// correct across next-themes versions.
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * Light/dark/system theme, persisted across reloads.
 * `attribute="class"` toggles the `.dark` class consumed by app/globals.css.
 * SPEC.md §3 / §8 — "สลับ light/dark ได้ จำค่าไว้".
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
