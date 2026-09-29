import { redis } from "@/lib/redis";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 10;

export async function checkRateLimit(userId: number) {
  const key = `rate-limit:create-link:user:${userId}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  const remaining = Math.max(0, MAX_REQUESTS - count);

  if (count > MAX_REQUESTS) {
    const ttl = await redis.ttl(key);

    return {
      allowed: false,
      remaining: 0,
      retryAfter: ttl,
    };
  }

  return {
    allowed: true,
    remaining,
    retryAfter: 0,
  };
}
