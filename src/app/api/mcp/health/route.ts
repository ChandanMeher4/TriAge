// ============================================================================
// GET /api/mcp/health
//
// Diagnostic endpoint that starts the GitHub MCP server (via npx),
// runs a sequence of real API calls, and returns a full health report.
// Used by the /mcp-test visual dashboard page.
// ============================================================================

import { NextResponse } from "next/server";
import { GitHubMCPClient } from "@/lib/mcp/github-client";

// Allow up to 90s — npx needs to download the package on first run
export const maxDuration = 90;
export const dynamic = "force-dynamic";

export interface MCPCheckResult {
    name: string;
    status: "pass" | "fail" | "skip";
    durationMs: number;
    detail?: string;
    data?: unknown;
}

export interface MCPHealthReport {
    overall: "healthy" | "degraded" | "unreachable";
    timestamp: string;
    mode: "npx" | "docker";
    envCheck: {
        pat: boolean;
        owner: string | null;
        repo: string | null;
        branch: string | null;
    };
    checks: MCPCheckResult[];
    tools: string[];
    totalDurationMs: number;
}

function now() {
    return Date.now();
}

export async function GET() {
    const start = now();
    const report: MCPHealthReport = {
        overall: "unreachable",
        timestamp: new Date().toISOString(),
        mode: "npx",
        envCheck: {
            pat: !!process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
            owner: process.env.SENTINELQA_DEFAULT_OWNER ?? null,
            repo: process.env.SENTINELQA_DEFAULT_REPO ?? null,
            branch: process.env.SENTINELQA_DEFAULT_BRANCH ?? null,
        },
        checks: [],
        tools: [],
        totalDurationMs: 0,
    };

    // ── 1. Env check ──────────────────────────────────────────────────────────
    if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
        report.checks.push({
            name: "PAT Configuration",
            status: "fail",
            durationMs: 0,
            detail: "GITHUB_PERSONAL_ACCESS_TOKEN is not set in .env",
        });
        report.totalDurationMs = now() - start;
        return NextResponse.json(report, { status: 200 });
    }

    report.checks.push({
        name: "PAT Configuration",
        status: "pass",
        durationMs: 0,
        detail: `Token starts with: ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN.slice(0, 8)}...`,
    });

    // ── 2. Start MCP server ───────────────────────────────────────────────────
    const client = new GitHubMCPClient();
    const connectStart = now();

    try {
        await client.start("npx");
    } catch (err) {
        report.checks.push({
            name: "MCP Server Start (npx)",
            status: "fail",
            durationMs: now() - connectStart,
            detail: err instanceof Error ? err.message : String(err),
        });
        report.totalDurationMs = now() - start;
        return NextResponse.json(report, { status: 200 });
    }

    report.checks.push({
        name: "MCP Server Start (npx)",
        status: "pass",
        durationMs: now() - connectStart,
        detail: "GitHub MCP server spawned and initialized via npx",
    });

    // ── 3. List tools ─────────────────────────────────────────────────────────
    const toolsStart = now();
    try {
        const tools = await client.listTools();
        report.tools = tools;
        report.checks.push({
            name: "tools/list",
            status: "pass",
            durationMs: now() - toolsStart,
            detail: `${tools.length} tools available`,
            data: tools,
        });
    } catch (err) {
        report.checks.push({
            name: "tools/list",
            status: "fail",
            durationMs: now() - toolsStart,
            detail: err instanceof Error ? err.message : String(err),
        });
    }

    const owner = process.env.SENTINELQA_DEFAULT_OWNER ?? "Arpit529Srivastava";
    const repo = process.env.SENTINELQA_DEFAULT_REPO ?? "Hack-karo";
    const branch = process.env.SENTINELQA_DEFAULT_BRANCH ?? "main";

    // ── 4. List recent commits ────────────────────────────────────────────────
    const commitsStart = now();
    try {
        const result = await client.listCommits(owner, repo, { per_page: 5 });
        if (result.success) {
            const raw = result.content?.find((c) => c.type === "text")?.text;
            let parsed: unknown = raw;
            try { parsed = JSON.parse(raw ?? ""); } catch { /* keep raw */ }
            report.checks.push({
                name: `list_commits (${owner}/${repo})`,
                status: "pass",
                durationMs: now() - commitsStart,
                detail: "Fetched last 5 commits successfully",
                data: parsed,
            });
        } else {
            report.checks.push({
                name: `list_commits (${owner}/${repo})`,
                status: "fail",
                durationMs: now() - commitsStart,
                detail: result.error ?? "Unknown error",
            });
        }
    } catch (err) {
        report.checks.push({
            name: `list_commits (${owner}/${repo})`,
            status: "fail",
            durationMs: now() - commitsStart,
            detail: err instanceof Error ? err.message : String(err),
        });
    }

    // ── 5. Get file contents (README.md) ──────────────────────────────────────
    const fileStart = now();
    try {
        const result = await client.getFileContents(owner, repo, "README.md", branch);
        if (result.success) {
            const raw = result.content?.find((c) => c.type === "text")?.text ?? "";
            report.checks.push({
                name: `get_file_contents (README.md)`,
                status: "pass",
                durationMs: now() - fileStart,
                detail: `Read ${raw.length} characters from README.md`,
                data: raw.slice(0, 200) + (raw.length > 200 ? "..." : ""),
            });
        } else {
            report.checks.push({
                name: `get_file_contents (README.md)`,
                status: "fail",
                durationMs: now() - fileStart,
                detail: result.error ?? "Unknown error",
            });
        }
    } catch (err) {
        report.checks.push({
            name: `get_file_contents (README.md)`,
            status: "fail",
            durationMs: now() - fileStart,
            detail: err instanceof Error ? err.message : String(err),
        });
    }

    // ── 6. List open PRs ──────────────────────────────────────────────────────
    const prsStart = now();
    try {
        const result = await client.listPullRequests(owner, repo, "open");
        if (result.success) {
            const raw = result.content?.find((c) => c.type === "text")?.text;
            let parsed: unknown = raw;
            try { parsed = JSON.parse(raw ?? ""); } catch { /* keep raw */ }
            report.checks.push({
                name: `list_pull_requests (open)`,
                status: "pass",
                durationMs: now() - prsStart,
                detail: "Pull requests fetched successfully",
                data: parsed,
            });
        } else {
            report.checks.push({
                name: `list_pull_requests (open)`,
                status: "fail",
                durationMs: now() - prsStart,
                detail: result.error ?? "Unknown error",
            });
        }
    } catch (err) {
        report.checks.push({
            name: `list_pull_requests (open)`,
            status: "fail",
            durationMs: now() - prsStart,
            detail: err instanceof Error ? err.message : String(err),
        });
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────
    await client.stop();

    // ── Overall health ────────────────────────────────────────────────────────
    const passed = report.checks.filter((c) => c.status === "pass").length;
    const failed = report.checks.filter((c) => c.status === "fail").length;

    if (failed === 0) {
        report.overall = "healthy";
    } else if (passed > 0) {
        report.overall = "degraded";
    } else {
        report.overall = "unreachable";
    }

    report.totalDurationMs = now() - start;
    return NextResponse.json(report, { status: 200 });
}
