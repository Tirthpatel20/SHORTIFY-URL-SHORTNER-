import { Queue } from "bullmq";
import { queueRedis } from "./bullmq";

export const clicksQueue = new Queue("clicks", { connection: queueRedis });
