// ============================================================================
// POST   /api/agent/repos  → Add a repo to watch
// GET    /api/agent/repos  → List all watched repos
// DELETE /api/agent/repos  → Remove a repo from watch list
//
// This is how you "connect" a GitHub repo to SentinelQA.
// The AI agent will use the GitHub MCP server to read code from these repos.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { repoWatcher } from "@/lib/mcp/repo-watcher";

/**
 * POST /api/agent/repos
 * Add a GitHub repository to the watch list.
 *
 * Body:
 * {
 *   "owner": "Arpit529Srivastava",
 *   "repo": "Hack-karo",
 *   "branch": "main",           // optional, defaults to "main"
 *   "target_url": "http://localhost:3000"  // deployed app URL to test
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { owner, repo, branch, target_url } = body;

        if (!owner || !repo || !target_url) {
            return NextResponse.json(
                {
                    error: "Missing required fields: owner, repo, target_url",
                    example: {
                        owner: "Arpit529Srivastava",
                        repo: "Hack-karo",
                        branch: "main",
                        target_url: "http://localhost:3000",
                    },
                },
                { status: 400 }
            );
        }

        const watched = repoWatcher.addRepo({
            owner,
            repo,
            branch: branch ?? "main",
            targetUrl: target_url,
        });

        return NextResponse.json({
            message: `Repository ${owner}/${repo} added to watch list`,
            repo: watched,
        });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to add repo" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/agent/repos
 * List all watched repositories.
 */
export async function GET() {
    const repos = repoWatcher.listRepos();
    return NextResponse.json({
        count: repos.length,
        repos,
    });
}

/**
 * DELETE /api/agent/repos
 * Remove a repository from the watch list.
 *
 * Body: { "owner": "...", "repo": "..." }
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { owner, repo } = body;

        if (!owner || !repo) {
            return NextResponse.json(
                { error: "Missing required fields: owner, repo" },
                { status: 400 }
            );
        }

        const removed = repoWatcher.removeRepo(owner, repo);

        if (removed) {
            return NextResponse.json({
                message: `Repository ${owner}/${repo} removed from watch list`,
            });
        } else {
            return NextResponse.json(
                { error: `Repository ${owner}/${repo} is not being watched` },
                { status: 404 }
            );
        }
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to remove repo" },
            { status: 500 }
        );
    }
}
