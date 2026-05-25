import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrgHealth } from "@/lib/health/calculate-client-health";
import { canAddClient } from "@/lib/plans";
import { ClientListPage } from "@/components/app/clients/ClientListPage";

export const metadata = {
  title: "Clients — ClientPulse",
};

export default async function ClientsPage() {
  const { dbUser } = await requireAuth();

  const [clients, orgHealthMap] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId: dbUser.organizationId },
      include: { _count: { select: { devices: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getOrgHealth(dbUser.organizationId),
  ]);

  return (
    <ClientListPage
      clients={clients}
      canWrite={dbUser.role !== "READONLY"}
      healthScores={Object.fromEntries(orgHealthMap)}
      atClientLimit={!canAddClient(dbUser.organization, clients.length)}
    />
  );
}
