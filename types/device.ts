import { z } from "zod";

export const DEVICE_TYPE_OPTIONS = [
  "Workstation",
  "Server",
  "Network Device",
  "Printer",
  "Mobile",
  "Other",
] as const;

export type DeviceType = (typeof DEVICE_TYPE_OPTIONS)[number];

export const OS_OPTIONS = [
  "Windows",
  "macOS",
  "Linux",
  "iOS",
  "Android",
  "Other",
] as const;

export type DeviceOS = (typeof OS_OPTIONS)[number];

export const deviceSchema = z.object({
  hostname: z
    .string()
    .min(1, "Hostname is required")
    .max(253, "Hostname must be 253 characters or fewer"),
  type: z.enum(DEVICE_TYPE_OPTIONS, { error: "Select a device type" }),
  os: z.string().max(100).optional(),
  osVersion: z
    .string()
    .max(50, "OS version must be 50 characters or fewer")
    .optional(),
  lastSeen: z.string().optional(),
  patchAgeDays: z.coerce
    .number()
    .int()
    .min(0, "Patch age must be 0 or more")
    .optional()
    .default(0),
  tags: z.array(z.string()).default([]),
});

export type DeviceFormValues = z.infer<typeof deviceSchema>;

// CSV import row shape (raw parsed headers)
export interface CsvDeviceRow {
  hostname: string;
  type: string;
  os?: string;
  os_version?: string;
  last_seen?: string;
  patch_age_days?: string;
  tags?: string;
}
