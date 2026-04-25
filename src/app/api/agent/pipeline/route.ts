// ============================================================================
// POST /api/agent/pipeline
//
// Runs the full SentinelQA pipeline:
//   1. Reads code from GitHub MCP (or uses fallback context)
//   2. Generates a test plan (AI-simulated for now)
//   3. Executes tests via Playwright MCP
//   4. Returns results
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { AgentOrchestrator } from "@/lib/mcp/orchestrator";
import {
    notifyPipelineStarted,
    notifyTestsPassed,
    notifyTestsFailed,
    notifyPipelineError,
} from "@/lib/notifications/slack";

export async function POST(request: NextRequest) {
    let owner = "";
    let repo = "";
    let branch = "main";
    let target_url = "";

    try {
        const body = await request.json();
        ({
            owner,
            repo,
            branch = "main",
            target_url,
        } = body as { owner: string; repo: string; branch?: string; target_url: string });

        const { github_token, github_mcp_mode = "docker" } = body;

        if (!owner || !repo || !target_url) {
            return NextResponse.json(
                { error: "Missing required fields: owner, repo, target_url" },
                { status: 400 }
            );
        }

        // 🔔 Notify Slack: pipeline manually started (no commit context here)
        void notifyPipelineStarted(owner, repo, branch, target_url);

        const orchestrator = new AgentOrchestrator({
            owner,
            repo,
            branch,
            targetUrl: target_url,
            githubToken: github_token,
            githubMcpMode: github_mcp_mode,
        });

        const { codeContext, testPlan, results, courier, pr } =
            await orchestrator.runFullPipeline();

        // 🔔 Notify Slack: test results (fire-and-forget — does not block response)
        if (results.failed > 0) {
            const failedSteps = results.results
                .filter((r) => r.status !== "passed")
                .map((r) => ({ step: r.name, error: r.error }));
            void notifyTestsFailed(
                owner, repo, target_url,
                results.passed, results.failed, results.total,
                results.duration_ms, results.session_id, failedSteps
            );
        } else {
            void notifyTestsPassed(
                owner, repo, target_url,
                results.total, results.duration_ms, results.session_id
            );
        }

        return NextResponse.json({
            pipeline: "completed",
            session_id: results.session_id,
            code_context_length: codeContext.length,
            test_plan: testPlan,
            results: {
                total: results.total,
                passed: results.passed,
                failed: results.failed,
                duration_ms: results.duration_ms,
                details: results.results,
            },
            courier: courier ? {
                type: courier.type,
                url: courier.url,
                number: courier.number,
            } : undefined,
            pr: pr ? {
                url: pr.url,
                number: pr.number,
                files: pr.files,
            } : undefined,
        });
    } catch (err) {
        const errorMessage =
            err instanceof Error ? err.message : "Internal server error";
        console.error("[API /agent/pipeline] Error:", errorMessage);

        // 🔔 Notify Slack: pipeline error (fire-and-forget)
        if (owner && repo) {
            void notifyPipelineError(owner, repo, "Pipeline Execution", errorMessage);
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
