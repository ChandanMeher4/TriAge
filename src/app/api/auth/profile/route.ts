import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateProfile } from "@/lib/controllers/auth.controller";

/**
 * PUT /api/auth/profile
 * Body: { name?: string, image?: string }
 * Updates the name and/or avatar URL for the authenticated user.
 * Protected — returns 401 if not signed in.
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json(
        { error: "Session user id missing." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const result = await updateProfile(userId, body);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
