import { db } from "@/db";
import { linksTable } from "@/db/schema";
import { redis } from "@/lib/redis";
import { eq, and, gte, count } from "drizzle-orm";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 10;

export async function checkRateLimit(userId: number) {
  // 1. Try Redis rate limiting
  try {
    const key = `rate-limit:create-link:user:${userId}`;

    const redisCount = await redis.incr(key);

    if (redisCount === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    const remaining = Math.max(0, MAX_REQUESTS - redisCount);

    if (redisCount > MAX_REQUESTS) {
      const ttl = await redis.ttl(key);

      return {
        allowed: false,
        remaining: 0,
        retryAfter: ttl > 0 ? ttl : WINDOW_SECONDS,
      };
    }

    return {
      allowed: true,
      remaining,
      retryAfter: 0,
    };
  } catch {
    // 2. Database Fallback: Query PostgreSQL linksTable created in the last 60 seconds
    try {
      const oneMinuteAgo = new Date(Date.now() - WINDOW_SECONDS * 1000);

      const [result] = await db
        .select({ total: count() })
        .from(linksTable)
        .where(
          and(
            eq(linksTable.userId, userId),
            gte(linksTable.createdAt, oneMinuteAgo),
          ),
        );

      const dbCount = Number(result?.total || 0);

      if (dbCount >= MAX_REQUESTS) {
        return {
          allowed: false,
          remaining: 0,
          retryAfter: WINDOW_SECONDS,
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, MAX_REQUESTS - dbCount),
        retryAfter: 0,
      };
    } catch (dbError) {
      console.error("[Rate Limit] Database fallback error:", dbError);
      return {
        allowed: true,
        remaining: MAX_REQUESTS,
        retryAfter: 0,
      };
    }
  }
}
