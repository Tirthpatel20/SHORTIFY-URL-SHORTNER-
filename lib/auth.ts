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
    } catch {
      // Redis unavailable: ignore
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

  // 1. Try fetching cached user session from Redis
  try {
    const cachedUser = await redis.get<UserSession>(`session:${sessionId}`);
    if (cachedUser) {
      return cachedUser;
    }
  } catch {
    // Redis unavailable: ignore and fall back to database
  }

  // 2. Database query: Fetch session + user in a single SQL JOIN query
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
    } catch {
      // Redis unavailable: ignore
    }
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    cookieStore.delete("session");
    return null;
  }

  // 4. Try caching user in Redis until session expires
  const ttlSeconds = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );

  if (ttlSeconds > 0) {
    try {
      await redis.set(`session:${sessionId}`, userData, { ex: ttlSeconds });
    } catch {
      // Redis unavailable: ignore
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
  } catch {
    // Redis unavailable: ignore
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
    } catch {
      // Redis unavailable: ignore
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
