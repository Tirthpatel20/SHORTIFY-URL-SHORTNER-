import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { redis } from "@/lib/redis";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import crypto from "crypto";

export type UserSession = {
  id: number;
  email: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

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
    try {
      await redis.del(`session:${sessionId}`);
    } catch (err) {
      console.error("Redis session delete error:", err);
    }
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    cookieStore.delete("session");
    return null;
  }

  return session[0];
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (!sessionId) return null;

  // 1. Try fetching cached user session from Redis (takes ~15-20ms)
  try {
    const cachedUser = await redis.get<UserSession>(`session:${sessionId}`);
    if (cachedUser) {
      return cachedUser;
    }
  } catch (err) {
    console.error("Redis get session error, falling back to database:", err);
  }

  // 2. Cache miss: Fetch session + user in a SINGLE SQL JOIN query
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const { expiresAt, ...userData } = rows[0];

  // 3. Check expiration
  if (new Date(expiresAt) <= new Date()) {
    try {
      await redis.del(`session:${sessionId}`);
    } catch (err) {
      console.error("Redis session delete error:", err);
    }
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    cookieStore.delete("session");
    return null;
  }

  // 4. Cache user in Redis until session expires
  const ttlSeconds = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );

  if (ttlSeconds > 0) {
    try {
      await redis.set(`session:${sessionId}`, userData, { ex: ttlSeconds });
    } catch (err) {
      console.error("Redis set session error:", err);
    }
  }

  return userData;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (!sessionId) return;

  cookieStore.delete("session");

  try {
    await redis.del(`session:${sessionId}`);
  } catch (err) {
    console.error("Redis delete session error:", err);
  }

  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function createSession(userId: number, userObj?: UserSession) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  if (userObj) {
    try {
      await redis.set(`session:${sessionId}`, userObj, {
        ex: 7 * 24 * 60 * 60,
      });
    } catch (err) {
      console.error("Redis pre-warm session error:", err);
    }
  }

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

