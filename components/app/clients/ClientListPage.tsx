"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react";

import type { Client } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { AddClientSheet } from "@/components/app/clients/AddClientSheet";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClientWithCount = Client & { _count: { devices: number } };

interface ClientListPageProps {
  clients: ClientWithCount[];
  canWrite: boolean;
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

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClientListPage({ clients, canWrite }: ClientListPageProps) {
  const [search, setSearch] = React.useState("");
  const [slaFilter, setSlaFilter] = React.useState<string>("ALL");
  const [addOpen, setAddOpen] = React.useState(false);

  const filtered = clients.filter((c) => {
    const matchesSearch =
      search === "" || c.name.toLowerCase().includes(search.toLowerCase());
    const matchesSla = slaFilter === "ALL" || c.slaTier === slaFilter;
    return matchesSearch && matchesSla;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-foreground font-medium">Clients</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} {clients.length === 1 ? "client" : "clients"} total
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setAddOpen(true)} className="gap-1.5">
            <PlusIcon className="h-4 w-4" />
            New Client
          </Button>
        )}
      </div>

      {/* Empty state */}
      {clients.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No clients yet</CardTitle>
            <CardDescription>
              Add your first client to start monitoring their devices and health
              metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canWrite ? (
              <Button onClick={() => setAddOpen(true)} className="gap-1.5">
                <UsersIcon className="h-4 w-4" />
                Add your first client
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Contact your account owner to add clients.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                aria-label="Search clients"
              />
            </div>
            <div className="w-44">
              <Select
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value)}
                aria-label="Filter by SLA tier"
              >
                <option value="ALL">All tiers</option>
                <option value="BASIC">Basic</option>
                <option value="STANDARD">Standard</option>
                <option value="PREMIUM">Premium</option>
                <option value="ENTERPRISE">Enterprise</option>
              </Select>
            </div>
          </div>

          {/* Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>SLA Tier</TableHead>
                  <TableHead>Primary Contact</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No clients match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium hover:underline"
                        >
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.industry || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={SLA_VARIANTS[client.slaTier]}>
                          {SLA_LABELS[client.slaTier]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {client.primaryContact ? (
                          <span className="text-sm">{client.primaryContact}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(client.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={`/clients/${client.id}`} />}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </Card>
        </>
      )}

      {/* New Client sheet */}
      <AddClientSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
