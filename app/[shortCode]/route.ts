import { db } from "@/db";
import { linksTable } from "@/db/schema";
import { redis } from "@/lib/redis";
import { eq } from "drizzle-orm";
import { clicksQueue } from "@/lib/queues";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  const cachedUrl = await redis.get<{
    originalUrl: string;
    linkId: string;
    userId: string;
  }>(`link:${shortCode}`);

  if (cachedUrl) {
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
    return Response.redirect(cachedUrl.originalUrl, 302);
  }

  const link = await db
    .select()
    .from(linksTable)
    .where(eq(linksTable.shortCode, shortCode))
    .limit(1);

  if (link.length === 0)
    return Response.json({ error: "Link not found" }, { status: 404 });

  await clicksQueue.add(
    "record-click",
    {
      linkId: link[0].id,
      userId: link[0].userId,
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

  const { originalUrl } = link[0];

  await redis.set(
    `link:${shortCode}`,
    {
      originalUrl,
      linkId: link[0].id,
      userId: link[0].userId,
    },
    {
      ex: 60 * 60,
    },
  );

  return Response.redirect(originalUrl, 302);
}
