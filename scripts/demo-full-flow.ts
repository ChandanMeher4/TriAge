// ============================================================================
// SentinelQA — Full Pipeline Demo
//
// Demonstrates the COMPLETE SentinelQA flow without needing:
//   - The AI agent (LangGraph) — test plan is auto-generated
//   - GitHub MCP connected — uses fallback code context
//
// But if you HAVE a GitHub PAT, it will use the real GitHub MCP!
//
// Usage:
//   npx ts-node --project tsconfig.scripts.json scripts/demo-full-flow.ts
//
// With GitHub (optional):
//   GITHUB_PAT=ghp_xxx npx ts-node --project tsconfig.scripts.json scripts/demo-full-flow.ts
// ============================================================================

import { ChildProcess, spawn } from "child_process";

// ── Colors ──────────────────────────────────────────────────────────────────
const G = "\x1b[32m",
  R = "\x1b[31m",
  C = "\x1b[36m",
  Y = "\x1b[33m";
const D = "\x1b[2m",
  B = "\x1b[1m",
  M = "\x1b[35m",
  X = "\x1b[0m";

// ── JSON-RPC ────────────────────────────────────────────────────────────────
interface JRPCReq {
  jsonrpc: "2.0";
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}
interface JRPCRes {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

// ── Minimal MCP Client ──────────────────────────────────────────────────────
class MCPClient {
  private proc: ChildProcess | null = null;
  private reqId = 0;
  private buf = "";
  private pending = new Map<
    number,
    { res: (v: JRPCRes) => void; rej: (e: Error) => void }
  >();

  async start(
    cmd: string,
    args: string[],
    env?: Record<string, string>,
  ): Promise<void> {
    const isWindows = process.platform === "win32";
    const actualCmd = cmd === "npx" && isWindows ? "npx.cmd" : cmd;

    this.proc = spawn(actualCmd, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    this.proc.stdout?.on("data", (d: Buffer) => this.onData(d));
    this.proc.stderr?.on("data", () => {}); // silenced

    const initPayload = {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "SentinelQA-Demo", version: "0.1.0" },
    };

    const startTime = Date.now();
    const timeoutMs = 30000;
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    while (true) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error("Timeout waiting for MCP server initialization");
      }
      try {
        await this.rpc("initialize", initPayload);
        break;
      } catch {
        await delay(1000);
      }
    }

    this.proc?.stdin?.write(
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
        "\n",
    );
  }

  stop() {
    if (this.proc) {
      const pid = this.proc.pid;
      this.proc.kill("SIGTERM");
      if (pid && process.platform !== "win32") {
        try {
          process.kill(-pid, "SIGTERM");
        } catch {
          // Process group may already be gone
        }
      }
      this.proc = null;
    }
  }

  async tool(name: string, args: Record<string, unknown>) {
    const r = await this.rpc("tools/call", { name, arguments: args });
    if (r.error) return { ok: false, text: "", err: r.error.message };
    const res = r.result as {
      content?: Array<{ type: string; text?: string }>;
      isError?: boolean;
    };
    if (res?.isError)
      return { ok: false, text: "", err: res.content?.[0]?.text ?? "Error" };
    const text =
      res?.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("\n") ?? "";
    return { ok: true, text, err: "" };
  }

  async tools(): Promise<string[]> {
    const r = await this.rpc("tools/list", {});
    return ((r.result as { tools?: Array<{ name: string }> })?.tools ?? []).map(
      (t) => t.name,
    );
  }

  private async rpc(
    method: string,
    params: Record<string, unknown>,
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
        JSON.stringify({ jsonrpc: "2.0", id, method, params } as JRPCReq) +
          "\n",
      );
    });
  }

  private onData(d: Buffer) {
    this.buf += d.toString();
    const lines = this.buf.split("\n");
    this.buf = lines.pop() ?? "";
    for (const l of lines) {
      try {
        const r = JSON.parse(l.trim()) as JRPCRes;
        this.pending.get(r.id)?.res(r);
        this.pending.delete(r.id);
      } catch {}
    }
  }
}

// ── Main Demo ───────────────────────────────────────────────────────────────
async function main() {
  console.log(
    `\n${B}${C}╔════════════════════════════════════════════════════════════╗${X}`,
  );
  console.log(
    `${B}${C}║     SentinelQA — Full Pipeline Demo                       ║${X}`,
  );
  console.log(
    `${B}${C}║     GitHub MCP → AI Agent → Playwright MCP → Results      ║${X}`,
  );
  console.log(
    `${B}${C}╚════════════════════════════════════════════════════════════╝${X}\n`,
  );

  const hasPAT = !!(
    process.env.GITHUB_PAT || process.env.GITHUB_PERSONAL_ACCESS_TOKEN
  );
  let passed = 0,
    failed = 0;

  // ── PHASE 1: GitHub MCP (or simulated) ──────────────────────────────────
  console.log(`${M}▶ PHASE 1: Read Code from GitHub${X}`);

  let codeContext: string;

  if (hasPAT) {
    console.log(
      `  ${G}GitHub PAT detected — connecting to real GitHub MCP server${X}`,
    );
    const gh = new MCPClient();
    try {
      await gh.start("npx", ["-y", "@modelcontextprotocol/server-github"], {
        GITHUB_PERSONAL_ACCESS_TOKEN:
          process.env.GITHUB_PAT ||
          process.env.GITHUB_PERSONAL_ACCESS_TOKEN ||
          "",
      });
      const tools = await gh.tools();
      console.log(
        `  ${G}✅ GitHub MCP connected — ${tools.length} tools available${X}`,
      );
      console.log(`  ${D}Tools: ${tools.slice(0, 8).join(", ")}...${X}`);
      passed++;

      // Read from the project's own repo
      const result = await gh.tool("search_repositories", {
        query: "sentinelqa",
      });
      console.log(`  ${G}✅ GitHub search executed${X}`);
      passed++;
      gh.stop();
      codeContext = `Repository code read via GitHub MCP:\n${result.text.substring(0, 500)}`;
    } catch (err) {
      console.log(`  ${Y}⚠️  GitHub MCP failed: ${(err as Error).message}${X}`);
      console.log(`  ${Y}   Falling back to simulated code context${X}`);
      codeContext = getSimulatedCodeContext();
      failed++;
    }
  } else {
    console.log(`  ${Y}No GitHub PAT found — simulating code context${X}`);
    console.log(`  ${D}(Set GITHUB_PAT=ghp_xxx to use real GitHub MCP)${X}`);
    codeContext = getSimulatedCodeContext();
    console.log(
      `  ${G}✅ Simulated code context generated (${codeContext.length} chars)${X}`,
    );
    passed++;
  }

  // ── PHASE 2: AI Agent generates test plan ─────────────────────────────
  console.log(`\n${M}▶ PHASE 2: AI Agent Generates Test Plan${X}`);
  console.log(`  ${D}(In production: LangGraph + Claude analyze the code)${X}`);
  console.log(
    `  ${D}(For demo: we generate a test plan from the code context)${X}`,
  );

  const testPlan = generateTestPlan(codeContext);
  console.log(`  ${G}✅ Test plan generated:${X}`);
  for (const line of testPlan.split("\n").filter((l) => l.trim())) {
    console.log(`  ${D}  ${line}${X}`);
  }
  passed++;

  // ── PHASE 3: Playwright MCP executes tests ────────────────────────────
  console.log(`\n${M}▶ PHASE 3: Execute Tests via Playwright MCP${X}`);

  const pw = new MCPClient();

  const playwrightMcpPackage =
    process.env.PLAYWRIGHT_MCP_PACKAGE ?? "@playwright/mcp@0.0.68";
  await pw.start("npx", ["-y", playwrightMcpPackage, "--headless"]);
  console.log(`  ${G}✅ Playwright MCP server started (headless Chromium)${X}`);
  passed++;

  // Parse and execute test steps
  const steps = parseSteps(testPlan);
  const results: Array<{ step: string; status: string; ms: number }> = [];

  for (const step of steps) {
    const start = Date.now();
    let result: { ok: boolean; text: string; err: string };

    switch (step.action) {
      case "navigate":
        result = await pw.tool("browser_navigate", { url: step.value! });
        break;
      case "snapshot":
        result = await pw.tool("browser_snapshot", {});
        break;
      case "assert": {
        const snap = await pw.tool("browser_snapshot", {});
        result =
          snap.ok && snap.text.toLowerCase().includes(step.value!.toLowerCase())
            ? { ok: true, text: snap.text, err: "" }
            : { ok: false, text: "", err: `Does not contain "${step.value}"` };
        break;
      }
      default:
        result = await pw.tool("browser_snapshot", {});
    }

    const ms = Date.now() - start;
    if (result.ok) {
      console.log(`  ${G}✅ ${step.desc} ${D}(${ms}ms)${X}`);
      results.push({ step: step.desc, status: "passed", ms });
      passed++;
    } else {
      console.log(`  ${R}❌ ${step.desc} ${D}(${ms}ms)${X}`);
      console.log(`     ${R}${result.err}${X}`);
      results.push({ step: step.desc, status: "failed", ms });
      failed++;
    }
  }

  pw.stop();

  // ── PHASE 4: Results Summary ────────────────────────────────────────────
  const totalMs = results.reduce((s, r) => s + r.ms, 0);
  const rPassed = results.filter((r) => r.status === "passed").length;
  const rFailed = results.filter((r) => r.status === "failed").length;

  console.log(
    `\n${B}${C}╔════════════════════════════════════════════════════════════╗${X}`,
  );
  console.log(
    `${B}${C}║                 PIPELINE RESULTS                          ║${X}`,
  );
  console.log(
    `${B}${C}╠════════════════════════════════════════════════════════════╣${X}`,
  );
  console.log(
    `${B}${C}║${X}  GitHub MCP:    ${hasPAT ? `${G}Connected` : `${Y}Simulated`}${X}                              ${B}${C}║${X}`,
  );
  console.log(
    `${B}${C}║${X}  AI Agent:      ${Y}Simulated${X} (waiting for LangGraph)        ${B}${C}║${X}`,
  );
  console.log(
    `${B}${C}║${X}  Playwright:    ${G}Connected${X}                               ${B}${C}║${X}`,
  );
  console.log(
    `${B}${C}║${X}  Tests Run:     ${rPassed + rFailed} (${G}${rPassed} passed${X}, ${rFailed > 0 ? R : G}${rFailed} failed${X})          ${B}${C}║${X}`,
  );
  console.log(
    `${B}${C}║${X}  Duration:      ${totalMs}ms                                 ${B}${C}║${X}`,
  );
  console.log(
    `${B}${C}╚════════════════════════════════════════════════════════════╝${X}\n`,
  );

  console.log(`${D}Next steps to connect real components:${X}`);
  console.log(`${D}  1. Set GITHUB_PAT=ghp_xxx to connect real GitHub MCP${X}`);
  console.log(
    `${D}  2. Aaskar's LangGraph agent replaces generateTestPlan()${X}`,
  );
  console.log(
    `${D}  3. API route: POST /api/agent/pipeline orchestrates it all${X}`,
  );
  console.log(`${D}  4. Dashboard shows live results via WebSocket${X}\n`);

  process.exit(failed === 0 ? 0 : 1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSimulatedCodeContext(): string {
  return `## Repository: Arpit529Srivastava/Hack-karo (SIMULATED)

### Detected: Next.js Web App with Authentication
### Key Routes: /, /auth, /dashboard
### Recent Changes:
- Modified authentication flow in /auth
- Updated dashboard page with agent status cards
- Added MCP backend integration layer

### Tech Stack: Next.js 14, TypeScript, MongoDB, NextAuth
### Pages to test: Landing page, Auth page`;
}

function generateTestPlan(context: string): string {
  return `## Auto-Generated Test Plan (by Architect Agent)
1. Navigate to https://example.com
2. Take a snapshot of the landing page
3. Assert the page contains "Example Domain"`;
}

interface Step {
  desc: string;
  action: string;
  value?: string;
}

function parseSteps(plan: string): Step[] {
  const steps: Step[] = [];
  for (const line of plan.split("\n")) {
    const m = line.trim().match(/^\d+\.\s+(.+)$/);
    if (!m) continue;
    const d = m[1];
    if (/navigate/i.test(d)) {
      steps.push({
        desc: d,
        action: "navigate",
        value: d.match(/to\s+(\S+)/i)?.[1],
      });
    } else if (/assert/i.test(d)) {
      steps.push({
        desc: d,
        action: "assert",
        value: d.match(/contains?\s+[""]?(.+?)[""]?$/i)?.[1],
      });
    } else if (/snapshot|capture/i.test(d)) {
      steps.push({ desc: d, action: "snapshot" });
    } else {
      steps.push({ desc: d, action: "snapshot" });
    }
  }
  return steps;
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
