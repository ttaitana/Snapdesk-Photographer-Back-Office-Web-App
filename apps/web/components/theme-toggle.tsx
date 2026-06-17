"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const MODES = ["light", "dark", "system"] as const;
type Mode = (typeof MODES)[number];

const ICONS: Record<Mode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<Mode, string> = {
  light: "โหมดสว่าง",
  dark: "โหมดมืด",
  system: "ตามระบบ",
};

/** Cycles light -> dark -> system -> light. Next click always predictable. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const current: Mode = mounted ? ((theme as Mode) ?? "system") : "system";
  const Icon = ICONS[current];

  function cycle() {
    const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
    setTheme(next);
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={cycle}
      aria-label={`สลับธีม (ตอนนี้: ${LABELS[current]})`}
      title={LABELS[current]}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
