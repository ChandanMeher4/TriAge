// ============================================================================
// POST /api/agent/repos/check
//
// Trigger a check on a watched repo via the GitHub MCP server.
// This reads the repo's recent commits, file structure, and key files.
// Returns the code context that the AI agent would use to generate test plans.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { repoWatcher } from "@/lib/mcp/repo-watcher";
import { notifyAgentTriggered } from "@/lib/notifications/slack";

/**
 * POST /api/agent/repos/check
 *
 * Body:
 * {
 *   "owner": "Arpit529Srivastava",
 *   "repo": "Hack-karo"
 * }
 *
 * Response: repo check results including commits, changed files, and code context
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { owner, repo } = body;

        if (!owner || !repo) {
            return NextResponse.json(
                { error: "Missing required fields: owner, repo" },
                { status: 400 }
            );
        }

        // Check if PAT is configured
        if (
            !process.env.GITHUB_PERSONAL_ACCESS_TOKEN &&
            !process.env.GITHUB_PAT
        ) {
            return NextResponse.json(
                {
                    error: "GitHub PAT not configured",
                    help: "Set GITHUB_PERSONAL_ACCESS_TOKEN in .env.local",
                    setup_steps: [
                        "1. Create a GitHub PAT at https://github.com/settings/personal-access-tokens/new",
                        "2. Grant 'repo' scope (read access)",
                        "3. Create .env.local in project root",
                        "4. Add: GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token",
                        "5. Restart the dev server",
                    ],
                },
                { status: 400 }
            );
        }

        // Check if repo is being watched
        const watched = repoWatcher.getRepo(owner, repo);
        if (!watched) {
            return NextResponse.json(
                {
                    error: `Repo ${owner}/${repo} is not being watched`,
                    help: "First add the repo via POST /api/agent/repos",
                },
                { status: 404 }
            );
        }

        // Run the check via GitHub MCP
        const check = await repoWatcher.checkRepo(owner, repo);

        // 🔔 Notify Slack when new commits are detected (fire-and-forget, non-blocking)
        if (check.hasChanges && check.newCommits.length > 0) {
            void notifyAgentTriggered(
                owner,
                repo,
                watched?.branch ?? "main",
                check.newCommits.length,
                check.newCommits.map((c) => ({
                    sha: c.sha,
                    message: c.message,
                    author: c.author,
                }))
            );
        }

        return NextResponse.json({
            status: "checked",
            has_changes: check.hasChanges,
            new_commits: check.newCommits.length,
            commits: check.newCommits,
            changed_files: check.changedFiles,
            code_context_length: check.codeContext.length,
            code_context_preview: check.codeContext.substring(0, 500),
            repo: check.repo,
        });
    } catch (err) {
        const errorMessage =
            err instanceof Error ? err.message : "Failed to check repo";
        console.error("[API /agent/repos/check] Error:", errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
