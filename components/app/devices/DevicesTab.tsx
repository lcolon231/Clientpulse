"use client";

import * as React from "react";
import { PlusIcon, UploadIcon, PencilIcon, Trash2Icon } from "lucide-react";

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
import { AddDeviceSheet } from "@/components/app/devices/AddDeviceSheet";
import { EditDeviceSheet } from "@/components/app/devices/EditDeviceSheet";
import { DeleteDeviceAlertDialog } from "@/components/app/devices/DeleteDeviceAlertDialog";
import { CSVImportSheet } from "@/components/app/devices/CSVImportSheet";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DevicesTabProps {
  clientId: string;
  devices: Device[];
  canWrite: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mo ago`;
  return `${Math.floor(diffDays / 365)} yr ago`;
}

function patchAgeClass(days: number): string {
  if (days <= 30) return "text-green-600 dark:text-green-400";
  if (days <= 90) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DevicesTab({ clientId, devices, canWrite }: DevicesTabProps) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [csvOpen, setCsvOpen] = React.useState(false);
  const [editDevice, setEditDevice] = React.useState<Device | null>(null);
  const [deleteDevice, setDeleteDevice] = React.useState<Device | null>(null);

  if (devices.length === 0) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>No devices yet</CardTitle>
            <CardDescription>
              No devices yet — add one manually or import from CSV.
            </CardDescription>
          </CardHeader>
          {canWrite && (
            <CardContent className="flex gap-2">
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
                <PlusIcon className="h-4 w-4" />
                Add Device
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCsvOpen(true)}
                className="gap-1.5"
              >
                <UploadIcon className="h-4 w-4" />
                Import CSV
              </Button>
            </CardContent>
          )}
        </Card>

        {canWrite && (
          <>
            <AddDeviceSheet open={addOpen} onOpenChange={setAddOpen} clientId={clientId} />
            <CSVImportSheet open={csvOpen} onOpenChange={setCsvOpen} clientId={clientId} />
          </>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      {canWrite && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvOpen(true)}
            className="gap-1.5"
          >
            <UploadIcon className="h-3.5 w-3.5" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <PlusIcon className="h-3.5 w-3.5" />
            Add Device
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
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
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.hostname}</TableCell>
                  <TableCell>
                    <Badge variant="default">{device.type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {device.os || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {device.osVersion || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeTime(device.lastSeen)}
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${patchAgeClass(device.patchAgeDays)}`}>
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
                          aria-label={`Edit ${device.hostname}`}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteDevice(device)}
                          className="text-destructive hover:text-destructive"
                          aria-label={`Delete ${device.hostname}`}
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Sheets & dialogs */}
      {canWrite && (
        <>
          <AddDeviceSheet open={addOpen} onOpenChange={setAddOpen} clientId={clientId} />
          {editDevice && (
            <EditDeviceSheet
              open={!!editDevice}
              onOpenChange={(o) => { if (!o) setEditDevice(null); }}
              device={editDevice}
              clientId={clientId}
            />
          )}
          {deleteDevice && (
            <DeleteDeviceAlertDialog
              open={!!deleteDevice}
              onOpenChange={(o) => { if (!o) setDeleteDevice(null); }}
              deviceId={deleteDevice.id}
              hostname={deleteDevice.hostname}
              clientId={clientId}
            />
          )}
          <CSVImportSheet open={csvOpen} onOpenChange={setCsvOpen} clientId={clientId} />
        </>
      )}
    </div>
  );
}
