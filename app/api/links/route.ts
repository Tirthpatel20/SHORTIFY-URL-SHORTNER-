import { db } from "@/db";
import { linksTable } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateShortCode } from "@/lib/short-code";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(user.id);

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: "Too many requests",
        retryAfter: rateLimit.retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter),
        },
      },
    );
  }

  const { originalUrl } = await req.json();

  if (!originalUrl || typeof originalUrl !== "string") {
    return Response.json(
      { error: "A valid originalURL is required" },
      { status: 400 },
    );
  }

  let url: URL;

  try {
    url = new URL(originalUrl);
  } catch {
    return Response.json({ error: "Please send a valid URL" }, { status: 400 });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return Response.json({ error: "Please send a valid URL" }, { status: 400 });
  }

  const shortCode = generateShortCode();

  await db.insert(linksTable).values({
    userId: user.id,
    shortCode,
    originalUrl,
  });

  return Response.json(
    {
      message: "Short URL created successfully",
      shortCode: shortCode,
    },
    { status: 201 },
  );
}
