"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { deviceSchema, type CsvDeviceRow } from "@/types";

type DeviceResult = { success: true } | { success: false; error: string };

export type BulkCreateResult =
  | { success: true; count: number; skipped: number }
  | { success: false; error: string };

async function verifyClientOwnership(clientId: string, organizationId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createDevice(
  clientId: string,
  rawData: unknown
): Promise<DeviceResult> {
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

  const { hostname, type, os, osVersion, lastSeen, patchAgeDays, tags } = parsed.data;

  await prisma.device.create({
    data: {
      hostname,
      type,
      os: os ?? "",
      osVersion: osVersion ?? "",
      lastSeen: lastSeen ? new Date(lastSeen) : new Date(),
      patchAgeDays: patchAgeDays ?? 0,
      tags,
      clientId,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateDevice(
  deviceId: string,
  clientId: string,
  rawData: unknown
): Promise<DeviceResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to edit devices." };
  }

  const client = await verifyClientOwnership(clientId, dbUser.organizationId);
  if (!client) return { success: false, error: "Client not found." };

  const device = await prisma.device.findFirst({
    where: { id: deviceId, clientId },
    select: { id: true },
  });
  if (!device) return { success: false, error: "Device not found." };

  const parsed = deviceSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const { hostname, type, os, osVersion, lastSeen, patchAgeDays, tags } = parsed.data;

  await prisma.device.update({
    where: { id: deviceId },
    data: {
      hostname,
      type,
      os: os ?? "",
      osVersion: osVersion ?? "",
      lastSeen: lastSeen ? new Date(lastSeen) : new Date(),
      patchAgeDays: patchAgeDays ?? 0,
      tags,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteDevice(
  deviceId: string,
  clientId: string
): Promise<DeviceResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to delete devices." };
  }

  const client = await verifyClientOwnership(clientId, dbUser.organizationId);
  if (!client) return { success: false, error: "Client not found." };

  const device = await prisma.device.findFirst({
    where: { id: deviceId, clientId },
    select: { id: true },
  });
  if (!device) return { success: false, error: "Device not found." };

  await prisma.device.delete({ where: { id: deviceId } });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Bulk CSV import
// ---------------------------------------------------------------------------

export async function bulkCreateDevices(
  clientId: string,
  rows: CsvDeviceRow[]
): Promise<BulkCreateResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to import devices." };
  }

  const client = await verifyClientOwnership(clientId, dbUser.organizationId);
  if (!client) return { success: false, error: "Client not found." };

  if (rows.length === 0) {
    return { success: false, error: "No rows to import." };
  }

  const toInsert: Array<{
    hostname: string;
    type: string;
    os: string;
    osVersion: string;
    lastSeen: Date;
    patchAgeDays: number;
    tags: string[];
    clientId: string;
  }> = [];

  for (const row of rows) {
    const parsed = deviceSchema.safeParse({
      hostname: row.hostname,
      type: row.type,
      os: row.os ?? "",
      osVersion: row.os_version ?? "",
      lastSeen: row.last_seen ?? "",
      patchAgeDays: row.patch_age_days ? parseInt(row.patch_age_days, 10) : 0,
      tags: row.tags
        ? row.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    });

    if (parsed.success) {
      toInsert.push({
        hostname: parsed.data.hostname,
        type: parsed.data.type,
        os: parsed.data.os ?? "",
        osVersion: parsed.data.osVersion ?? "",
        lastSeen: parsed.data.lastSeen ? new Date(parsed.data.lastSeen) : new Date(),
        patchAgeDays: parsed.data.patchAgeDays ?? 0,
        tags: parsed.data.tags,
        clientId,
      });
    }
  }

  const skipped = rows.length - toInsert.length;

  if (toInsert.length === 0) {
    return { success: false, error: "No valid rows to import." };
  }

  await prisma.device.createMany({ data: toInsert });

  revalidatePath(`/clients/${clientId}`);
  return { success: true, count: toInsert.length, skipped };
}
