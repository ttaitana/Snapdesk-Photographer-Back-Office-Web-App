// Root ESLint flat config — replaces the old .eslintrc.cjs now that ESLint 8
// (EOL Oct 2024) is gone in favor of ESLint 10's flat-config-only system.
//
// Flat config only ever loads ONE config file: the nearest eslint.config.*
// to the linted directory. packages/core, packages/types, and packages/db
// have no config of their own, so running `eslint .` inside any of them
// walks up and loads *this* file — that's how the dependency-boundary rule
// below reaches every package. apps/web has its own eslint.config.mjs (see
// that file) because it additionally needs Next's core-web-vitals rules.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import prettierConfig from "eslint-config-prettier";

/**
 * Enforces TASKS.md P0: "core ห้าม import จาก apps/*". packages/core,
 * packages/types, and packages/db are the domain/shared layer and must stay
 * framework-agnostic — apps/web goes through @snapdesk/core, never the other
 * way around. See packages/core/README.md.
 */
const dependencyBoundary = {
  files: ["packages/**/*.{ts,tsx}"],
  plugins: { import: importPlugin },
  settings: {
    // No explicit `project` path: each package's `lint` script runs
    // `eslint .` with that package as cwd, so a relative tsconfig path only
    // resolves correctly from the repo root. Omitting `project` lets the
    // resolver auto-discover the nearest tsconfig.json per linted file.
    "import/resolver": {
      typescript: { alwaysTryTypes: true },
    },
  },
  rules: {
    "import/no-restricted-paths": [
      "error",
      {
        zones: [
          {
            target: "./packages/core",
            from: "./apps",
            message:
              "packages/core is the domain/service layer and must never import from apps/* — see packages/core/README.md.",
          },
          {
            target: "./packages/types",
            from: "./apps",
            message: "packages/types must stay framework-agnostic — it must never import from apps/*.",
          },
          {
            target: "./packages/db",
            from: "./apps",
            message:
              "packages/db must never import from apps/* — apps/web should go through @snapdesk/core, not query Prisma directly.",
          },
        ],
      },
    ],
  },
};

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/dist/**",
      "**/generated/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  dependencyBoundary,
  prettierConfig,
);
