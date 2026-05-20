import "server-only";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 7 uses driver adapters instead of the built-in engine for database
 * connections. PrismaPg wraps the `pg` Pool and passes queries through to
 * Postgres — same wire protocol, just managed externally so Prisma isn't
 * bundling its own Rust query engine binary.
 *
 * DATABASE_URL points at Supabase's transaction-mode pgBouncer (port 6543).
 * pgBouncer proxies connections so we don't exhaust Postgres's connection
 * limit — critical for serverless environments where each lambda invocation
 * would otherwise open its own connection.
 *
 * Why the singleton pattern matters here:
 * Next.js dev mode uses Hot Module Replacement — when you save a file, the
 * changed module (and anything that imports it) is re-executed. Without this
 * guard, every file save would call new PrismaClient(), creating a new Pool
 * and connection. Postgres has a hard cap on concurrent connections; you'd
 * hit it within minutes of starting the dev server.
 *
 * Fix: attach the client to `globalThis`, which is NOT subject to HMR.
 * On the first save the module runs and creates the client. On subsequent
 * saves the module re-runs but finds the existing client on globalThis and
 * reuses it. In production there is no HMR so we skip the globalThis write
 * and let the module-level singleton do its job normally.
 */

function makePrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "stdout", level: "query" },
            { emit: "stdout", level: "warn" },
            { emit: "stdout", level: "error" },
          ]
        : [{ emit: "stdout", level: "error" }],
  });
}

type PrismaClientSingleton = ReturnType<typeof makePrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? makePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
