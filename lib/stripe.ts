import "server-only";

import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

/** Maps a Stripe price ID env var back to a plan name. */
export function priceIdToPlan(priceId: string): string {
  const map: Record<string, string> = {};
  if (process.env.STRIPE_PRICE_STARTER) map[process.env.STRIPE_PRICE_STARTER] = "STARTER";
  if (process.env.STRIPE_PRICE_GROWTH) map[process.env.STRIPE_PRICE_GROWTH] = "GROWTH";
  if (process.env.STRIPE_PRICE_ENTERPRISE) map[process.env.STRIPE_PRICE_ENTERPRISE] = "ENTERPRISE";
  return map[priceId] ?? "STARTER";
}
