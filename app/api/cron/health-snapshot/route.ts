import { type NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { calculateHealth } from "@/lib/health/score";

// ---------------------------------------------------------------------------
// Admin job — service-role boundary
// ---------------------------------------------------------------------------
// This cron endpoint deliberately crosses org boundaries: it iterates ALL
// clients across ALL orgs to snapshot their health scores. This is an explicit
// admin operation, not a tenant-scoped request. The Prisma client used here
// runs as the postgres superuser (bypassing RLS), which is appropriate for a
// scheduled background job. Do NOT use this pattern in user-facing routes.
// ---------------------------------------------------------------------------

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Vercel sends Authorization: Bearer <CRON_SECRET> on scheduled invocations.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  // Normalise to midnight UTC so the date column stores the same value
  // regardless of when during the day the cron fires.
  today.setUTCHours(0, 0, 0, 0);

  // Single query: all clients across all orgs with only the fields the scoring
  // engine needs — no over-fetching.
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      organizationId: true,
      devices: {
        select: { patchAgeDays: true, lastSeen: true },
      },
    },
  });

  let upserted = 0;

  for (const client of clients) {
    const health = calculateHealth({
      deviceCount: client.devices.length,
      devices: client.devices.map((d) => ({
        patchAgeDays: d.patchAgeDays,
        lastSeen: d.lastSeen,
      })),
    });

    const patchComp = health.components.find(
      (c) => c.name === "Patch Freshness",
    );
    const coverageComp = health.components.find(
      (c) => c.name === "Device Coverage",
    );

    // Upsert: re-running on the same day overwrites, never duplicates.
    await prisma.healthSnapshot.upsert({
      where: { clientId_date: { clientId: client.id, date: today } },
      create: {
        clientId: client.id,
        organizationId: client.organizationId,
        date: today,
        score: health.score,
        band: health.band,
        patchScore: patchComp?.score ?? null,
        coverageScore: coverageComp?.score ?? null,
      },
      update: {
        score: health.score,
        band: health.band,
        patchScore: patchComp?.score ?? null,
        coverageScore: coverageComp?.score ?? null,
      },
    });

    upserted++;
  }

  return NextResponse.json({ ok: true, upserted, date: today.toISOString() });
}
