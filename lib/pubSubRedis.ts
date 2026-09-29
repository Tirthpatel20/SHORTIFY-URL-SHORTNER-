import IORedis from "ioredis";

export const pubSubRedis = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

pubSubRedis.on("error", (error) => {
  console.error("[PubSub Redis] Error :", error);
});
