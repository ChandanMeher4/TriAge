import { NextResponse } from "next/server";
import { GitHubMCPClient } from "@/lib/mcp/github-client";

export const dynamic = "force-dynamic";

export async function GET() {
    const owner = process.env.SENTINELQA_DEFAULT_OWNER;
    const repo = process.env.SENTINELQA_DEFAULT_REPO;
    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

    if (!owner || !repo || !token) {
        return NextResponse.json({ prs: [] });
    }

    const client = new GitHubMCPClient(token);
    try {
        await client.start("npx");
        
        const response = await client.listPullRequests(owner, repo, "all");
        
        await client.stop();

        if (response.success && response.content) {
            const textContent = response.content.find((c) => c.type === "text")?.text;
            if (textContent) {
                const prsRaw = JSON.parse(textContent);
                
                // Map to the dashboard format
                const prs = prsRaw.map((pr: any) => ({
                    id: pr.number,
                    title: pr.title,
                    branch: pr.head?.ref || "unknown",
                    status: pr.state === "open" ? "open" : (pr.merged_at ? "merged" : "closed"),
                    confidence: 94, // hardcoded for display
                    time: new Date(pr.created_at).toLocaleDateString(),
                    tests: "14/14", // hardcoded for display
                    author: pr.user?.login || "TriAge Bot",
                    url: pr.html_url
                }));
                
                return NextResponse.json({ prs });
            }
        }
        
        return NextResponse.json({ prs: [] });
    } catch (e) {
        await client.stop();
        console.error(e);
        return NextResponse.json({ prs: [] });
    }
}
