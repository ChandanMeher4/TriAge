// ============================================================================
// POST /api/agent/debug-report
//
// Agents call this endpoint to log an event to Notion.
// Accepts the full DebugReportInput schema and creates a structured page
// in the SentinelQA Notion database.
//
// Agents should call this whenever:
//   • Tests fail (watchdog)
//   • Anomaly detected (watchdog)
//   • Root cause found (healer)
//   • Fix generated (healer)
//   • PR created (courier)
//   • Issue created (courier)
//   • Pipeline started / completed (orchestrator)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  createDebugReport,
  type DebugReportInput,
  type NotionAgent,
  type NotionEvent,
  type NotionStatus,
} from "@/lib/notion/report-service";

const VALID_AGENTS: NotionAgent[] = [
  "architect", "scripter", "watchdog", "healer", "courier", "pipeline",
];

const VALID_EVENTS: NotionEvent[] = [
  "Pipeline Start",
  "Test Failure",
  "Anomaly Detected",
  "Root Cause Found",
  "Fix Generated",
  "PR Created",
  "Issue Created",
  "Pipeline Complete",
];

const VALID_STATUSES: NotionStatus[] = [
  "In Progress", "Fixed", "Needs Review", "Failed",
];

export async function POST(request: NextRequest) {
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let body: Partial<DebugReportInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── 2. Validate required fields ────────────────────────────────────────────
  const { title, repo, agent, event } = body;

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Missing or invalid field: title (string)" }, { status: 400 });
  }
  if (!repo || typeof repo !== "string") {
    return NextResponse.json({ error: "Missing or invalid field: repo (string)" }, { status: 400 });
  }
  if (!agent || !VALID_AGENTS.includes(agent as NotionAgent)) {
    return NextResponse.json(
      { error: `Invalid field: agent. Must be one of: ${VALID_AGENTS.join(", ")}` },
      { status: 400 }
    );
  }
  if (!event || !VALID_EVENTS.includes(event as NotionEvent)) {
    return NextResponse.json(
      { error: `Invalid field: event. Must be one of: ${VALID_EVENTS.join(", ")}` },
      { status: 400 }
    );
  }

  // ── 3. Validate optional fields ────────────────────────────────────────────
  if (body.confidence !== undefined) {
    const c = Number(body.confidence);
    if (isNaN(c) || c < 0 || c > 1) {
      return NextResponse.json(
        { error: "Invalid field: confidence must be a number between 0 and 1" },
        { status: 400 }
      );
    }
    body.confidence = c;
  }

  if (body.status && !VALID_STATUSES.includes(body.status as NotionStatus)) {
    return NextResponse.json(
      { error: `Invalid field: status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (body.pr && typeof body.pr !== "string") {
    return NextResponse.json({ error: "Invalid field: pr must be a string URL" }, { status: 400 });
  }

  // ── 4. Write to Notion ─────────────────────────────────────────────────────
  const result = await createDebugReport(body as DebugReportInput);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to create Notion report" },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      pageId: result.pageId,
      pageUrl: result.pageUrl,
      message: `Notion page created: ${result.pageUrl ?? result.pageId}`,
    },
    { status: 201 }
  );
}

// ── GET — health/schema info ───────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/agent/debug-report",
    description: "Creates a structured Notion page for an agent event",
    notionConfigured: !!(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID),
    schema: {
      required: {
        title: "string — Page title (e.g. 'Login Failure Fix')",
        repo: "string — Repository name",
        agent: `enum — ${VALID_AGENTS.join(" | ")}`,
        event: `enum — ${VALID_EVENTS.join(" | ")}`,
      },
      optional: {
        confidence: "number 0–1 — AI confidence score",
        pr: "string URL — GitHub PR or Issue URL",
        status: `enum — ${VALID_STATUSES.join(" | ")}`,
        logs: "string — Test failure logs",
        rootCause: "string — Root cause analysis text",
        codeDiff: "string — Code diff / proposed fix",
        context: "string — Additional JSON or markdown context",
        sessionId: "string — Pipeline session ID",
      },
    },
  });
}
