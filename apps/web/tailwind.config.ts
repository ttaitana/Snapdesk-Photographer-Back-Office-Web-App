import type { Config } from "tailwindcss";

// Color tokens map straight to the CSS variables defined in app/globals.css
// (light values in :root, dark overrides in .dark) — see SPEC.md §3.2.
// shadcn/ui semantic names (background, card, destructive, etc.) are kept
// as aliases on top of the spec's own token names (bg, surface, ink, ...)
// so both vocabularies work in components.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Spec tokens (SPEC.md §3.2)
        bg: "var(--bg)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        danger: "var(--danger)",
        success: "var(--success)",

        // shadcn/ui semantic aliases (resolve to spec tokens)
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "ui-sans-serif", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "sans-serif"],
      },
      boxShadow: {
        // "panel" hard-shadow look from SPEC.md §3.4
        hard: "4px 4px 0 0 var(--ink)",
        "hard-sm": "2px 2px 0 0 var(--ink)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
