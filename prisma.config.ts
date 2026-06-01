import path from "node:path";

import { config as loadEnv } from "dotenv";
import type { PrismaConfig } from "prisma";

// Prisma's CLI does not auto-load .env files the way Next.js does.
// We load .env.local explicitly so DATABASE_URL and DIRECT_URL are available
// when running `prisma db push`, `prisma migrate`, `prisma studio`, etc.
loadEnv({ path: ".env.local" });

// `prisma generate` only reads the schema to emit TS types — no DB connection
// is made. Skip the URL guard so CI can run generate without DB secrets.
const isGenerate = process.argv.includes("generate");

if (!isGenerate) {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Check that .env.local exists and contains DATABASE_URL.",
    );
  }

  if (!process.env.DIRECT_URL) {
    throw new Error(
      "DIRECT_URL is not set. Check that .env.local exists and contains DIRECT_URL.",
    );
  }
}

export default {
  schema: path.join("prisma", "schema.prisma"),
  ...(process.env.DIRECT_URL && {
    datasource: {
      // DIRECT_URL — non-pooled connection (port 5432).
      // Required for db push / migrate: DDL statements and advisory locks
      // don't survive pgBouncer transaction mode (port 6543).
      url: process.env.DIRECT_URL,
    },
  }),
} satisfies PrismaConfig;
