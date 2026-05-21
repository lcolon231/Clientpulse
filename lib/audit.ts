import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogAuditParams {
  action: string;
  entityType: string;
  /** The ID of the affected record. Pass the user ID, org ID, etc. */
  entityId: string;
  organizationId: string;
  /** The DB user ID (public.users.id) of the actor. Null for system actions. */
  userId?: string | null;
  metadata?: Prisma.JsonObject;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Appends one row to the audit_logs table.
 *
 * Written via the Prisma postgres connection (service-role equivalent), which
 * bypasses RLS — audit rows must be writable from server actions regardless of
 * whether the acting user's JWT has an org_id claim yet (e.g. during invite
 * acceptance, before the first session refresh).
 *
 * This function never throws. A failed audit write is logged to stderr but
 * does not roll back the operation that triggered it. Audit writes are
 * observability, not a transaction gate.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  const { action, entityType, entityId, organizationId, userId, metadata } =
    params;

  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        organizationId,
        userId: userId ?? null,
        metadata: (metadata ?? {}) as Prisma.JsonObject,
      },
    });
  } catch (err) {
    // Non-fatal — log and move on.
    console.error("[logAudit] Failed to write audit row", {
      action,
      entityType,
      entityId,
      err,
    });
  }
}
