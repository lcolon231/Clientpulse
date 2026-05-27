import { type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { syncPsaTickets } from "@/lib/integrations/psa/sync-tickets";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncPsaTickets();
  const status = result.ok ? 200 : 207;

  console.log("[cron/ticket-sync]", JSON.stringify(result));

  return Response.json(result, { status });
}

