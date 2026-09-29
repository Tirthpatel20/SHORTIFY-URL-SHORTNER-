import { db } from "@/db";
import { sessions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

async function handleLogout() {
  const session = await getSession();
  const cookieStore = await cookies();

  if (!session) {
    return Response.json(
      {
        message: "Logged Out Successfully",
      },
      {
        status: 200,
      },
    );
  }

  cookieStore.delete("session");

  await db.delete(sessions).where(eq(sessions.id, session.id));

  return Response.json({ message: "Logged Out Successfully" }, { status: 200 });
}

export async function POST() {
  return handleLogout();
}
