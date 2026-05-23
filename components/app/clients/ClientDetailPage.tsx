"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, PencilIcon, Trash2Icon } from "lucide-react";

import type { Client, Device, Role } from "@prisma/client";
import type { HealthResult } from "@/lib/health/score";
import { BAND_HEX } from "@/lib/health/bands";
import { DevicesTab } from "@/components/app/devices/DevicesTab";
import { PatchAgeChart } from "@/components/charts/PatchAgeChart";
import { ScoreHistoryChart } from "@/components/charts/ScoreHistoryChart";
import type { SnapshotPoint } from "@/components/charts/ScoreHistoryChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { EditClientSheet } from "@/components/app/clients/EditClientSheet";
import { DeleteClientAlertDialog } from "@/components/app/clients/DeleteClientAlertDialog";
import { HealthBadge, BAND_SCORE_COLOR } from "@/components/ui/health-badge";
import { SLA_TIER_LABELS } from "@/types";

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

interface ClientDetailPageProps {
  client: Client;
  devices: Device[];
  role: Role;
  activeTab: string;
  health: HealthResult;
  snapshots: SnapshotPoint[];
}

const SLA_VARIANTS: Record<
  string,
  "basic" | "standard" | "premium" | "enterprise"
> = {
  BASIC: "basic",
  STANDARD: "standard",
  PREMIUM: "premium",
  ENTERPRISE: "enterprise",
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// InfoRow — one metadata field in the overview grid
// ---------------------------------------------------------------------------

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const VALID_TABS = ["overview", "devices", "tickets", "reports"];

export function ClientDetailPage({
  client,
  devices,
  role,
  activeTab,
  health,
  snapshots,
}: ClientDetailPageProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const isOwner = role === "OWNER";
  const canWrite = role !== "READONLY";

  const currentTab = VALID_TABS.includes(activeTab) ? activeTab : "overview";

  // Patch age buckets derived from device data — pure computation, no fetch.
  const patchBuckets = { current: 0, aging: 0, stale: 0, unknown: 0 };
  for (const d of devices) {
    const days = d.patchAgeDays as number | null;
    if (days === null) patchBuckets.unknown++;
    else if (days <= 30) patchBuckets.current++;
    else if (days <= 90) patchBuckets.aging++;
    else patchBuckets.stale++;
  }
  const patchAgeData = [
    { bucket: "≤ 30d", count: patchBuckets.current, fill: BAND_HEX.HEALTHY },
    { bucket: "31–90d", count: patchBuckets.aging, fill: BAND_HEX.AT_RISK },
    { bucket: "> 90d", count: patchBuckets.stale, fill: BAND_HEX.CRITICAL },
    { bucket: "Unknown", count: patchBuckets.unknown, fill: "#94a3b8" },
  ];

  function handleTabChange(value: string | number | null) {
    if (typeof value === "string") {
      router.replace(`/clients/${client.id}?tab=${value}`, { scroll: false });
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
        <Link href="/clients" className="hover:text-foreground transition-colors">
          Clients
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-foreground font-medium truncate">{client.name}</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
          <Badge variant={SLA_VARIANTS[client.slaTier]}>
            {SLA_TIER_LABELS[client.slaTier]}
          </Badge>
        </div>

        <div className="flex shrink-0 gap-2">
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="gap-1.5"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          {isOwner && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="gap-1.5"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Tabs — value controlled by URL searchParam */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview — health card + metadata grid */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Health card */}
            <Card>
              <CardHeader>
                <CardTitle>Client Health</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {/* Score + band */}
                <div className="flex items-end gap-3">
                  <span
                    className={`text-5xl font-bold tabular-nums leading-none ${BAND_SCORE_COLOR[health.band]}`}
                  >
                    {health.score}
                  </span>
                  <HealthBadge health={health} />
                </div>
                {/* Component breakdown */}
                <div className="flex flex-col gap-4">
                  {health.components.map((comp) => (
                    <div key={comp.name} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{comp.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {comp.score}/100
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {comp.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Client info card */}
            <Card className="md:col-span-2">
              <CardContent className="pt-6">
                <dl className="grid grid-cols-1 gap-y-5 gap-x-8 sm:grid-cols-2">
                  <InfoRow label="Industry">{client.industry || "—"}</InfoRow>
                  <InfoRow label="SLA Tier">
                    <Badge variant={SLA_VARIANTS[client.slaTier]}>
                      {SLA_TIER_LABELS[client.slaTier]}
                    </Badge>
                  </InfoRow>
                  <InfoRow label="Primary Contact">
                    {client.primaryContact || "—"}
                  </InfoRow>
                  <InfoRow label="Created">{formatDate(client.createdAt)}</InfoRow>
                  <InfoRow label="Notes">
                    {client.notes ? (
                      <span className="whitespace-pre-line">{client.notes}</span>
                    ) : (
                      "—"
                    )}
                  </InfoRow>
                  <InfoRow label="Last Updated">
                    {formatDate(client.updatedAt)}
                  </InfoRow>
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Devices */}
        <TabsContent value="devices">
          <DevicesTab
            clientId={client.id}
            devices={devices}
            canWrite={role !== "READONLY"}
          />
        </TabsContent>

        {/* Tickets — placeholder */}
        <TabsContent value="tickets">
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Ticket integration coming soon.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Device Patch Age
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PatchAgeChart data={patchAgeData} total={devices.length} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Score History
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScoreHistoryChart data={snapshots} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <EditClientSheet open={editOpen} onOpenChange={setEditOpen} client={client} />
      <DeleteClientAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        clientId={client.id}
        clientName={client.name}
      />
    </div>
  );
}
