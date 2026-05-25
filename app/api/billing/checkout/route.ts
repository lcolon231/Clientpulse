import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/stripe";
import { clientEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { authUser, dbUser } = await requireAuth();

  let body: { priceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { priceId } = body;
  if (!priceId) {
    return NextResponse.json({ error: "priceId is required" }, { status: 400 });
  }

  const stripe = getStripe();

  // Get or create the Stripe customer for this org.
  let customerId = dbUser.organization.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: authUser.email ?? undefined,
      name: dbUser.organization.name,
      metadata: { organizationId: dbUser.organizationId },
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: dbUser.organizationId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${clientEnv.NEXT_PUBLIC_SITE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientEnv.NEXT_PUBLIC_SITE_URL}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
