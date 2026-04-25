import { NextRequest } from "next/server";
import { AgentOrchestrator } from "@/lib/mcp/orchestrator";
import {
    notifyPipelineStarted,
    notifyTestsPassed,
    notifyTestsFailed,
    notifyPipelineError,
} from "@/lib/notifications/slack";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();
    
    // Create a stream
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: string, data: any) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            let owner = "";
            let repo = "";
            
            try {

                let body: any = {};
                try {
                    body = await request.json();
                } catch {
                    // Empty body is fine
                }
                
                owner = body.owner || process.env.SENTINELQA_DEFAULT_OWNER;
                repo = body.repo || process.env.SENTINELQA_DEFAULT_REPO;
                const branch = body.branch || process.env.SENTINELQA_DEFAULT_BRANCH || "main";
                const target_url = body.target_url || process.env.SENTINELQA_TARGET_URL;
                const github_token = body.github_token || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
                const github_mcp_mode = body.github_mcp_mode || "npx";

                if (!owner || !repo || !target_url) {
                    sendEvent("error", { error: "Missing required fields: owner, repo, target_url (and not found in env)" });
                    controller.close();
                    return;
                }

                // 🔔 Notify Slack
                void notifyPipelineStarted(owner, repo, branch, target_url);

                const orchestrator = new AgentOrchestrator({
                    owner,
                    repo,
                    branch,
                    targetUrl: target_url,
                    githubToken: github_token,
                    githubMcpMode: github_mcp_mode,
                });

                // Run the pipeline and pass the SSE callback
                const { results } = await orchestrator.runFullPipeline((eventName, payload) => {
                    sendEvent(eventName, payload);
                });

                // 🔔 Notify Slack: test results
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

                controller.close();
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Internal server error";
                console.error("[API /agent/pipeline/stream] Error:", errorMessage);

                if (owner && repo) {
                    void notifyPipelineError(owner, repo, "Pipeline Execution", errorMessage);
                }

                sendEvent("error", { error: errorMessage });
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
