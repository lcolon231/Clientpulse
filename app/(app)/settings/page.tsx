import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { SettingsPage } from "@/components/app/settings/SettingsPage";

export const metadata = { title: "Settings — ClientPulse" };

export default async function SettingsRoute({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { dbUser } = await requireAuth();
  const sp = await searchParams;

  const members = await prisma.user.findMany({
    where: { organizationId: dbUser.organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <SettingsPage
      org={{
        name: dbUser.organization.name,
        timezone: dbUser.organization.timezone,
        logoUrl: dbUser.organization.logoUrl,
        plan: dbUser.organization.plan,
      }}
      members={members}
      currentUser={{
        id: dbUser.id,
        name: dbUser.name ?? null,
        email: dbUser.email,
        role: dbUser.role,
      }}
      activeTab={sp.tab ?? "general"}
    />
  );
}
