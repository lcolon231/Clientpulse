import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/reports
 *
 * Invoked monthly by Vercel Cron. Generates and emails PDF health reports
 * for every active organisation.
 *
 * Security: protected by a shared CRON_SECRET that Vercel injects into the
 * Authorization header. Any request without it is rejected immediately.
 *
 * TODO: wire @react-pdf/renderer + Resend when ready.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.warn("Cron request rejected — invalid or missing authorization");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("Monthly report cron job started");

  let processed = 0;
  let errors = 0;

  try {
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true },
    });

    for (const org of organizations) {
      try {
        // TODO: generate PDF and dispatch via Resend.
        logger.info({ orgId: org.id, orgName: org.name }, "Report queued");
        processed++;
      } catch (err) {
        logger.error({ err, orgId: org.id }, "Failed to generate report for org");
        errors++;
      }
    }

    logger.info({ processed, errors }, "Monthly report cron job completed");
    return NextResponse.json({ ok: true, processed, errors });
  } catch (err) {
    logger.error({ err }, "Monthly report cron job failed — could not fetch organizations");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
