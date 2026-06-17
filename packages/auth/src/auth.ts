import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";

import { prisma } from "@snapdesk/db";

import { sendTeamInviteEmail } from "./email/invite-email";

/**
 * Everything this package needs, handed in by the caller (apps/web) —
 * packages/auth never reads `process.env` directly. See README.md.
 */
export interface CreateAuthConfig {
  /** `openssl rand -base64 32` — used to sign sessions/cookies. */
  secret: string;
  /** e.g. http://localhost:3000 in dev. */
  baseURL: string;
  google?: { clientId: string; clientSecret: string };
  microsoft?: { clientId: string; clientSecret: string; tenantId?: string };
  /** Resend credentials for team-invite emails — required (P1: "wire up
   * real email sending now", not link-only). */
  resend: { apiKey: string; emailFrom: string };
}

export function createAuth(config: CreateAuthConfig) {
  return betterAuth({
    secret: config.secret,
    baseURL: config.baseURL,

    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),

    // Email + password (Credentials provider equivalent). Better Auth hashes
    // with scrypt by default and never lets a plaintext password reach the
    // Account.password column — see that column's comment in schema.prisma
    // for why we kept the default hasher instead of forcing bcrypt/argon2.
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },

    socialProviders: {
      ...(config.google && {
        google: {
          clientId: config.google.clientId,
          clientSecret: config.google.clientSecret,
        },
      }),
      ...(config.microsoft && {
        microsoft: {
          clientId: config.microsoft.clientId,
          clientSecret: config.microsoft.clientSecret,
          tenantId: config.microsoft.tenantId ?? "common",
        },
      }),
    },

    user: {
      additionalFields: {
        // App-level preference (light/dark/system) — not part of Better
        // Auth's default user schema. Mirrors ThemeMode in @snapdesk/types.
        theme: {
          type: "string",
          required: false,
          defaultValue: "system",
          input: true,
        },
      },
    },

    // Every new user gets a personal team automatically, no matter how they
    // signed up. The first attempt at this (see register-form.tsx history)
    // only ran organizationApi.create() client-side after signUp.email(),
    // which silently skipped OAuth signups (social-auth-buttons.tsx calls
    // signIn.social() directly and never goes through that code). These two
    // hooks run server-side for every signup method, so they're the single
    // source of truth now — register-form.tsx no longer creates a team
    // itself, it just signs up and redirects.
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              await prisma.team.create({
                data: {
                  name: `ทีมของ ${user.name || user.email}`,
                  slug: `team-${user.id.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`,
                  members: {
                    create: {
                      userId: user.id,
                      role: "owner",
                    },
                  },
                },
              });
            } catch (err) {
              // Don't fail signup over this — worst case the user lands on
              // /dashboard?error=no-team and support can fix it up manually.
              console.error("[auth] failed to auto-create personal team for user", user.id, err);
            }
          },
        },
      },
      session: {
        create: {
          // Newly created team has no session yet (user.create fires before
          // any session exists), so it can't rely on organization.create()'s
          // own "becomes active org" behavior — set activeOrganizationId
          // explicitly here, for every session creation (i.e. every login),
          // not just the first one, in case it was ever unset.
          before: async (session) => {
            if (session.activeOrganizationId) {
              return { data: session };
            }
            const membership = await prisma.teamMember.findFirst({
              where: { userId: session.userId },
              orderBy: { createdAt: "asc" },
            });
            return {
              data: {
                ...session,
                activeOrganizationId: membership?.organizationId ?? session.activeOrganizationId,
              },
            };
          },
        },
      },
    },

    plugins: [
      organization({
        // Model renames only — field names inside these tables stay as
        // Better Auth's defaults (organizationId, logo, status, inviterId);
        // see the naming note in packages/db/prisma/schema.prisma and
        // team-mapping.ts, which is the only place that translates them.
        schema: {
          organization: {
            modelName: "Team",
            additionalFields: {
              businessName: { type: "string", required: false, input: true },
              taxId: { type: "string", required: false, input: true },
            },
          },
          member: {
            modelName: "TeamMember",
          },
          invitation: {
            modelName: "TeamInvite",
          },
        },

        // The user who creates a team becomes its "owner" (lowercase — see
        // naming note #2 in schema.prisma).
        creatorRole: "owner",

        invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days — matches TASKS.md "gen token + หมดอายุ"

        async sendInvitationEmail(data) {
          await sendTeamInviteEmail({
            resendApiKey: config.resend.apiKey,
            emailFrom: config.resend.emailFrom,
            to: data.email,
            teamName: data.organization.name,
            inviterName: data.inviter.user.name,
            role: data.role,
            inviteId: data.id,
            baseURL: config.baseURL,
          });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
