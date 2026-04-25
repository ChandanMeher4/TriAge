import { NextRequest, NextResponse } from "next/server";

import { CourierAgent } from "@/lib/mcp/courier";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const configuredOwner = process.env.SENTINELQA_DEFAULT_OWNER;
    const configuredRepo = process.env.SENTINELQA_DEFAULT_REPO;
    const configuredBranch = process.env.SENTINELQA_DEFAULT_BRANCH ?? "main";

    if (!configuredOwner || !configuredRepo) {
        return NextResponse.json(
            { error: "Courier repository is not configured on the server" },
            { status: 500 }
        );
    }

    const courier = new CourierAgent();

    try {
        const body = await request.json();
        const {
            dispatch_action,
            dispatch_payload,
        } = body as {
            dispatch_action?: string;
            dispatch_payload?: {
                title?: string;
                body?: string;
                confidence_score?: number;
                session_id?: string;
                head_branch?: string;
                base_branch?: string;
            };
        };

        if (!dispatch_action || !dispatch_payload) {
            return NextResponse.json(
                { error: "Missing required fields: dispatch_action, dispatch_payload" },
                { status: 400 }
            );
        }

        if (dispatch_action === "create_issue") {
            const result = await courier.createIssueReport({
                session_id: dispatch_payload.session_id ?? `ai_${Date.now()}`,
                owner: configuredOwner,
                repo: configuredRepo,
                title: dispatch_payload.title ?? "[SentinelQA] Test failure RCA",
                body: dispatch_payload.body ?? "No issue body provided.",
                labels: ["sentinel-qa", "bug"],
            });
            return NextResponse.json(result, { status: result.success ? 200 : 502 });
        }

        if (dispatch_action === "create_pr") {
            if (!dispatch_payload.head_branch) {
                return NextResponse.json(
                    { error: "Missing required field for create_pr: dispatch_payload.head_branch" },
                    { status: 400 }
                );
            }

            const result = await courier.createFixPR({
                session_id: dispatch_payload.session_id ?? `ai_${Date.now()}`,
                owner: configuredOwner,
                repo: configuredRepo,
                base_branch: dispatch_payload.base_branch ?? configuredBranch,
                head_branch: dispatch_payload.head_branch,
                title: dispatch_payload.title ?? "[SentinelQA] Automated fix PR",
                body: dispatch_payload.body ?? "No PR body provided.",
                confidence_score: dispatch_payload.confidence_score ?? 1.0,
            });
            return NextResponse.json(result, { status: result.success ? 200 : 502 });
        }

        return NextResponse.json(
            { error: `Unsupported dispatch_action '${dispatch_action}'` },
            { status: 400 }
        );
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Internal server error" },
            { status: 500 }
        );
    } finally {
        await courier.stop();
    }
}
