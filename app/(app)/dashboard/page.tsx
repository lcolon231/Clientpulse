import type { ReactNode } from "react";
import Link from "next/link";
import { MonitorIcon, UsersIcon } from "lucide-react";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrgHealth } from "@/lib/health/calculate-client-health";
import { BAND_HEX, BAND_LABELS } from "@/lib/health/bands";
import { InviteModal } from "@/components/app/InviteModal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthBadge } from "@/components/ui/health-badge";
import { Button } from "@/components/ui/button";
import { HealthDistributionChart } from "@/components/charts/HealthDistributionChart";
import { PatchAgeChart } from "@/components/charts/PatchAgeChart";
import { SLA_TIER_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import type { HealthResult } from "@/lib/health/score";

export const metadata = {
  title: "Dashboard — ClientPulse",
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAND_ORDER: Record<HealthResult["band"], number> = {
  CRITICAL: 0,
  AT_RISK: 1,
  FAIR: 2,
  HEALTHY: 3,
};

const SLA_VARIANTS: Record<
  string,
  "basic" | "standard" | "premium" | "enterprise"
> = {
  BASIC: "basic",
  STANDARD: "standard",
  PREMIUM: "premium",
  ENTERPRISE: "enterprise",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const { dbUser } = await requireAuth();
  const isOwner = dbUser.role === "OWNER";
  const { organizationId } = dbUser;

  const [clients, orgHealthMap, orgDevices] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId },
      include: { _count: { select: { devices: true } } },
    }),
    getOrgHealth(organizationId),
    prisma.device.findMany({
      where: { client: { organizationId } },
      select: { patchAgeDays: true },
    }),
  ]);

  const enriched = clients.map((c) => ({
    ...c,
    health: orgHealthMap.get(c.id) ?? {
      score: 75,
      band: "FAIR" as const,
      components: [],
    },
  }));

  // Sort worst-first: MSPs need to see fires immediately without scrolling.
  enriched.sort((a, b) => {
    const bandDiff = BAND_ORDER[a.health.band] - BAND_ORDER[b.health.band];
    return bandDiff !== 0 ? bandDiff : a.health.score - b.health.score;
  });

  const totalClients = clients.length;
  const totalDevices = clients.reduce((sum, c) => sum + c._count.devices, 0);
  const bandCounts = { CRITICAL: 0, AT_RISK: 0, FAIR: 0, HEALTHY: 0 };
  for (const c of enriched) bandCounts[c.health.band]++;

  // Band distribution for donut chart (worst→best order for legend readability).
  const bandDistribution = (
    ["CRITICAL", "AT_RISK", "FAIR", "HEALTHY"] as const
  ).map((band) => ({
    band,
    label: BAND_LABELS[band],
    count: bandCounts[band],
    fill: BAND_HEX[band],
  }));

  // Patch age buckets across all org devices.
  let patchCurrent = 0,
    patchAging = 0,
    patchStale = 0,
    patchUnknown = 0;
  for (const d of orgDevices) {
    const days = d.patchAgeDays as number | null;
    if (days === null) patchUnknown++;
    else if (days <= 30) patchCurrent++;
    else if (days <= 90) patchAging++;
    else patchStale++;
  }
  const patchAgeData = [
    { bucket: "≤ 30d", count: patchCurrent, fill: BAND_HEX.HEALTHY },
    { bucket: "31–90d", count: patchAging, fill: BAND_HEX.AT_RISK },
    { bucket: "> 90d", count: patchStale, fill: BAND_HEX.CRITICAL },
    { bucket: "Unknown", count: patchUnknown, fill: "#94a3b8" },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {dbUser.organization.name}
          </p>
        </div>
        {isOwner && <InviteModal />}
      </div>

      {/* Summary stat row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Clients"
          value={totalClients}
          icon={<UsersIcon className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Devices"
          value={totalDevices}
          icon={<MonitorIcon className="h-3.5 w-3.5" />}
        />
        <BandStatCard
          label="Critical"
          count={bandCounts.CRITICAL}
          activeColor="text-red-600"
        />
        <BandStatCard
          label="At Risk"
          count={bandCounts.AT_RISK}
          activeColor="text-amber-600"
        />
        <BandStatCard
          label="Fair"
          count={bandCounts.FAIR}
          activeColor="text-blue-600"
        />
        <BandStatCard
          label="Healthy"
          count={bandCounts.HEALTHY}
          activeColor="text-green-600"
        />
      </div>

      {/* Client health cards or empty state */}
      {enriched.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No clients yet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Add your first client to start monitoring their devices and health
              metrics.
            </p>
            <div>
              <Button
                render={<Link href="/clients" />}
                nativeButton={false}
                className="gap-1.5"
              >
                <UsersIcon className="h-4 w-4" />
                Add your first client
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts row — only when there are clients to visualise */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Health Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <HealthDistributionChart data={bandDistribution} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Patch Age (All Devices)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PatchAgeChart data={patchAgeData} total={totalDevices} />
              </CardContent>
            </Card>
          </div>

          {/* Client health grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enriched.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="h-full transition-colors group-hover:bg-muted/40">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug">
                        {client.name}
                      </CardTitle>
                      <Badge
                        variant={SLA_VARIANTS[client.slaTier]}
                        className="mt-0.5 shrink-0"
                      >
                        {SLA_TIER_LABELS[client.slaTier]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-2">
                      <HealthBadge health={client.health} />
                      <span className="text-muted-foreground tabular-nums text-xs">
                        {client._count.devices}{" "}
                        {client._count.devices === 1 ? "device" : "devices"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components (page-scoped, not exported)
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function BandStatCard({
  label,
  count,
  activeColor,
}: {
  label: string;
  count: number;
  activeColor: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p
          className={cn(
            "text-2xl font-bold tabular-nums",
            count > 0 ? activeColor : "text-foreground",
          )}
        >
          {count}
        </p>
      </CardContent>
    </Card>
  );
}
