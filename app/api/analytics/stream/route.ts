import IORedis from "ioredis";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriber = new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
  });

  const channel = `analytics:user:${user.id}`;

  const stream = new ReadableStream({
    async start(controller) {
      subscriber.on("error", (error) => {
        console.error("[SSE Redis] Error:", error);
      });

      subscriber.on("message", (receivedChannel, message) => {
        if (receivedChannel !== channel) {
          return;
        }

        controller.enqueue(`data: ${message}\n\n`);
      });

      await subscriber.subscribe(channel);

      console.log(`[SSE] Subscribed to ${channel}`);

      controller.enqueue(": connected\n\n");

      request.signal.addEventListener("abort", async () => {
        console.log(`[SSE] Client disconnected: ${channel}`);

        try {
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
        } catch (error) {
          console.error("[SSE] Cleanup error:", error);
        }

        try {
          controller.close();
        } catch (error) {
          console.error("[SSE] Error closing stream:", error);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
