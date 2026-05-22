import { SlaTier } from "@prisma/client";
import { z } from "zod";

// Re-export so consumers import from "@/types" instead of "@prisma/client"
export { SlaTier };

export const SLA_TIER_LABELS: Record<SlaTier, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
  ENTERPRISE: "Enterprise",
};

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Legal",
  "Finance",
  "Retail",
  "Manufacturing",
  "Education",
  "Hospitality",
  "Construction",
  "Other",
] as const;

export type Industry = (typeof INDUSTRY_OPTIONS)[number];

export const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or fewer"),
  industry: z.enum(INDUSTRY_OPTIONS, { error: "Select an industry" }),
  slaTier: z.nativeEnum(SlaTier, { error: "Select an SLA tier" }),
  primaryContact: z.string().max(100, "Primary contact must be 100 characters or fewer").optional(),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
