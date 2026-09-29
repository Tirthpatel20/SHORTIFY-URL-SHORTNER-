import { db } from "@/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user.length === 0)
    return Response.json(
      { message: "Invalid email or password" },
      { status: 401 },
    );

  const correctPassword = await bcrypt.compare(password, user[0].passwordHash);

  if (correctPassword) {
    await createSession(user[0].id);

    return Response.json({ message: "Login success" }, { status: 200 });
  }

  return Response.json(
    { message: "Invalid email or password" },
    { status: 401 },
  );
}
