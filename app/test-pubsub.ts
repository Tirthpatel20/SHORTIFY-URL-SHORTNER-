import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const subscriber = new IORedis(process.env.REDIS_URL!);

subscriber.on("error", (error) => {
  console.error("[Subscriber] Error:", error);
});

async function main() {
  await subscriber.subscribe("analytics:user:5");

  console.log("Subscribed to analytics:user:5");

  subscriber.on("message", (channel, message) => {
    console.log("Received message:");
    console.log("Channel:", channel);
    console.log("Message:", message);
  });
}

main().catch(console.error);
