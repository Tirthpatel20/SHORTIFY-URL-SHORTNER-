import IORedis from "ioredis";

export const workerRedis = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

workerRedis.on("error", (error) => {
  console.error("[Worker Redis] Error:", error);
});

workerRedis.on("connect", () => {
  console.log("[Worker Redis] Connected");
});

workerRedis.on("ready", () => {
  console.log("[Worker Redis] Ready");
});

workerRedis.on("close", () => {
  console.log("[Worker Redis] Connection closed");
});

workerRedis.on("reconnecting", (delay: number) => {
  console.log(`[Worker Redis] Reconnecting in ${delay}ms`);
});
