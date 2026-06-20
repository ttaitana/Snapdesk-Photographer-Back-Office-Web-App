import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { z } from "zod";

// Unlike apps/web (Next.js auto-loads .env from the app's own directory),
// apps/worker is a plain tsx process with nothing loading .env for it. This
// repo keeps one root-level .env (see .env.example, and turbo.json's
// globalDependencies: [".env"]) shared by every app/package, so load that
// same file explicitly rather than expecting a second copy in apps/worker/.
const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(__dirname, "../../../.env") });

/**
 * apps/worker's own env validation — same "validate once at startup"
 * convention as apps/web/lib/env.ts (SPEC.md §6), but a separate module
 * rather than a shared one: apps/worker and apps/web are separate deployable
 * processes (SPEC.md §7) and apps can't import from other apps, only from
 * packages/*. Required/optional split is also different from web's: REDIS_URL
 * is required here (the worker's only reason to exist is consuming queues —
 * it can't gracefully degrade the way a web request can), while RESEND_API_KEY
 * stays optional (the reminder job degrades — see jobs/shoot-reminder.ts).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required — @snapdesk/db's Prisma client reads it from process.env"),
  REDIS_URL: z
    .string()
    .min(1, "REDIS_URL is required for apps/worker — without it there are no queues to consume"),

  APP_URL: z.string().url().default("http://localhost:3000"),

  // Reuses the same Resend account as packages/auth/src/email/invite-email.ts
  // (team invites) — see jobs/shoot-reminder.ts for the degrade behavior
  // when this isn't set.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Snapdesk <onboarding@resend.dev>"),

  // P9 — Calendar Sync. Same vars as apps/web/lib/env.ts (both processes
  // need their own copy of these credentials: apps/web to call
  // listAvailableCalendars from the Settings page, apps/worker to call
  // syncJobToCalendars from jobs/calendar-sync.ts). Optional — see
  // calendarSyncProviderConfig below for the matching degrade behavior.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MS_CLIENT_ID: z.string().optional(),
  MS_CLIENT_SECRET: z.string().optional(),
  MS_TENANT_ID: z.string().default("common"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables for apps/worker:\n",
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
    );
    throw new Error("Invalid environment variables — check .env against .env.example");
  }
  return parsed.data;
}

export const env = loadEnv();

/** Built once at startup, passed into every syncJobToCalendars call —
 * see packages/core/src/calendar-sync's CalendarSyncProviderConfig. A
 * provider left undefined here means jobs/calendar-sync.ts's call into
 * @snapdesk/core will throw ProviderNotConfiguredError if it ever actually
 * needs that provider, but in practice it won't: a user can't have an
 * enabled CalendarConnection for a provider whose env vars were never set,
 * since apps/web's Settings page (Task #10) hides connect buttons for
 * providers where `integrations.google`/`integrations.microsoft` is false. */
export const calendarSyncProviderConfig = {
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : {}),
  ...(env.MS_CLIENT_ID && env.MS_CLIENT_SECRET
    ? {
        microsoft: {
          clientId: env.MS_CLIENT_ID,
          clientSecret: env.MS_CLIENT_SECRET,
          tenantId: env.MS_TENANT_ID,
        },
      }
    : {}),
};
