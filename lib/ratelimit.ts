import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  prefix: "clientpulse:rl",
  analytics: false,
});

/** Rate-limit an arbitrary identifier (e.g. IP or user ID). Fails open. */
export async function rateLimit(
  identifier: string,
): Promise<{ success: boolean; limit: number; remaining: number }> {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return { success: true, limit: 10, remaining: 10 };
  }

  try {
    const result = await ratelimit.limit(identifier);
    return { success: result.success, limit: result.limit, remaining: result.remaining };
  } catch {
    // Fail open — if Redis is unreachable, let the request through.
    return { success: true, limit: 10, remaining: 10 };
  }
}

/** Convenience: rate-limit by the caller's IP address. */
export async function rateLimitByIp(): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
}> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ??
    hdrs.get("x-real-ip") ??
    "anonymous";
  return rateLimit(`ip:${ip}`);
}
