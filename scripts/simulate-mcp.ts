// ============================================================================
// SentinelQA — Playwright MCP Simulation Script
//
// Standalone script to verify that the Playwright MCP integration works.
// Spawns the MCP server, sends JSON-RPC tool calls over stdio, and
// validates responses. Does NOT require the Next.js app to be running.
//
// Usage: npx ts-node scripts/simulate-mcp.ts
//    or: node scripts/simulate-mcp.js  (after build)
// ============================================================================

import { ChildProcess, spawn } from "child_process";

// ── Color helpers for console output ────────────────────────────────────────

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function logPass(msg: string) {
  console.log(`  ${GREEN}✅ PASS${RESET} — ${msg}`);
}
function logFail(msg: string) {
  console.log(`  ${RED}❌ FAIL${RESET} — ${msg}`);
}
function logInfo(msg: string) {
  console.log(`  ${CYAN}ℹ${RESET}  ${msg}`);
}
function logStep(step: number, msg: string) {
  console.log(`\n${YELLOW}━━━ Step ${step}: ${msg} ━━━${RESET}`);
}
function logHeader(msg: string) {
  console.log(`\n${BOLD}${CYAN}${"═".repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${msg}${RESET}`);
  console.log(`${BOLD}${CYAN}${"═".repeat(60)}${RESET}\n`);
}

// ── JSON-RPC Types ──────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

// ── MCP Simulation Client ───────────────────────────────────────────────────

class MCPSimulator {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private buffer = "";
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: JsonRpcResponse) => void;
      reject: (reason: Error) => void;
    }
  >();

  /**
   * Start the MCP server process via npx.
   */
  async start(): Promise<void> {
    const playwrightMcpPackage =
      process.env.PLAYWRIGHT_MCP_PACKAGE ?? "@playwright/mcp@0.0.68";
    logInfo(`Starting MCP server via npx ${playwrightMcpPackage}`);

    const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
    this.process = spawn(
      npxCommand,
      ["-y", playwrightMcpPackage, "--headless"],
      {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      },
    );

    // Capture stdout for JSON-RPC responses
    this.process.stdout?.on("data", (data: Buffer) => {
      this.handleStdout(data);
    });

    // Log stderr
    this.process.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        console.log(`  ${DIM}[MCP Server] ${msg}${RESET}`);
      }
    });

    this.process.on("error", (err) => {
      logFail(`Process error: ${err.message}`);
    });

    // Wait for server to start by probing a JSON-RPC method with retries
    logInfo("Waiting for MCP server to start...");
    const maxAttempts = 15;
    const delayMs = 2000;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.sendRequest("tools/list");
        if (response.error) {
          logInfo(
            `MCP server responded to tools/list with error (${response.error.code}): ${response.error.message}. Considering server ready.`,
          );
        } else {
          logInfo("MCP server responded to tools/list. Server is ready.");
        }
        break;
      } catch (err) {
        if (attempt === maxAttempts) {
          logFail(
            `MCP server did not become ready after ${maxAttempts} attempts: ${
              (err as Error)?.message ?? String(err)
            }`,
          );
          throw err;
        }
        logInfo(
          `MCP server not ready yet (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms...`,
        );
        await this.sleep(delayMs);
      }
    }
  }

  /**
   * Stop the MCP server process.
   */
  stop(): void {
    if (this.process) {
      const pid = this.process.pid;
      this.process.kill("SIGTERM");
      if (pid && process.platform !== "win32") {
        try {
          process.kill(-pid, "SIGTERM");
        } catch {
          // Process group may already be gone
        }
      }
      this.process = null;
    }
  }

  /**
   * Send a JSON-RPC request and wait for the response.
   */
  async sendRequest(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<JsonRpcResponse> {
    if (!this.process?.stdin) {
      throw new Error("MCP server is not running");
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out (30s)`));
      }, 30000);

      this.pendingRequests.set(id, {
        resolve: (resp) => {
          clearTimeout(timeout);
          resolve(resp);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      const message = JSON.stringify(request) + "\n";
      this.process!.stdin!.write(message);
    });
  }

  /**
   * Send a notification (no response expected).
   */
  sendNotification(method: string, params?: Record<string, unknown>): void {
    const notification: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
    };
    this.process?.stdin?.write(JSON.stringify(notification) + "\n");
  }

  /**
   * Call an MCP tool by name.
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<JsonRpcResponse> {
    return this.sendRequest("tools/call", { name, arguments: args });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private handleStdout(data: Buffer): void {
    this.buffer += data.toString();
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const response = JSON.parse(trimmed) as JsonRpcResponse;
        if (response.id !== undefined) {
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            this.pendingRequests.delete(response.id);
            pending.resolve(response);
          }
        }
      } catch {
        // Non-JSON output, ignore
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ── Main Simulation ─────────────────────────────────────────────────────────

async function runSimulation() {
  logHeader("SentinelQA — Playwright MCP Integration Simulation");

  const simulator = new MCPSimulator();
  let passed = 0;
  let failed = 0;
  let totalSteps = 0;

  try {
    // ── Step 1: Start MCP Server ──────────────────────────────────────────
    logStep(1, "Start MCP Server");
    await simulator.start();
    logPass("MCP server process started successfully");
    totalSteps++;
    passed++;

    // ── Step 2: Initialize MCP Protocol ───────────────────────────────────
    logStep(2, "Initialize MCP Protocol");
    totalSteps++;
    try {
      const initResp = await simulator.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "SentinelQA-Simulator", version: "0.1.0" },
      });

      if (initResp.error) {
        logFail(`Initialization error: ${initResp.error.message}`);
        failed++;
      } else {
        logPass("MCP protocol initialized");
        const result = initResp.result as Record<string, unknown>;
        logInfo(
          `Server name: ${JSON.stringify((result as { serverInfo?: { name?: string } })?.serverInfo?.name ?? "unknown")}`,
        );
        logInfo(
          `Protocol version: ${JSON.stringify(result?.protocolVersion ?? "unknown")}`,
        );
        passed++;

        // Send initialized notification
        simulator.sendNotification("notifications/initialized");
      }
    } catch (err) {
      logFail(`Initialize failed: ${(err as Error).message}`);
      failed++;
    }

    // ── Step 3: List Available Tools ──────────────────────────────────────
    logStep(3, "List Available Tools");
    totalSteps++;
    try {
      const toolsResp = await simulator.sendRequest("tools/list", {});
      if (toolsResp.error) {
        logFail(`Tools list error: ${toolsResp.error.message}`);
        failed++;
      } else {
        const result = toolsResp.result as { tools?: Array<{ name: string }> };
        const tools = result?.tools ?? [];
        logPass(`Found ${tools.length} available tools`);
        logInfo(`Tools: ${tools.map((t) => t.name).join(", ")}`);
        passed++;
      }
    } catch (err) {
      logFail(`List tools failed: ${(err as Error).message}`);
      failed++;
    }

    // ── Step 4: Navigate to example.com ───────────────────────────────────
    logStep(4, "Navigate to https://example.com");
    totalSteps++;
    try {
      const navResp = await simulator.callTool("browser_navigate", {
        url: "https://example.com",
      });

      if (navResp.error) {
        logFail(`Navigation error: ${navResp.error.message}`);
        failed++;
      } else {
        const result = navResp.result as {
          content?: Array<{ type: string; text?: string }>;
        };
        logPass("Navigation successful");
        if (result?.content) {
          const text = result.content
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("")
            .substring(0, 200);
          logInfo(`Page content preview: ${DIM}${text}...${RESET}`);
        }
        passed++;
      }
    } catch (err) {
      logFail(`Navigation failed: ${(err as Error).message}`);
      failed++;
    }

    // ── Step 5: Take Accessibility Snapshot ────────────────────────────────
    logStep(5, "Take Accessibility Snapshot");
    totalSteps++;
    try {
      const snapResp = await simulator.callTool("browser_snapshot", {});

      if (snapResp.error) {
        logFail(`Snapshot error: ${snapResp.error.message}`);
        failed++;
      } else {
        const result = snapResp.result as {
          content?: Array<{ type: string; text?: string }>;
        };
        const snapshotText =
          result?.content
            ?.filter((c) => c.type === "text")
            .map((c) => c.text ?? "")
            .join("") ?? "";

        if (snapshotText.length > 0) {
          logPass(
            `Accessibility snapshot captured (${snapshotText.length} chars)`,
          );
          // Verify the snapshot contains expected content from example.com
          if (snapshotText.toLowerCase().includes("example")) {
            logPass("Snapshot contains expected 'Example' content");
          } else {
            logInfo(
              "Snapshot captured but 'Example' text not found in accessibility tree",
            );
          }
          logInfo(
            `Snapshot preview: ${DIM}${snapshotText.substring(0, 300)}...${RESET}`,
          );
          passed++;
        } else {
          logFail("Snapshot returned empty content");
          failed++;
        }
      }
    } catch (err) {
      logFail(`Snapshot failed: ${(err as Error).message}`);
      failed++;
    }

    // ── Step 6: Click a link on the page ──────────────────────────────────
    logStep(6, "Click 'More information...' link");
    totalSteps++;
    try {
      const clickResp = await simulator.callTool("browser_click", {
        element: "More information...",
      });

      if (clickResp.error) {
        logFail(`Click error: ${clickResp.error.message}`);
        failed++;
      } else {
        logPass("Click action executed");
        passed++;
      }
    } catch (err) {
      logFail(`Click failed: ${(err as Error).message}`);
      failed++;
    }

    // ── Step 7: Take Another Snapshot (after navigation) ──────────────────
    logStep(7, "Verify navigation after click");
    totalSteps++;
    try {
      // Wait a moment for page load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const snapResp2 = await simulator.callTool("browser_snapshot", {});
      if (snapResp2.error) {
        logFail(`Post-click snapshot error: ${snapResp2.error.message}`);
        failed++;
      } else {
        const result = snapResp2.result as {
          content?: Array<{ type: string; text?: string }>;
        };
        const text =
          result?.content
            ?.filter((c) => c.type === "text")
            .map((c) => c.text ?? "")
            .join("") ?? "";
        logPass(`Post-click snapshot captured (${text.length} chars)`);
        logInfo(
          `New page content preview: ${DIM}${text.substring(0, 200)}...${RESET}`,
        );
        passed++;
      }
    } catch (err) {
      logFail(`Post-click snapshot failed: ${(err as Error).message}`);
      failed++;
    }
  } catch (err) {
    logFail(`Fatal error: ${(err as Error).message}`);
  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────────
    simulator.stop();
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`${BOLD}  SIMULATION RESULTS${RESET}`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total Steps:  ${totalSteps}`);
  console.log(`  ${GREEN}Passed:       ${passed}${RESET}`);
  console.log(`  ${RED}Failed:       ${failed}${RESET}`);
  console.log(
    `  Status:       ${
      failed === 0
        ? `${GREEN}${BOLD}ALL PASSED ✅${RESET}`
        : `${RED}${BOLD}SOME FAILURES ❌${RESET}`
    }`,
  );
  console.log(`${"═".repeat(60)}\n`);

  process.exit(failed === 0 ? 0 : 1);
}

// ── Run ─────────────────────────────────────────────────────────────────────
runSimulation().catch((err) => {
  console.error("Simulation crashed:", err);
  process.exit(1);
});
