import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dbUser } = await requireAuth();

  if (dbUser.organization.onboardingComplete) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
