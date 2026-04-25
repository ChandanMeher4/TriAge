// ============================================================================
// POST /api/courier/issue
//
// Creates a GitHub Issue reporting test failures detected by SentinelQA.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CourierAgent } from "@/lib/mcp/courier";

export async function POST(request: NextRequest) {
  // Require an authenticated session to prevent abuse of the server GitHub PAT
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Restrict to the server-configured repo so callers cannot target arbitrary repos
  const configuredOwner = process.env.SENTINELQA_DEFAULT_OWNER;
  const configuredRepo  = process.env.SENTINELQA_DEFAULT_REPO;
  if (!configuredOwner || !configuredRepo) {
    return NextResponse.json(
      { error: "Issue repository is not configured on the server" },
      { status: 500 }
    );
  }

  const courier = new CourierAgent();

  try {
    const body = await request.json();
    const {
      session_id,
      title,
      body: issueBody,
      labels,
    } = body;

    if (!title || !issueBody) {
      return NextResponse.json(
        { error: "Missing required fields: title, body" },
        { status: 400 }
      );
    }

    const result = await courier.createIssueReport({
      session_id: session_id ?? `manual_${Date.now()}`,
      owner: configuredOwner,
      repo: configuredRepo,
      title,
      body: issueBody,
      labels: labels ?? ["sentinel-qa", "bug"],
    });

    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  } finally {
    await courier.stop();
  }
}
