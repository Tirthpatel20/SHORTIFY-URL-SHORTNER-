import { NextResponse } from "next/server";
import { db } from "@/db";
import { linksTable, clicksTable } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const linkId = parseInt(id, 10);

  if (isNaN(linkId)) {
    return NextResponse.json({ error: "Invalid link ID" }, { status: 400 });
  }

  // Fetch link to get shortCode and verify ownership
  const existingLinks = await db
    .select()
    .from(linksTable)
    .where(and(eq(linksTable.id, linkId), eq(linksTable.userId, user.id)))
    .limit(1);

  if (existingLinks.length === 0) {
    return NextResponse.json(
      { error: "Link not found or unauthorized" },
      { status: 404 }
    );
  }

  const link = existingLinks[0];

  try {
    // 1. Delete cached link from Redis
    if (link.shortCode) {
      await redis.del(`link:${link.shortCode}`);
    }

    // 2. Delete click records from DB
    await db.delete(clicksTable).where(eq(clicksTable.linkId, linkId));

    // 3. Delete link record from DB
    await db
      .delete(linksTable)
      .where(and(eq(linksTable.id, linkId), eq(linksTable.userId, user.id)));

    return NextResponse.json(
      { message: "Link successfully deleted from database and Redis cache" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete link:", error);
    return NextResponse.json(
        { error: "Failed to delete link" },
      { status: 500 }
    );
  }
}
