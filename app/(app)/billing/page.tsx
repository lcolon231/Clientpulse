import { CheckIcon } from "lucide-react";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubscribeButton } from "@/components/app/billing/SubscribeButton";
import { ManageBillingButton } from "@/components/app/billing/ManageBillingButton";

export const metadata = { title: "Billing — ClientPulse" };

// ---------------------------------------------------------------------------
// Plan display config
// ---------------------------------------------------------------------------

const PLAN_CARDS: {
  key: Plan;
  name: string;
  price: string;
  description: string;
  features: string[];
  priceEnvVar: "STRIPE_PRICE_STARTER" | "STRIPE_PRICE_GROWTH" | "STRIPE_PRICE_ENTERPRISE";
}[] = [
  {
    key: "STARTER",
    name: "Starter",
    price: "Free",
    description: "Great for getting started",
    features: [
      "Up to 10 clients",
      "Up to 50 devices",
      "Health scoring & alerts",
      "Audit log",
    ],
    priceEnvVar: "STRIPE_PRICE_STARTER",
  },
  {
    key: "GROWTH",
    name: "Growth",
    price: "Contact us",
    description: "For growing MSPs",
    features: [
      "Up to 50 clients",
      "Up to 500 devices",
      "CSV device import",
      "Scheduled email reports",
      "Everything in Starter",
    ],
    priceEnvVar: "STRIPE_PRICE_GROWTH",
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: "Contact us",
    description: "Unlimited scale",
    features: [
      "Unlimited clients",
      "Unlimited devices",
      "CSV device import",
      "Scheduled email reports",
      "Priority support",
      "Everything in Growth",
    ],
    priceEnvVar: "STRIPE_PRICE_ENTERPRISE",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BillingPage() {
  const { dbUser } = await requireAuth();
  const { organizationId } = dbUser;
  const currentPlan = (dbUser.organization.plan ?? "STARTER") as Plan;
  const limits = PLAN_LIMITS[currentPlan] ?? PLAN_LIMITS.STARTER;

  const [clientCount, deviceCount] = await Promise.all([
    prisma.client.count({ where: { organizationId } }),
    prisma.device.count({ where: { client: { organizationId } } }),
  ]);

  const clientLimit = limits.clients === -1 ? "Unlimited" : String(limits.clients);
  const deviceLimit = limits.devices === -1 ? "Unlimited" : String(limits.devices);

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Manage your subscription and plan limits.
          </p>
        </div>
        {dbUser.organization.stripeCustomerId && <ManageBillingButton />}
      </div>

      {/* Current usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Current Usage</CardTitle>
          <CardDescription>
            Your organization is on the{" "}
            <span className="font-semibold capitalize">{currentPlan.toLowerCase()}</span> plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UsageStat
              label="Clients"
              current={clientCount}
              limit={limits.clients}
              limitLabel={clientLimit}
            />
            <UsageStat
              label="Devices"
              current={deviceCount}
              limit={limits.devices}
              limitLabel={deviceLimit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLAN_CARDS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const priceId = process.env[plan.priceEnvVar] ?? "";

          return (
            <Card
              key={plan.key}
              className={isCurrent ? "ring-2 ring-primary" : undefined}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {isCurrent && (
                    <Badge variant="default" className="shrink-0">
                      Current plan
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold">{plan.price}</p>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ul className="flex flex-col gap-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckIcon className="h-3.5 w-3.5 shrink-0 text-green-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="h-9 rounded-md border border-border flex items-center justify-center text-sm text-muted-foreground">
                    Current plan
                  </div>
                ) : (
                  <SubscribeButton
                    priceId={priceId}
                    label={`Switch to ${plan.name}`}
                    disabled={!priceId}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UsageStat({
  label,
  current,
  limit,
  limitLabel,
}: {
  label: string;
  current: number;
  limit: number;
  limitLabel: string;
}) {
  const pct = limit === -1 ? 0 : Math.min((current / limit) * 100, 100);
  const isWarning = limit !== -1 && pct >= 80;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {current} / {limitLabel}
        </span>
      </div>
      {limit !== -1 && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isWarning ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
