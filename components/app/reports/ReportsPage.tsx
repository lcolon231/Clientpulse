"use client";

import Link from "next/link";
import { ChevronRightIcon, DownloadIcon, FileTextIcon } from "lucide-react";

import type { Client } from "@prisma/client";
import type { HealthResult } from "@/lib/health/score";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HealthBadge } from "@/components/ui/health-badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClientWithCount = Client & { _count: { devices: number } };

interface ReportsPageProps {
  clients: ClientWithCount[];
  healthScores: Record<string, HealthResult>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SLA_LABELS: Record<string, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
  ENTERPRISE: "Enterprise",
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

const reportMonth = new Date().toLocaleString("en-US", {
  month: "long",
  year: "numeric",
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportsPage({ clients, healthScores }: ReportsPageProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-foreground font-medium">Reports</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Monthly Health Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          {reportMonth} &mdash; PDF report for each client
        </p>
      </div>

      {/* Empty state */}
      {clients.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No clients yet</CardTitle>
            <CardDescription>
              Add clients first before generating reports.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>SLA Tier</TableHead>
                  <TableHead>Devices</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="w-40">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium hover:underline"
                      >
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={SLA_VARIANTS[client.slaTier]}>
                        {SLA_LABELS[client.slaTier]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client._count.devices}
                    </TableCell>
                    <TableCell>
                      {healthScores[client.id] ? (
                        <HealthBadge health={healthScores[client.id]} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        nativeButton={false}
                        render={
                          <a
                            href={`/api/reports/${client.id}/monthly`}
                            download
                          />
                        }
                      >
                        <DownloadIcon className="h-3.5 w-3.5" />
                        Download PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Info callout */}
      <div className="flex items-start gap-2.5 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <FileTextIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Reports include health score, device summary, and audit activity for
          the last 30 days. Each PDF is generated live at download time.
        </span>
      </div>
    </div>
  );
}
