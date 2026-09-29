import { Worker } from "bullmq";
import { db } from "@/db";
import { clicksTable, linksTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { workerRedis } from "@/lib/workerRedis";
import { pubSubRedis } from "@/lib/pubSubRedis";



const worker = new Worker(
  "clicks",
  async (job) => {
    if (job.name !== "record-click") {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    const { linkId, userId } = job.data;

    console.log("Processing click:", {
      linkId,
      userId,
    });

    const result = await db.transaction(async (tx) => {
      await tx.insert(clicksTable).values({
        linkId,
      });

      const [updatedLink] = await tx
        .update(linksTable)
        .set({
          clickCount: sql`${linksTable.clickCount} + 1`,
        })
        .where(eq(linksTable.id, linkId))
        .returning({
          clickCount: linksTable.clickCount,
        });
      return updatedLink;
    });

    await pubSubRedis.publish(
      `analytics:user:${userId}`,
      JSON.stringify({
        type: "click",
        linkId,
        clickCount: result.clickCount,
      }),
    );

    console.log("Published analytics event:", {
      channel: `analytics:user:${userId}`,
    });
  },
  {
    connection: workerRedis,
  },
);

console.log("Click worker is running...");

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});
