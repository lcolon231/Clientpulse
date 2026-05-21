"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const deviceSchema = z.object({
  hostname: z.string().min(1, "Hostname is required"),
  type: z.enum(["Server", "Workstation", "Laptop", "Network", "Other"]),
  os: z.string().optional(),
  osVersion: z.string().optional(),
  lastSeen: z.string().min(1, "Last seen is required"),
  patchAgeDays: z.coerce.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
});

export type DeviceActionResult =
  | { success: true }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyClientOwnership(clientId: string, organizationId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createDeviceAction(
  clientId: string,
  rawData: unknown
): Promise<DeviceActionResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to add devices." };
  }

  const client = await verifyClientOwnership(clientId, dbUser.organizationId);
  if (!client) return { success: false, error: "Client not found." };

  const parsed = deviceSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const data = parsed.data;

  const device = await prisma.device.create({
    data: {
      hostname: data.hostname,
      type: data.type,
      os: data.os ?? "",
      osVersion: data.osVersion ?? "",
      lastSeen: new Date(data.lastSeen),
      patchAgeDays: data.patchAgeDays,
      tags: data.tags,
      clientId,
    },
  });

  await logAudit({
    action: "device_added",
    entityType: "device",
    entityId: device.id,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { hostname: device.hostname, client_id: clientId },
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateDeviceAction(
  deviceId: string,
  clientId: string,
  rawData: unknown
): Promise<DeviceActionResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to edit devices." };
  }

  const client = await verifyClientOwnership(clientId, dbUser.organizationId);
  if (!client) return { success: false, error: "Client not found." };

  const existing = await prisma.device.findFirst({
    where: { id: deviceId, clientId },
    select: { id: true, hostname: true, type: true, os: true, osVersion: true, lastSeen: true, patchAgeDays: true, tags: true },
  });
  if (!existing) return { success: false, error: "Device not found." };

  const parsed = deviceSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const data = parsed.data;

  const changedFields: string[] = [];
  if (data.hostname !== existing.hostname) changedFields.push("hostname");
  if (data.type !== existing.type) changedFields.push("type");
  if ((data.os ?? "") !== existing.os) changedFields.push("os");
  if ((data.osVersion ?? "") !== existing.osVersion) changedFields.push("osVersion");
  if (new Date(data.lastSeen).getTime() !== new Date(existing.lastSeen).getTime()) changedFields.push("lastSeen");
  if (data.patchAgeDays !== existing.patchAgeDays) changedFields.push("patchAgeDays");
  if (JSON.stringify([...data.tags].sort()) !== JSON.stringify([...existing.tags].sort())) changedFields.push("tags");

  const updated = await prisma.device.update({
    where: { id: deviceId },
    data: {
      hostname: data.hostname,
      type: data.type,
      os: data.os ?? "",
      osVersion: data.osVersion ?? "",
      lastSeen: new Date(data.lastSeen),
      patchAgeDays: data.patchAgeDays,
      tags: data.tags,
    },
  });

  await logAudit({
    action: "device_updated",
    entityType: "device",
    entityId: deviceId,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { hostname: updated.hostname, changed_fields: changedFields },
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteDeviceAction(
  deviceId: string,
  clientId: string
): Promise<DeviceActionResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to delete devices." };
  }

  const client = await verifyClientOwnership(clientId, dbUser.organizationId);
  if (!client) return { success: false, error: "Client not found." };

  const device = await prisma.device.findFirst({
    where: { id: deviceId, clientId },
    select: { id: true, hostname: true },
  });
  if (!device) return { success: false, error: "Device not found." };

  await prisma.device.delete({ where: { id: deviceId } });

  await logAudit({
    action: "device_deleted",
    entityType: "device",
    entityId: deviceId,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { hostname: device.hostname, client_id: clientId },
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// CSV bulk import
// ---------------------------------------------------------------------------

export interface CsvDeviceRow {
  hostname: string;
  type: string;
  os?: string;
  os_version?: string;
  last_seen?: string;
  patch_age_days?: string;
  tags?: string;
}

export async function importDevicesAction(
  clientId: string,
  rows: CsvDeviceRow[]
): Promise<DeviceActionResult & { count?: number }> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to import devices." };
  }

  const client = await verifyClientOwnership(clientId, dbUser.organizationId);
  if (!client) return { success: false, error: "Client not found." };

  if (rows.length === 0) {
    return { success: false, error: "No valid rows to import." };
  }

  const devicesToCreate = rows.map((row) => ({
    hostname: row.hostname,
    type: row.type,
    os: row.os ?? "",
    osVersion: row.os_version ?? "",
    lastSeen: row.last_seen ? new Date(row.last_seen) : new Date(),
    patchAgeDays: row.patch_age_days ? parseInt(row.patch_age_days, 10) || 0 : 0,
    tags: row.tags
      ? row.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [],
    clientId,
  }));

  await prisma.device.createMany({ data: devicesToCreate });

  await logAudit({
    action: "devices_csv_imported",
    entityType: "device",
    entityId: clientId,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { count: rows.length, client_id: clientId },
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true, count: rows.length };
}
