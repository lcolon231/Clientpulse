import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { AppShell } from "@/components/app/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dbUser } = await requireAuth();

  if (!dbUser.organization.onboardingComplete) {
    redirect("/onboarding");
  }

  const initialUnreadCount = await prisma.notification.count({
    where: { organizationId: dbUser.organizationId, read: false },
  });

  return (
    <AppShell
      orgName={dbUser.organization.name}
      userName={dbUser.name ?? null}
      userEmail={dbUser.email}
      initialUnreadCount={initialUnreadCount}
    >
      {children}
    </AppShell>
  );
}
