// ============================================================================
// GET  /api/notion/health   — verify Notion env + database access
// POST /api/notion/health   — create a real test report page and return the URL
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { Client, APIErrorCode, isNotionClientError } from "@notionhq/client";
import { createDebugReport } from "@/lib/notion/report-service";

export interface NotionCheckResult {
  name: string;
  status: "pass" | "fail" | "skip";
  durationMs: number;
  detail?: string;
  data?: unknown;
}

export interface NotionHealthReport {
  overall: "healthy" | "degraded" | "unreachable";
  timestamp: string;
  envCheck: {
    token: boolean;
    databaseId: string | null;
  };
  checks: NotionCheckResult[];
  totalDurationMs: number;
}

export interface NotionTestPageResult {
  success: boolean;
  pageId?: string;
  pageUrl?: string;
  error?: string;
  durationMs: number;
}

function ms() {
  return Date.now();
}

// ── GET — run connectivity checks ─────────────────────────────────────────────

export async function GET() {
  const start = ms();

  const report: NotionHealthReport = {
    overall: "unreachable",
    timestamp: new Date().toISOString(),
    envCheck: {
      token: !!process.env.NOTION_TOKEN,
      databaseId: process.env.NOTION_DATABASE_ID ?? null,
    },
    checks: [],
    totalDurationMs: 0,
  };

  // ── 1. Token check ─────────────────────────────────────────────────────────
  if (!process.env.NOTION_TOKEN) {
    report.checks.push({
      name: "Token Configuration",
      status: "fail",
      durationMs: 0,
      detail: "NOTION_TOKEN is not set in .env",
    });
    report.totalDurationMs = ms() - start;
    return NextResponse.json(report);
  }

  report.checks.push({
    name: "Token Configuration",
    status: "pass",
    durationMs: 0,
    detail: `Token starts with: ${process.env.NOTION_TOKEN.slice(0, 10)}...`,
  });

  // ── 2. Database ID check ────────────────────────────────────────────────────
  if (!process.env.NOTION_DATABASE_ID) {
    report.checks.push({
      name: "Database ID Configuration",
      status: "fail",
      durationMs: 0,
      detail: "NOTION_DATABASE_ID is not set in .env",
    });
    report.totalDurationMs = ms() - start;
    return NextResponse.json(report);
  }

  report.checks.push({
    name: "Database ID Configuration",
    status: "pass",
    durationMs: 0,
    detail: `ID: ${process.env.NOTION_DATABASE_ID}`,
  });

  // Using `any` cast because @notionhq/client v5 returns union types
  // that hide `properties` behind a discriminated union check at compile time,
  // but the data IS there at runtime — we access it via raw fetch in schema check.
  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  // ── 3. Retrieve database metadata ──────────────────────────────────────────
  const dbStart = ms();
  let dbObj: Record<string, unknown> | null = null;
  try {
    dbObj = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    const rawProps = dbObj?.properties ?? {};
    const props = Object.keys(rawProps);
    const title: string =
      dbObj?.title?.[0]?.plain_text ??
      dbObj?.title?.[0]?.text?.content ??
      "(untitled)";

    report.checks.push({
      name: "Database Access",
      status: "pass",
      durationMs: ms() - dbStart,
      detail: `Found database: "${title}" with ${props.length} properties`,
      // Show the full raw properties so we can debug the schema
      data: {
        title,
        id: dbObj?.id,
        object: dbObj?.object,
        properties: props.length > 0
          ? Object.fromEntries(props.map((k) => [k, (rawProps[k] as any)?.type ?? "?"]))
          : "(none — database has no columns yet, or API returned partial response)",
      },
    });
  } catch (err) {
    const detail = notionErrMessage(err);
    report.checks.push({
      name: "Database Access",
      status: "fail",
      durationMs: ms() - dbStart,
      detail,
    });
    report.totalDurationMs = ms() - start;
    return NextResponse.json(report);
  }

  // ── 4. Query existing pages (read test) ────────────────────────────────────
  const queryStart = ms();
  try {
    // Use notion.search() as a universal fallback — works across all client versions
    const result = await notion.search({
      filter: { property: "object", value: "page" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 3,
    });

    const pages = (result.results as Record<string, unknown>[]).map((p) => {
      const props = (p?.properties ?? {}) as Record<string, Record<string, unknown>>;
      const nameProp = props["Name"] ?? props["Title"];
      const titleArr = (nameProp?.title ?? []) as Array<{ plain_text?: string; text?: { content?: string } }>;
      const name = titleArr[0]?.plain_text ?? titleArr[0]?.text?.content ?? "(untitled)";
      return { name, pageId: p.id };
    });

    report.checks.push({
      name: "Query Database (recent pages)",
      status: "pass",
      durationMs: ms() - queryStart,
      detail: `Found ${result.results.length} pages in workspace (latest 3 shown)`,
      data: pages,
    });
  } catch (err) {
    report.checks.push({
      name: "Query Database (recent pages)",
      status: "fail",
      durationMs: ms() - queryStart,
      detail: notionErrMessage(err),
    });
  }

  // ── 5. Schema validation — fetch fresh via REST to bypass SDK type issues ──
  const schemaStart = ms();
  try {
    // Use raw fetch to bypass @notionhq/client v5 type quirks
    const dbRes = await fetch(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
        },
      }
    );
    const dbJson = await dbRes.json();
    const rawProps: Record<string, { type?: string }> = dbJson?.properties ?? {};
    const props: Record<string, string> = {};
    for (const [key, val] of Object.entries(rawProps)) {
      props[key] = val?.type ?? "unknown";
    }

    const required = ["Name", "Repo", "Agent", "Event", "Confidence", "PR Link", "Status", "Timestamp"];
    const missing = required.filter((r) => !props[r]);

    if (missing.length === 0) {
      report.checks.push({
        name: "Schema Validation",
        status: "pass",
        durationMs: ms() - schemaStart,
        detail: "All 8 required properties found",
        data: Object.fromEntries(required.map((r) => [r, props[r] ?? "missing"])),
      });
    } else {
      report.checks.push({
        name: "Schema Validation",
        status: "fail",
        durationMs: ms() - schemaStart,
        detail: `Missing properties: ${missing.join(", ")}`,
        data: {
          found: props,
          missing,
          hint: "Add these columns to your Notion database",
        },
      });
    }
  } catch (err) {
    report.checks.push({
      name: "Schema Validation",
      status: "skip",
      durationMs: ms() - schemaStart,
      detail: notionErrMessage(err),
    });
  }

  // ── Overall ────────────────────────────────────────────────────────────────
  const passed = report.checks.filter((c) => c.status === "pass").length;
  const failed = report.checks.filter((c) => c.status === "fail").length;
  report.overall = failed === 0 ? "healthy" : passed > 0 ? "degraded" : "unreachable";
  report.totalDurationMs = ms() - start;

  return NextResponse.json(report);
}

// ── POST — create a real test report page ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const start = ms();

  let scenario = "test";
  try {
    const body = await request.json();
    scenario = body.scenario ?? "test";
  } catch {
    // default scenario
  }

  const scenarios: Record<string, Parameters<typeof createDebugReport>[0]> = {
    test: {
      title: "🧪 [TEST] Visual Verification — SentinelQA",
      repo: "Hack-karo",
      agent: "pipeline",
      event: "Pipeline Start",
      status: "In Progress",
      sessionId: `test_${Date.now()}`,
      context: JSON.stringify({
        triggeredBy: "notion-test page",
        timestamp: new Date().toISOString(),
        message: "This is a test page created by the visual health check",
      }, null, 2),
    },
    failure: {
      title: "❌ [TEST] Sample Test Failure Report",
      repo: "Hack-karo",
      agent: "watchdog",
      event: "Test Failure",
      status: "Failed",
      sessionId: `test_${Date.now()}`,
      logs: `FAIL  Login page renders correctly
      AssertionError: Expected element with text "Sign In" to be visible
      at Object.<anonymous> (tests/auth.spec.ts:14:5)

FAIL  Dashboard loads after authentication
      Error: Navigation timeout exceeded (30000ms)
      at PlaywrightMCPClient.navigate (lib/mcp/playwright-client.ts:87:11)

PASS  Landing page loads
PASS  Navigation links are present`,
      rootCause:
        "The authentication middleware is blocking unauthenticated requests to /dashboard with a 302 redirect, but the test was not set up to handle redirect chains. Additionally, the 'Sign In' button selector changed from role='button' to role='link' after the latest UI refactor.",
      codeDiff: `- await page.click('[role="button"][name="Sign In"]')
+ await page.click('[role="link"][name="Sign In"]')

  // Also fix navigation assertion
- await expect(page).toHaveURL('/dashboard')
+ await expect(page).toHaveURL('/auth')`,
      confidence: 0.85,
    },
    fix: {
      title: "🔧 [TEST] Sample Healer Fix Report",
      repo: "Hack-karo",
      agent: "healer",
      event: "Fix Generated",
      status: "Fixed",
      sessionId: `test_${Date.now()}`,
      rootCause:
        "Null check removed in commit a3f2c1d — the `user` object can be undefined when the session expires mid-request, causing a TypeError that surfaces as a 500 error.",
      codeDiff: `// src/app/api/auth/me/route.ts
- const { name, email } = session.user
+ const { name, email } = session.user ?? {}
+ if (!name || !email) {
+   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
+ }`,
      confidence: 0.93,
      pr: "https://github.com/Arpit529Srivastava/Hack-karo/pull/1",
    },
    complete: {
      title: "✅ [TEST] Sample Pipeline Complete Report",
      repo: "Hack-karo",
      agent: "pipeline",
      event: "Pipeline Complete",
      status: "Fixed",
      sessionId: `test_${Date.now()}`,
      confidence: 0.96,
      pr: "https://github.com/Arpit529Srivastava/Hack-karo/pull/1",
      context: JSON.stringify({
        passed: 8,
        total: 9,
        failed: 1,
        durationMs: 14320,
        stages: ["architect", "scripter", "watchdog", "healer", "courier"],
      }, null, 2),
    },
  };

  const data = scenarios[scenario] ?? scenarios["test"];
  const result = await createDebugReport(data);

  const response: NotionTestPageResult = {
    success: result.success,
    pageId: result.pageId,
    pageUrl: result.pageUrl,
    error: result.error,
    durationMs: ms() - start,
  };

  return NextResponse.json(response, { status: result.success ? 201 : 502 });
}

// ── helpers ───────────────────────────────────────────────────────────────────

function notionErrMessage(err: unknown): string {
  if (isNotionClientError(err)) {
    if (err.code === APIErrorCode.ObjectNotFound)
      return "Database not found — share the database with your integration in Notion";
    if (err.code === APIErrorCode.Unauthorized)
      return "Unauthorized — check NOTION_TOKEN and integration permissions";
    return `Notion API: ${err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}
