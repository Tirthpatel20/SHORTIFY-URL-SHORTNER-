import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { clicksQueue } from "@/lib/queues";

async function main() {
  const job = await clicksQueue.add("record-click", {
    linkId: 1,
  });

  console.log(`Added job ${job.id}`);

  await clicksQueue.close();
}

main().catch(console.error);
