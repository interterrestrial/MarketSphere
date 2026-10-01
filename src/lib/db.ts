import { PrismaClient } from "@prisma/client";

/**
 * Shared PrismaClient singleton.
 *
 * Next.js dev mode (and ts-node --watch) reloads modules frequently;
 * reusing a single client across reloads avoids exhausting database
 * connections. See: https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */
const globalForPrisma = globalThis as unknown & {
  prisma?: PrismaClient;
};

export const db: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = db;
}
