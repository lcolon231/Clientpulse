import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrgHealth } from "@/lib/health/calculate-client-health";
import { ReportsPage } from "@/components/app/reports/ReportsPage";

export const metadata = {
  title: "Reports — ClientPulse",
};

export default async function ReportsRoute() {
  const { dbUser } = await requireAuth();

  const [clients, orgHealthMap] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId: dbUser.organizationId },
      include: { _count: { select: { devices: true } } },
      orderBy: { name: "asc" },
    }),
    getOrgHealth(dbUser.organizationId),
  ]);

  return (
    <ReportsPage
      clients={clients}
      healthScores={Object.fromEntries(orgHealthMap)}
    />
  );
}
