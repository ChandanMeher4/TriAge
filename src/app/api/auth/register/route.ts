import { NextResponse } from "next/server";
import { registerUser } from "@/lib/controllers/auth.controller";

/**
 * POST /api/auth/register
 * Body: { name: string, email: string, password: string }
 * Creates a new credentials user in MongoDB.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await registerUser(body.name, body.email, body.password);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
