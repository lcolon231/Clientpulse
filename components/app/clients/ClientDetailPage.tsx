"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";

import type { Client, Device, Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { EditClientDialog } from "@/components/app/clients/EditClientDialog";
import { DeleteClientDialog } from "@/components/app/clients/DeleteClientDialog";
import { DevicesTab } from "@/components/app/devices/DevicesTab";

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

interface ClientDetailPageProps {
  client: Client;
  devices: Device[];
  deviceCount: number;
  role: Role;
  dbUserId: string;
  organizationId: string;
}

const SLA_LABELS: Record<string, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

const SLA_VARIANTS: Record<string, "basic" | "standard" | "premium"> = {
  BASIC: "basic",
  STANDARD: "standard",
  PREMIUM: "premium",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClientDetailPage({
  client,
  devices,
  deviceCount,
  role,
  dbUserId,
  organizationId,
}: ClientDetailPageProps) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const isOwner = role === "OWNER";
  const canWrite = role !== "READONLY";

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back link */}
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          All clients
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
            {client.industry && (
              <Badge variant="default">{client.industry}</Badge>
            )}
            <Badge variant={SLA_VARIANTS[client.slaTier]}>
              {SLA_LABELS[client.slaTier]}
            </Badge>
          </div>
          {client.primaryContact && (
            <p className="text-sm text-muted-foreground">
              Contact:{" "}
              <span className="text-foreground font-medium">
                {client.primaryContact}
              </span>
              {client.primaryContactEmail && (
                <span className="text-muted-foreground">
                  {" "}·{" "}
                  <a
                    href={`mailto:${client.primaryContactEmail}`}
                    className="hover:underline"
                  >
                    {client.primaryContactEmail}
                  </a>
                </span>
              )}
            </p>
          )}
          {client.notes && (
            <p className="text-sm text-muted-foreground max-w-prose">
              {client.notes}
            </p>
          )}
        </div>

        {/* Actions */}
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

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="devices">
            Devices{" "}
            {deviceCount > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {deviceCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{deviceCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Open Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-muted-foreground">—</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Last Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {devices.length > 0
                    ? new Date(
                        Math.max(
                          ...devices.map((d) => new Date(d.updatedAt).getTime())
                        )
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Devices */}
        <TabsContent value="devices">
          <DevicesTab
            clientId={client.id}
            devices={devices}
            canWrite={canWrite}
            dbUserId={dbUserId}
            organizationId={organizationId}
          />
        </TabsContent>

        {/* Tickets placeholder */}
        <TabsContent value="tickets">
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Ticket sync coming in Week 6
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports placeholder */}
        <TabsContent value="reports">
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Reports coming in Week 5
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <EditClientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
      />

      {/* Delete dialog */}
      <DeleteClientDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        clientId={client.id}
        clientName={client.name}
      />
    </div>
  );
}
