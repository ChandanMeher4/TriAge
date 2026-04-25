// ============================================================================
// SentinelQA — Repo Watcher
//
// Watches a GitHub repository via the GitHub MCP server.
// Reads the repo structure, recent commits, and changed files.
// Generates context that the AI agent uses to create test plans.
//
// How to add a repo:
//   1. Set GITHUB_PERSONAL_ACCESS_TOKEN in .env.local
//   2. Call POST /api/agent/repos with { owner, repo, branch, target_url }
//   3. Call POST /api/agent/repos/check to trigger a check
// ============================================================================

import { ChildProcess, spawn } from "child_process";

// ── Types ───────────────────────────────────────────────────────────────────

export interface WatchedRepo {
    /** GitHub owner/org */
    owner: string;
    /** Repository name */
    repo: string;
    /** Branch to watch */
    branch: string;
    /** The deployed URL of this app (where Playwright tests it) */
    targetUrl: string;
    /** Last commit SHA that was checked */
    lastCheckedSha?: string;
    /** When it was last checked */
    lastCheckedAt?: string;
    /** Status */
    status: "idle" | "checking" | "error";
}

export interface RepoCheck {
    /** The repo that was checked */
    repo: WatchedRepo;
    /** New commits found since last check */
    newCommits: CommitInfo[];
    /** Changed files across the new commits */
    changedFiles: string[];
    /** Code context extracted from the repo */
    codeContext: string;
    /** Whether new changes were detected */
    hasChanges: boolean;
}

export interface CommitInfo {
    sha: string;
    message: string;
    author: string;
    date: string;
}

// ── JSON-RPC ────────────────────────────────────────────────────────────────

interface JRPCRes {
    jsonrpc: "2.0";
    id: number;
    result?: unknown;
    error?: { code: number; message: string };
}

// ── Repo Store (in-memory, swappable to MongoDB) ────────────────────────────

const watchedRepos = new Map<string, WatchedRepo>();

function repoKey(owner: string, repo: string): string {
    return `${owner}/${repo}`;
}

// ── Repo Watcher ────────────────────────────────────────────────────────────

export class RepoWatcher {
    private githubToken: string;

    constructor(githubToken?: string) {
        this.githubToken =
            githubToken ??
            process.env.GITHUB_PERSONAL_ACCESS_TOKEN ??
            process.env.GITHUB_PAT ??
            "";
    }

    // ── Repo Management ───────────────────────────────────────────────────

    /**
     * Add a repository to watch.
     */
    addRepo(config: {
        owner: string;
        repo: string;
        branch?: string;
        targetUrl: string;
    }): WatchedRepo {
        const repo: WatchedRepo = {
            owner: config.owner,
            repo: config.repo,
            branch: config.branch ?? "main",
            targetUrl: config.targetUrl,
            status: "idle",
        };

        watchedRepos.set(repoKey(repo.owner, repo.repo), repo);
        console.log(`[Repo Watcher] Added ${repo.owner}/${repo.repo} (${repo.branch})`);
        return repo;
    }

    /**
     * Remove a repository from watch list.
     */
    removeRepo(owner: string, repo: string): boolean {
        return watchedRepos.delete(repoKey(owner, repo));
    }

    /**
     * List all watched repositories.
     */
    listRepos(): WatchedRepo[] {
        return Array.from(watchedRepos.values());
    }

    /**
     * Get a specific watched repo.
     */
    getRepo(owner: string, repo: string): WatchedRepo | undefined {
        return watchedRepos.get(repoKey(owner, repo));
    }

    // ── Repo Check ────────────────────────────────────────────────────────

    /**
     * Check a repo for changes using the GitHub MCP server.
     * Reads recent commits, changed files, and key source files.
     */
    async checkRepo(owner: string, repo: string): Promise<RepoCheck> {
        const watched = watchedRepos.get(repoKey(owner, repo));
        if (!watched) {
            throw new Error(`Repo ${owner}/${repo} is not being watched`);
        }

        if (!this.githubToken) {
            throw new Error(
                "GITHUB_PERSONAL_ACCESS_TOKEN is required. Set it in .env.local"
            );
        }

        watched.status = "checking";
        watchedRepos.set(repoKey(owner, repo), watched);

        console.log(`[Repo Watcher] Checking ${owner}/${repo}...`);

        // Spawn the GitHub MCP server
        const mcp = new GitHubMCPWrapper(this.githubToken);

        try {
            await mcp.start();

            // 1. Get recent commits
            const commitsResult = await mcp.callTool("list_commits", {
                owner,
                repo,
                sha: watched.branch,
                per_page: 10,
            });

            const commits = this.parseCommits(commitsResult);
            const newCommits = watched.lastCheckedSha
                ? commits.filter((c) => c.sha !== watched.lastCheckedSha)
                : commits;

            // 2. Get repo file structure
            const rootResult = await mcp.callTool("get_file_contents", {
                owner,
                repo,
                path: "",
                branch: watched.branch,
            });

            // 3. Read key files for code context
            let codeContext = `## Repository: ${owner}/${repo}\n`;
            codeContext += `### Branch: ${watched.branch}\n`;
            codeContext += `### Recent Commits: ${newCommits.length} new\n\n`;

            for (const c of newCommits.slice(0, 5)) {
                codeContext += `- ${c.sha.substring(0, 7)}: ${c.message} (${c.author})\n`;
            }

            // Read file structure
            if (rootResult.ok) {
                codeContext += `\n### Root Files:\n${rootResult.text.substring(0, 500)}\n`;
            }

            // Try to read important files
            for (const file of ["package.json", "README.md"]) {
                const fileResult = await mcp.callTool("get_file_contents", {
                    owner,
                    repo,
                    path: file,
                    branch: watched.branch,
                });
                if (fileResult.ok) {
                    codeContext += `\n### ${file}:\n${fileResult.text.substring(0, 300)}\n`;
                }
            }

            // 4. Figure out changed files from commit messages
            const changedFiles = this.extractChangedFiles(newCommits);

            // Update state
            if (commits.length > 0) {
                watched.lastCheckedSha = commits[0].sha;
            }
            watched.lastCheckedAt = new Date().toISOString();
            watched.status = "idle";
            watchedRepos.set(repoKey(owner, repo), watched);

            await mcp.stop();

            const result: RepoCheck = {
                repo: watched,
                newCommits,
                changedFiles,
                codeContext,
                hasChanges: newCommits.length > 0,
            };

            console.log(
                `[Repo Watcher] Check complete — ${newCommits.length} new commits found`
            );
            return result;
        } catch (err) {
            watched.status = "error";
            watchedRepos.set(repoKey(owner, repo), watched);
            await mcp.stop();
            throw err;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private parseCommits(result: { ok: boolean; text: string }): CommitInfo[] {
        if (!result.ok) return [];
        try {
            // The MCP returns JSON text with commit info
            const data = JSON.parse(result.text);
            if (Array.isArray(data)) {
                return data.map((c: Record<string, unknown>) => ({
                    sha: String((c as { sha?: string }).sha ?? ""),
                    message: String(
                        ((c as { commit?: { message?: string } }).commit?.message ?? "").split("\n")[0]
                    ),
                    author: String(
                        (c as { commit?: { author?: { name?: string } } }).commit?.author?.name ?? "unknown"
                    ),
                    date: String(
                        (c as { commit?: { author?: { date?: string } } }).commit?.author?.date ?? ""
                    ),
                }));
            }
        } catch {
            // If not parseable JSON, extract from text
        }
        return [];
    }

    private extractChangedFiles(commits: CommitInfo[]): string[] {
        // Extract file references from commit messages (basic heuristic)
        const files = new Set<string>();
        for (const c of commits) {
            // Look for file-like patterns in commit messages
            const matches = c.message.match(/[\w/]+\.\w+/g);
            if (matches) {
                for (const m of matches) files.add(m);
            }
        }
        return Array.from(files);
    }
}

// ── GitHub MCP Wrapper (minimal, for repo-watcher) ──────────────────────────

class GitHubMCPWrapper {
    private proc: ChildProcess | null = null;
    private reqId = 0;
    private buf = "";
    private pending = new Map<
        number,
        { res: (v: JRPCRes) => void; rej: (e: Error) => void }
    >();
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    async start(): Promise<void> {
        this.proc = spawn("npx", ["-y", "@modelcontextprotocol/server-github"], {
            stdio: ["pipe", "pipe", "pipe"],
            shell: true,
            env: {
                ...process.env,
                GITHUB_PERSONAL_ACCESS_TOKEN: this.token,
            },
        });

        this.proc.stdout?.on("data", (d: Buffer) => this.onData(d));
        this.proc.stderr?.on("data", () => { });

        await new Promise((r) => setTimeout(r, 3000));

        // Initialize MCP
        await this.rpc("initialize", {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "SentinelQA-RepoWatcher", version: "0.1.0" },
        });
        this.proc?.stdin?.write(
            JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
            "\n"
        );
    }

    async stop(): Promise<void> {
        this.proc?.kill("SIGTERM");
        this.proc = null;
    }

    async callTool(
        name: string,
        args: Record<string, unknown>
    ): Promise<{ ok: boolean; text: string }> {
        const r = await this.rpc("tools/call", { name, arguments: args });
        if (r.error) return { ok: false, text: r.error.message };
        const res = r.result as {
            content?: Array<{ type: string; text?: string }>;
            isError?: boolean;
        };
        if (res?.isError)
            return { ok: false, text: res.content?.[0]?.text ?? "Error" };
        const text =
            res?.content
                ?.filter((c) => c.type === "text")
                .map((c) => c.text ?? "")
                .join("\n") ?? "";
        return { ok: true, text };
    }

    private async rpc(
        method: string,
        params: Record<string, unknown>
    ): Promise<JRPCRes> {
        const id = ++this.reqId;
        return new Promise((res, rej) => {
            const t = setTimeout(() => {
                this.pending.delete(id);
                rej(new Error("Timeout"));
            }, 30000);
            this.pending.set(id, {
                res: (v) => {
                    clearTimeout(t);
                    res(v);
                },
                rej: (e) => {
                    clearTimeout(t);
                    rej(e);
                },
            });
            this.proc!.stdin!.write(
                JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"
            );
        });
    }

    private onData(d: Buffer): void {
        this.buf += d.toString();
        const lines = this.buf.split("\n");
        this.buf = lines.pop() ?? "";
        for (const l of lines) {
            try {
                const r = JSON.parse(l.trim()) as JRPCRes;
                if (r.id !== undefined) this.pending.get(r.id)?.res(r);
                this.pending.delete(r.id);
            } catch { }
        }
    }
}

// ── Singleton ───────────────────────────────────────────────────────────────

export const repoWatcher = new RepoWatcher();
