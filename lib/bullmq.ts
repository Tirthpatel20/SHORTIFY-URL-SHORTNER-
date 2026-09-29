import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export const queueRedis = new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 1,
})

queueRedis.on("error", (error) => {
  console.error("[Queue Redis] Error:", error);
});