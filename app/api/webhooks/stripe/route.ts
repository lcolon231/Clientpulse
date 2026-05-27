import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/ratelimit";
import { getStripe, priceIdToPlan } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  const rl = await rateLimit(`stripe-webhook:${ip}`);
  if (!rl.success) {
    logger.warn({ ip }, "Stripe webhook rate-limited");
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  const stripe = getStripe();

  logger.info({ eventType: event.type }, "Stripe webhook received");

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );
      const priceId = subscription.items.data[0]?.price.id ?? "";
      const plan = priceIdToPlan(priceId);

      await prisma.organization.updateMany({
        where: { stripeCustomerId: session.customer as string },
        data: { plan, stripeSubscriptionId: session.subscription as string },
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id ?? "";
      const plan = priceIdToPlan(priceId);

      await prisma.organization.updateMany({
        where: { stripeCustomerId: subscription.customer as string },
        data: { plan },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      await prisma.organization.updateMany({
        where: { stripeCustomerId: subscription.customer as string },
        data: { plan: "STARTER", stripeSubscriptionId: null },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
