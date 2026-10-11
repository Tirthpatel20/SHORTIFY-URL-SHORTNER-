import { db } from "@/db";
import { clicksTable, linksTable } from "@/db/schema";
import { redis } from "@/lib/redis";
import { clicksQueue } from "@/lib/queues";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  // 1. Try fetching from Redis cache
  let cachedUrl: {
    originalUrl: string;
    linkId: number;
    userId: number;
  } | null = null;

  try {
    cachedUrl = await redis.get(`link:${shortCode}`);
  } catch {
    // Redis unavailable: proceed directly to database
  }

  if (cachedUrl) {
    try {
      await clicksQueue.add(
        "record-click",
        {
          linkId: cachedUrl.linkId,
          userId: cachedUrl.userId,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: true,
        },
      );
    } catch {
      // Redis queue unavailable: record click directly in database
      try {
        await db.insert(clicksTable).values({ linkId: cachedUrl.linkId });
        await db
          .update(linksTable)
          .set({ clickCount: sql`${linksTable.clickCount} + 1` })
          .where(eq(linksTable.id, cachedUrl.linkId));
      } catch (dbErr) {
        console.error("Direct DB click write error:", dbErr);
      }
    }

    return Response.redirect(cachedUrl.originalUrl, 302);
  }

  // 2. Fetch link from database
  const link = await db
    .select()
    .from(linksTable)
    .where(eq(linksTable.shortCode, shortCode))
    .limit(1);

  if (link.length === 0) {
    return Response.json({ error: "Link not found" }, { status: 404 });
  }

  const { id: linkId, userId, originalUrl } = link[0];

  // 3. Record click (BullMQ queue with direct DB write fallback)
  try {
    await clicksQueue.add(
      "record-click",
      {
        linkId,
        userId,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
      },
    );
  } catch {
    // Redis queue unavailable: record click directly in database
    try {
      await db.insert(clicksTable).values({ linkId });
      await db
        .update(linksTable)
        .set({ clickCount: sql`${linksTable.clickCount} + 1` })
        .where(eq(linksTable.id, linkId));
    } catch (dbErr) {
      console.error("Direct DB click write error:", dbErr);
    }
  }

  // 4. Try caching link in Redis
  try {
    await redis.set(
      `link:${shortCode}`,
      {
        originalUrl,
        linkId,
        userId,
      },
      {
        ex: 60 * 60,
      },
    );
  } catch {
    // Redis unavailable: ignore
  }

  return Response.redirect(originalUrl, 302);
}
