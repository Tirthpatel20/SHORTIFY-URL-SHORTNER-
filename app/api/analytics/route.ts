import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { linksTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {

  console.time("analytics: getCurrentUser");

  const user = await getCurrentUser();

  console.timeEnd("analytics: getCurrentUser");

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.time("analytics: links query");
  const links = await db
    .select()
    .from(linksTable)
    .where(eq(linksTable.userId, user.id));

  console.timeEnd("analytics: links query");
  return Response.json({ links }, { status: 200 });
}
