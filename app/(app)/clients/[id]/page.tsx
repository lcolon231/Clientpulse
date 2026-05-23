import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getClientHealth } from "@/lib/health/calculate-client-health";
import { ClientDetailPage } from "@/components/app/clients/ClientDetailPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: client ? `${client.name} — ClientPulse` : "Client — ClientPulse" };
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { dbUser } = await requireAuth();

  const [client, health, rawSnapshots] = await Promise.all([
    prisma.client.findFirst({
      where: { id, organizationId: dbUser.organizationId },
      include: { devices: { orderBy: { createdAt: "desc" } } },
    }),
    getClientHealth(id, dbUser.organizationId),
    // healthSnapshot may not exist yet (pre-Goal 6 DBs) — catch gracefully.
    prisma.healthSnapshot
      .findMany({
        where: { clientId: id, organizationId: dbUser.organizationId },
        orderBy: { date: "asc" },
        select: { date: true, score: true, band: true },
        take: 90,
      })
      .catch(() => []),
  ]);

  if (!client) notFound();

  // Serialize Date → "YYYY-MM-DD" string before passing to the client component.
  const snapshots = rawSnapshots.map((s) => ({
    date: s.date.toISOString().slice(0, 10),
    score: s.score,
    band: s.band,
  }));

  return (
    <ClientDetailPage
      client={client}
      devices={client.devices}
      role={dbUser.role}
      activeTab={sp.tab ?? "overview"}
      health={health}
      snapshots={snapshots}
    />
  );
}
