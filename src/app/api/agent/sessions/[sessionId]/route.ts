// ============================================================================
// GET /api/agent/sessions/[sessionId]
//
// Returns the current status and results of a test session.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { sessionManager } from "@/lib/mcp/session-manager";

export const dynamic = "force-dynamic";

export async function GET(
    _request: NextRequest,
    { params }: { params: { sessionId: string } }
) {
    const { sessionId } = params;

    const session = await sessionManager.getSession(sessionId);

    if (!session) {
        return NextResponse.json(
            { error: `Session '${sessionId}' not found` },
            { status: 404 }
        );
    }

    return NextResponse.json({
        id: session.id,
        status: session.status,
        created_at: session.created_at,
        completed_at: session.completed_at,
        error: session.error,
        input: {
            target_url: session.input.target_url,
            session_id: session.input.session_id,
            // Don't send the full test plan in the response for brevity
            test_plan_length: session.input.test_plan.length,
        },
        output: session.output
            ? {
                total: session.output.total,
                passed: session.output.passed,
                failed: session.output.failed,
                duration_ms: session.output.duration_ms,
                results: session.output.results,
            }
            : null,
    });
}
