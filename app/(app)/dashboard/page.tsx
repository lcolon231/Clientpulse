import Link from "next/link";
import { Users, AlertTriangleIcon } from "lucide-react";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrgHealth } from "@/lib/health/calculate-client-health";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteModal } from "@/components/app/InviteModal";
import { HealthBadge } from "@/components/ui/health-badge";
import { TicketsOverTimeChart } from "@/components/app/dashboard/TicketsOverTimeChart";
import { DevicesByHealthChart } from "@/components/app/dashboard/DevicesByHealthChart";
import { SlaPerformanceChart } from "@/components/app/dashboard/SlaPerformanceChart";
import { OPEN_TICKET_STATUSES } from "@/types/ticket";

export const metadata = {
  title: "Dashboard — ClientPulse",
};

const SLA_LABELS: Record<string, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
  ENTERPRISE: "Enterprise",
};

function getRecentTicketCutoff() {
  return new Date(Date.now() - 14 * 86_400_000);
}

export default async function DashboardPage() {
  const { dbUser } = await requireAuth();
  const { organizationId } = dbUser;
  const isOwner = dbUser.role === "OWNER";
  const recentTicketCutoff = getRecentTicketCutoff();

  const [clients, orgHealthMap, recentTickets, devices, deviceCount, openTicketCount, perClientOpenTickets] =
    await Promise.all([
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
      // Chart: tickets created in the last 14 days (native + PSA), keyed by createdAt
      prisma.ticket.findMany({
        where: {
          organizationId,
          createdAt: { gte: recentTicketCutoff },
        },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.device.findMany({
        where: { client: { organizationId } },
        select: { patchAgeDays: true },
      }),
      prisma.device.count({ where: { client: { organizationId } } }),
      prisma.ticket.count({
        where: {
          organizationId,
          status: { in: OPEN_TICKET_STATUSES },
        },
      }),
      // Per-client open ticket counts for badge display
      prisma.ticket.findMany({
        where: {
          organizationId,
          clientId: { not: null },
          status: { in: OPEN_TICKET_STATUSES },
        },
        select: { clientId: true },
      }),
    ]);

  // --- Plan limit banner ---
  const currentPlan = (dbUser.organization.plan ?? "STARTER") as Plan;
  const limits = PLAN_LIMITS[currentPlan] ?? PLAN_LIMITS.STARTER;
  const clientCount = clients.length;
  const nearClientLimit =
    limits.clients !== -1 && limits.clients - clientCount <= 2;
  const nearDeviceLimit =
    limits.devices !== -1 && limits.devices - deviceCount <= 10;
  const showLimitBanner = nearClientLimit || nearDeviceLimit;

  // --- Tickets over time: grouped by createdAt date (last 14 days) ---
  const ticketCountByDay = new Map<string, number>();
  for (const ticket of recentTickets) {
    const key = new Date(ticket.createdAt).toISOString().slice(0, 10);
    ticketCountByDay.set(key, (ticketCountByDay.get(key) ?? 0) + 1);
  }
  const today = new Date();
  const ticketsChartData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: ticketCountByDay.get(key) ?? 0,
    };
  });

  // --- Per-client open ticket map ---
  const openTicketsByClient = new Map<string, number>();
  for (const t of perClientOpenTickets) {
    if (t.clientId) {
      openTicketsByClient.set(
        t.clientId,
        (openTicketsByClient.get(t.clientId) ?? 0) + 1,
      );
    }
  }

  // --- Devices by health ---
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

  // --- SLA distribution ---
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

      {/* Plan limit banner */}
      {showLimitBanner && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangleIcon className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            You&apos;re approaching your plan limit.{" "}
            <Link href="/billing" className="font-medium underline underline-offset-2">
              Upgrade your plan
            </Link>{" "}
            to avoid interruptions.
          </span>
        </div>
      )}

      {!hasClients ? (
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
                const openTickets = openTicketsByClient.get(client.id) ?? 0;
                return (
                  <Link key={client.id} href={`/clients/${client.id}`}>
                    <Card className="cursor-pointer transition-colors hover:bg-muted/40">
                      <CardContent className="pb-4 pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
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
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {health && <HealthBadge health={health} />}
                            {openTickets > 0 && (
                              <Badge
                                variant={openTickets >= 6 ? "red" : "orange"}
                                className="text-[10px] py-0"
                              >
                                {openTickets} open{" "}
                                {openTickets === 1 ? "ticket" : "tickets"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TicketsOverTimeChart
                data={ticketsChartData}
                title={`Tickets - Last 14 Days (${openTicketCount} open)`}
              />
            </div>
            <DevicesByHealthChart data={deviceHealthData} />
          </div>

          <SlaPerformanceChart data={slaChartData} />
        </>
      )}
    </div>
  );
}
