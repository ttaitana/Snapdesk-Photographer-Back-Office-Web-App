import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient — avoids exhausting Postgres connections from
 * Next.js dev-mode hot reload (each module reload would otherwise create
 * a fresh client). Standard pattern from Prisma's Next.js guide.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
