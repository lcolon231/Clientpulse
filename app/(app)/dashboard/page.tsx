import Link from "next/link";
import { Users } from "lucide-react";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrgHealth } from "@/lib/health/calculate-client-health";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteModal } from "@/components/app/InviteModal";
import { HealthBadge } from "@/components/ui/health-badge";
import { TicketsOverTimeChart } from "@/components/app/dashboard/TicketsOverTimeChart";
import { DevicesByHealthChart } from "@/components/app/dashboard/DevicesByHealthChart";
import { SlaPerformanceChart } from "@/components/app/dashboard/SlaPerformanceChart";

export const metadata = {
  title: "Dashboard — ClientPulse",
};

const SLA_LABELS: Record<string, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
  ENTERPRISE: "Enterprise",
};

export default async function DashboardPage() {
  const { dbUser } = await requireAuth();
  const { organizationId } = dbUser;
  const isOwner = dbUser.role === "OWNER";

  const [clients, orgHealthMap, recentLogs, devices] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        slaTier: true,
        _count: { select: { devices: true } },
      },
      orderBy: { name: "asc" },
    }),
    getOrgHealth(organizationId),
    prisma.auditLog.findMany({
      where: {
        organizationId,
        createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.device.findMany({
      where: { client: { organizationId } },
      select: { patchAgeDays: true },
    }),
  ]);

  // --- Tickets over time: audit log events grouped by day (last 14 days) ---
  const auditCountByDay = new Map<string, number>();
  for (const log of recentLogs) {
    const key = log.createdAt.toISOString().slice(0, 10);
    auditCountByDay.set(key, (auditCountByDay.get(key) ?? 0) + 1);
  }
  const today = new Date();
  const ticketsChartData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: auditCountByDay.get(key) ?? 0,
    };
  });

  // --- Devices by health: classify by patch age bands matching the scoring engine ---
  let healthyCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;
  for (const d of devices) {
    if (d.patchAgeDays <= 30) healthyCount++;
    else if (d.patchAgeDays <= 90) atRiskCount++;
    else criticalCount++;
  }
  const deviceHealthData = [
    { band: "Healthy", count: healthyCount },
    { band: "At Risk", count: atRiskCount },
    { band: "Critical", count: criticalCount },
  ].filter((d) => d.count > 0);

  // --- SLA distribution: count clients per tier (derived from the already-fetched clients) ---
  const slaCounts = new Map<string, number>();
  for (const c of clients) {
    slaCounts.set(c.slaTier, (slaCounts.get(c.slaTier) ?? 0) + 1);
  }
  const slaChartData = [...slaCounts.entries()].map(([tier, count]) => ({
    tier: SLA_LABELS[tier] ?? tier,
    count,
  }));

  const hasClients = clients.length > 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {dbUser.organization.name}
          </p>
        </div>
        {isOwner && <InviteModal />}
      </div>

      {!hasClients ? (
        /* Empty state — no clients yet */
        <Card>
          <CardHeader>
            <CardTitle>No clients yet</CardTitle>
            <CardDescription>
              Add your first client to start monitoring their devices and health
              metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              render={<Link href="/clients" />}
              nativeButton={false}
              className="gap-1.5"
            >
              <Users className="h-4 w-4" />
              Go to Clients
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Client health cards */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Client Health
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {clients.map((client) => {
                const health = orgHealthMap.get(client.id);
                return (
                  <Link key={client.id} href={`/clients/${client.id}`}>
                    <Card className="cursor-pointer transition-colors hover:bg-muted/40">
                      <CardContent className="pb-4 pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {client.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {client._count.devices}{" "}
                              {client._count.devices === 1
                                ? "device"
                                : "devices"}
                            </p>
                          </div>
                          {health && <HealthBadge health={health} />}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Charts row 1: activity + devices by health */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TicketsOverTimeChart data={ticketsChartData} />
            </div>
            <DevicesByHealthChart data={deviceHealthData} />
          </div>

          {/* Charts row 2: SLA distribution */}
          <SlaPerformanceChart data={slaChartData} />
        </>
      )}
    </div>
  );
}
