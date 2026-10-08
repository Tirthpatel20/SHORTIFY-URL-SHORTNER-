import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const hashPassword = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash: hashPassword,
      })
      .returning();

    if (!newUser) {
      return Response.json(
        {
          message: "Internal Server Error",
        },
        {
          status: 500,
        },
      );
    }

    const { id, email: userEmail, createdAt, updatedAt } = newUser;
    await createSession(id, { id, email: userEmail, createdAt, updatedAt });

    return Response.json(
      {
        message: "User created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error.cause.code === "23505") {
      return Response.json(
        {
          message: "User already exists",
        },
        { status: 409 },
      );
    }

    console.error(error);

    return Response.json(
      {
        message: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
