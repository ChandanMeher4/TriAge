import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json({
        owner: process.env.SENTINELQA_DEFAULT_OWNER || "Not Set",
        repo: process.env.SENTINELQA_DEFAULT_REPO || "Not Set",
        targetUrl: process.env.SENTINELQA_TARGET_URL || "Not Set",
        aiEngine: process.env.AI_ENGINE_URL || "Not Set",
    });
}
