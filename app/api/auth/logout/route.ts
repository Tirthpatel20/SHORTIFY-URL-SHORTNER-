import { destroySession } from "@/lib/auth";

async function handleLogout() {
  await destroySession();
  return Response.json({ message: "Logged Out Successfully" }, { status: 200 });
}

export async function POST() {
  return handleLogout();
}
