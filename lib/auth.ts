import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function getSession() {
  const cookieStore = await cookies();

  const sessionId = cookieStore.get("session")?.value;

  if (!sessionId) return null;

  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (session.length === 0) return null;

  if (session[0].expiresAt <= new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    cookieStore.delete("session");
    return null;
  }

  return session[0];
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) return null;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (user.length === 0) return null;

  const { id, email, createdAt, updatedAt } = user[0];

  return { id, email, createdAt, updatedAt };
}

export async function createSession(userId: number) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();

  cookieStore.set("session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return;
}
