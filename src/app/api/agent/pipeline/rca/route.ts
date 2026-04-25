import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function fetchPageBlocks(pageId: string, token: string): Promise<{ rca_report: string; proposed_fix: string; target_files: string[]; pr_url: string }> {
  let rca_report = "";
  let proposed_fix = "";
  let pr_url = "";
  const target_files: string[] = [];

  try {
    const res = await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
        },
      }
    );
    if (!res.ok) return { rca_report, proposed_fix, target_files, pr_url };

    const data = await res.json();
    const blocks = data.results || [];

    let currentSection = "";
    for (const block of blocks) {
      // Detect section headings
      if (block.type === "heading_2") {
        const text = block.heading_2?.rich_text?.[0]?.plain_text || "";
        if (text.includes("Root Cause")) currentSection = "rca";
        else if (text.includes("Proposed Code Fix")) currentSection = "fix";
        else if (text.includes("GitHub Pull Request")) currentSection = "pr";
        else currentSection = "";
        continue;
      }

      // Extract content based on section
      if (currentSection === "rca" && block.type === "paragraph") {
        const text = block.paragraph?.rich_text?.map((t: any) => t.plain_text).join("") || "";
        if (text) rca_report += (rca_report ? "\n" : "") + text;
      }
      if (currentSection === "fix" && block.type === "code") {
        const text = block.code?.rich_text?.map((t: any) => t.plain_text).join("") || "";
        if (text) proposed_fix += (proposed_fix ? "\n" : "") + text;
      }
      if (currentSection === "pr" && block.type === "paragraph") {
        const text = block.paragraph?.rich_text?.map((t: any) => t.plain_text).join("") || "";
        if (text && text.startsWith("http")) pr_url = text;
      }
    }
  } catch (err) {
    console.warn(`[RCA API] Failed to fetch blocks for ${pageId}:`, err);
  }

  return { rca_report, proposed_fix, target_files, pr_url };
}

export async function GET() {
  try {
    const token = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!token || !databaseId) {
      return NextResponse.json({ reports: [] });
    }

    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          sorts: [
            { property: "Timestamp", direction: "descending" },
          ],
          page_size: 20,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[RCA API] Notion query failed:", errText);
      return NextResponse.json({ reports: [] });
    }

    const data = await response.json();

    // Fetch page blocks for the most recent reports to get RCA and fix details
    const reports = await Promise.all(
      (data.results || []).map(async (page: any) => {
        const props = page.properties || {};
        const confidence = props.Confidence?.number || 0;

        // Only fetch blocks for reports that have healer data (confidence > 0)
        let blockData = { rca_report: "", proposed_fix: "", target_files: [] as string[], pr_url: "" };
        if (confidence > 0) {
          blockData = await fetchPageBlocks(page.id, token);
        }

        return {
          id: page.id,
          title:
            props.Name?.title?.[0]?.plain_text ||
            props.Title?.title?.[0]?.plain_text ||
            "Untitled Report",
          repo: props.Repo?.rich_text?.[0]?.plain_text || "",
          agent:
            props.Agent?.rich_text?.[0]?.plain_text ||
            props.Agent?.select?.name ||
            "Unknown",
          event: props.Event?.select?.name || "Event",
          confidence,
          status: props.Status?.select?.name || "Unknown",
          url: page.url,
          pr_url: (props["PR Link"]?.url || blockData.pr_url || ""),
          time: props.Timestamp?.date?.start || page.created_time,
          // Healer data from page blocks
          rca_report: blockData.rca_report,
          proposed_fix: blockData.proposed_fix,
          target_files: blockData.target_files,
        };
      })
    );

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[RCA API] Error:", error);
    return NextResponse.json({ reports: [] });
  }
}
