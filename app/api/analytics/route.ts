import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { linksTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await db
    .select()
    .from(linksTable)
    .where(eq(linksTable.userId, user.id));

  return Response.json({ links }, { status: 200 });
}
