"use client";

import * as React from "react";
import {
  PlusIcon,
  UploadIcon,
  PencilIcon,
  Trash2Icon,
  MonitorIcon,
} from "lucide-react";

import type { Device } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TagBadge } from "@/components/app/devices/TagBadge";
import { AddDeviceDialog } from "@/components/app/devices/AddDeviceDialog";
import { EditDeviceDialog } from "@/components/app/devices/EditDeviceDialog";
import { DeleteDeviceDialog } from "@/components/app/devices/DeleteDeviceDialog";
import { CSVImportDialog } from "@/components/app/devices/CSVImportDialog";

// ---------------------------------------------------------------------------
// Seed tag list for filter UI
// ---------------------------------------------------------------------------

const BASE_TAGS = ["Server", "Workstation", "Laptop", "Network", "Firewall", "NAS"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DevicesTabProps {
  clientId: string;
  devices: Device[];
  canWrite: boolean;
  dbUserId: string;
  organizationId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DevicesTab({
  clientId,
  devices,
  canWrite,
}: DevicesTabProps) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [csvOpen, setCsvOpen] = React.useState(false);
  const [editDevice, setEditDevice] = React.useState<Device | null>(null);
  const [deleteDevice, setDeleteDevice] = React.useState<Device | null>(null);

  // Tag filter
  const [activeTags, setActiveTags] = React.useState<Set<string>>(new Set());

  // Collect all unique tags across all devices for the filter
  const allTags = React.useMemo(() => {
    const set = new Set<string>(BASE_TAGS);
    devices.forEach((d) => d.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [devices]);

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const filtered =
    activeTags.size === 0
      ? devices
      : devices.filter((d) => d.tags.some((t) => activeTags.has(t)));

  if (devices.length === 0 && !canWrite) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No devices have been added yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tag filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                activeTags.has(tag)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tag}
            </button>
          ))}
          {activeTags.size > 0 && (
            <button
              onClick={() => setActiveTags(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Actions */}
        {canWrite && (
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCsvOpen(true)}
              className="gap-1.5"
            >
              <UploadIcon className="h-3.5 w-3.5" />
              Import CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="gap-1.5"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add Device
            </Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {devices.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No devices yet</CardTitle>
            <CardDescription>
              Add devices manually or import from a CSV file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
              <MonitorIcon className="h-4 w-4" />
              Add first device
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>OS Version</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Patch Age</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No devices match the selected tags.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.hostname}</TableCell>
                    <TableCell>{device.type}</TableCell>
                    <TableCell>{device.os || "—"}</TableCell>
                    <TableCell>{device.osVersion || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(device.lastSeen)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-medium ${
                          device.patchAgeDays > 30
                            ? "text-red-600"
                            : device.patchAgeDays > 14
                              ? "text-orange-600"
                              : "text-green-600"
                        }`}
                      >
                        {device.patchAgeDays}d
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {device.tags.map((tag) => (
                          <TagBadge key={tag} tag={tag} />
                        ))}
                        {device.tags.length === 0 && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {canWrite && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditDevice(device)}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteDevice(device)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialogs */}
      <AddDeviceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        clientId={clientId}
      />
      {editDevice && (
        <EditDeviceDialog
          open={!!editDevice}
          onOpenChange={(open) => { if (!open) setEditDevice(null); }}
          device={editDevice}
          clientId={clientId}
        />
      )}
      {deleteDevice && (
        <DeleteDeviceDialog
          open={!!deleteDevice}
          onOpenChange={(open) => { if (!open) setDeleteDevice(null); }}
          device={deleteDevice}
          clientId={clientId}
        />
      )}
      <CSVImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        clientId={clientId}
      />
    </div>
  );
}
