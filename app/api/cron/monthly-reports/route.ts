import { type NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { serverEnv, clientEnv } from "@/lib/env";
import { calculateHealth } from "@/lib/health/score";
import { resend } from "@/lib/resend";
import {
  generateMonthlyReportPDF,
  type DeviceRow,
} from "@/lib/pdf/monthly-report";
import { checkAndSendAlerts } from "@/lib/alerts/check-alerts";
import type { HealthResult } from "@/lib/health/score";

// Vercel cron jobs can run up to 60 s on Hobby, 300 s on Pro.
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Helpers (duplicated from the report route to keep this file self-contained)
// ---------------------------------------------------------------------------

function deviceBand(patchAgeDays: number): HealthResult["band"] {
  if (patchAgeDays <= 30) return "HEALTHY";
  if (patchAgeDays <= 90) return "AT_RISK";
  return "CRITICAL";
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// POST /api/cron/monthly-reports
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // --- Auth: verify CRON_SECRET ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const reportMonth = now.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const generatedDate = now.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const monthSlug = now.toISOString().slice(0, 7);

  const reportErrors: string[] = [];
  let reportsSent = 0;

  // --- Pass 1: Monthly PDF reports ---
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      users: {
        where: { role: "OWNER" },
        select: { email: true },
        take: 1,
      },
      clients: { select: { id: true, name: true } },
    },
  });

  for (const org of orgs) {
    const ownerEmail = org.users[0]?.email;
    if (!ownerEmail) continue;

    for (const clientStub of org.clients) {
      try {
        // Fetch full client data with devices.
        const client = await prisma.client.findUnique({
          where: { id: clientStub.id },
          include: { devices: { orderBy: { hostname: "asc" } } },
        });
        if (!client) continue;

        // Health.
        const health = calculateHealth({
          deviceCount: client.devices.length,
          devices: client.devices.map((d) => ({
            patchAgeDays: d.patchAgeDays,
            lastSeen: d.lastSeen,
          })),
        });

        // Audit logs.
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
        const deviceIds = client.devices.map((d) => d.id);

        const rawLogs = await prisma.auditLog.findMany({
          where: {
            organizationId: org.id,
            createdAt: { gte: thirtyDaysAgo },
            OR: [
              { entityType: "Client", entityId: client.id },
              ...(deviceIds.length > 0
                ? [{ entityType: "Device", entityId: { in: deviceIds } }]
                : []),
            ],
          },
          include: { user: { select: { email: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        });

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
          orgName: org.name,
          clientName: client.name,
          clientId: client.id,
          reportMonth,
          generatedDate,
          health,
          devices,
          auditLogs,
        });

        const safeName = sanitizeFilename(client.name);
        const filename = `report-${safeName}-${monthSlug}.pdf`;
        const clientUrl = `${clientEnv.NEXT_PUBLIC_SITE_URL}/clients/${client.id}`;

        // Send email with PDF attachment.
        await resend.emails.send({
          from: "ClientPulse <reports@clientpulse.app>",
          to: ownerEmail,
          subject: `ClientPulse Monthly Report — ${client.name} — ${reportMonth}`,
          html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;">
  <h2 style="margin-top:0;">Monthly Health Report</h2>
  <p>Hi,</p>
  <p>Attached is the monthly health report for <strong>${client.name}</strong>.</p>
  <p>Log in to ClientPulse to view live data and take action on any alerts.</p>
  <p>
    <a href="${clientUrl}"
       style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;
              text-decoration:none;border-radius:6px;font-weight:bold;">
      View Dashboard →
    </a>
  </p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;" />
  <p style="font-size:12px;color:#94a3b8;">
    This report was generated automatically by ClientPulse for ${org.name}.
  </p>
</body>
</html>`,
          attachments: [
            {
              filename,
              content: pdfBuffer.toString("base64"),
            },
          ],
        });

        reportsSent++;
      } catch (err) {
        const msg = `Report for client ${clientStub.id} (${clientStub.name}) in org ${org.id}: ${String(err)}`;
        reportErrors.push(msg);
        console.error("[cron/monthly-reports]", msg);
      }
    }
  }

  // --- Pass 2: Threshold-based alerts ---
  const { sent: alertsSent, errors: alertErrors } =
    await checkAndSendAlerts();

  // --- Summary ---
  console.log(
    `[cron/monthly-reports] reports=${reportsSent} reportErrors=${reportErrors.length} alerts=${alertsSent} alertErrors=${alertErrors.length}`,
  );

  return Response.json({
    ok: true,
    reportsSent,
    alertsSent,
    errors: [...reportErrors, ...alertErrors],
  });
}
