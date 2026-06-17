import { z } from "zod";

/**
 * Single source of truth for runtime env vars — validated once at startup.
 * SPEC.md §6: "โหลด env ผ่าน config module เดียว ... ที่ validate ตอน startup".
 *
 * Only DATABASE_URL/APP_URL/NODE_ENV are required right now (P0). Everything
 * tied to a not-yet-built integration (Google/MS OAuth, Redis, storage) is
 * optional so the app still boots — features built on top of them must
 * gracefully degrade (show "ยังไม่ได้เชื่อมต่อ") rather than throw. See
 * SPEC.md §6 note and `integrations` below.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required — copy .env.example to .env and set it"),

  REDIS_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  MS_CLIENT_ID: z.string().optional(),
  MS_CLIENT_SECRET: z.string().optional(),
  MS_TENANT_ID: z.string().default("common"),

  STORAGE_BUCKET: z.string().optional(),
  STORAGE_KEY: z.string().optional(),
  STORAGE_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error(
      "❌ Invalid environment variables:\n",
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
    );
    throw new Error("Invalid environment variables — check .env against .env.example");
  }
  return parsed.data;
}

export const env = loadEnv();

/** Graceful-degrade flags for optional integrations (SPEC.md §6 note). */
export const integrations = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  microsoft: Boolean(env.MS_CLIENT_ID && env.MS_CLIENT_SECRET),
  redis: Boolean(env.REDIS_URL),
  storage: Boolean(env.STORAGE_BUCKET && env.STORAGE_KEY && env.STORAGE_SECRET),
} as const;
