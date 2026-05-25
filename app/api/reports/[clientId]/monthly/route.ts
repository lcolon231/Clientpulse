import { type NextRequest } from "next/server";

import { getAuthUser, getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { calculateHealth } from "@/lib/health/score";
import {
  generateMonthlyReportPDF,
  type DeviceRow,
} from "@/lib/pdf/monthly-report";
import type { HealthResult } from "@/lib/health/score";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Classify a single device into a health band based on patch age. */
function deviceBand(patchAgeDays: number): HealthResult["band"] {
  if (patchAgeDays <= 30) return "HEALTHY";
  if (patchAgeDays <= 90) return "AT_RISK";
  return "CRITICAL";
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// GET /api/reports/[clientId]/monthly
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  // Auth — return 401 instead of redirect (this is an API route).
  const authUser = await getAuthUser();
  if (!authUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  const dbUser = await getDbUser(authUser.id);
  if (!dbUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { clientId } = await params;

  // Fetch client — always scoped to the requesting user's org.
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: dbUser.organizationId },
    include: { devices: { orderBy: { hostname: "asc" } } },
  });

  if (!client) {
    return new Response("Not Found", { status: 404 });
  }

  // Compute health.
  const health = calculateHealth({
    deviceCount: client.devices.length,
    devices: client.devices.map((d) => ({
      patchAgeDays: d.patchAgeDays,
      lastSeen: d.lastSeen,
    })),
  });

  // Fetch audit logs for this client + its devices in the last 30 days.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const deviceIds = client.devices.map((d) => d.id);

  const rawLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: dbUser.organizationId,
      createdAt: { gte: thirtyDaysAgo },
      OR: [
        { entityType: "Client", entityId: clientId },
        ...(deviceIds.length > 0
          ? [{ entityType: "Device", entityId: { in: deviceIds } }]
          : []),
      ],
    },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Build date strings outside of the PDF renderer (no Intl inside renderer).
  const now = new Date();

  const devices: DeviceRow[] = client.devices.map((d) => ({
    hostname: d.hostname,
    type: d.type,
    osVersion: d.osVersion,
    patchAgeDays: d.patchAgeDays,
    band: deviceBand(d.patchAgeDays),
  }));

  const auditLogs = rawLogs.map((log) => ({
    action: log.action,
    createdAt: log.createdAt.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    userEmail: log.user?.email ?? null,
  }));

  // Generate PDF.
  const pdfBuffer = await generateMonthlyReportPDF({
    orgName: dbUser.organization.name,
    clientName: client.name,
    clientId: client.id,
    reportMonth: now.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    }),
    generatedDate: now.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    health,
    devices,
    auditLogs,
  });

  // Filename: report-acme-corp-2026-05.pdf
  const safeName = sanitizeFilename(client.name);
  const monthSlug = now.toISOString().slice(0, 7);
  const filename = `report-${safeName}-${monthSlug}.pdf`;

  // Buffer extends Uint8Array at runtime; the cast satisfies the Web Response type.
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
