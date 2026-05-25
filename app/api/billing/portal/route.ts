import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { clientEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  const { dbUser } = await requireAuth();

  const customerId = dbUser.organization.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json(
      { error: "No billing account found. Subscribe to a plan first." },
      { status: 400 },
    );
  }

  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${clientEnv.NEXT_PUBLIC_SITE_URL}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
