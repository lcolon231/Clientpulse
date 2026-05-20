import path from "node:path";

import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * Prisma 7 split connection configuration by concern:
 *
 *   datasource.url  — used by `prisma db push` and `prisma migrate`.
 *                     Must be a DIRECT (non-pooled) connection because
 *                     DDL statements and advisory locks don't survive
 *                     pgBouncer transaction mode.
 *                     → DIRECT_URL (port 5432)
 *
 *   PrismaClient    — configured separately in lib/db/prisma.ts via the
 *                     PrismaPg adapter, using the pgBouncer pooler URL.
 *                     → DATABASE_URL (port 6543)
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
