# SentinelQA — Complete Project Flow

> **Purpose**: Documents the full end-to-end architecture of SentinelQA — from connecting a GitHub repo to automated QA testing via MCP.

---

## What is MCP?

**MCP (Model Context Protocol)** is a standardized way for AI agents to use tools. Instead of building custom integrations for every tool, MCP provides a single protocol (JSON-RPC 2.0 over stdio) that any AI can use to talk to any tool server.

SentinelQA uses **two MCP servers**:

| MCP Server | Package | Used By | What It Does |
|---|---|---|---|
| **GitHub MCP** | `@modelcontextprotocol/server-github` | Repo Watcher / Architect Agent | Reads code, commits, PRs, file contents |
| **Playwright MCP** | `@playwright/mcp` | Scripter Agent | Controls a real headless browser |

---

## End-to-End Flow

```
  ┌─────────────────────────────────────────────────────────────┐
  │                   SentinelQA — Full Pipeline                │
  └─────────────────────────────────────────────────────────────┘

  1️⃣  USER adds a repo to watch
      │  POST /api/agent/repos
      │  { owner: "Arpit529Srivastava", repo: "Hack-karo",
      │    branch: "main", target_url: "http://localhost:3000" }
      ▼
  2️⃣  REPO WATCHER checks for changes
      │  POST /api/agent/repos/check
      │
      ├──── Spawns ──▶  🔵 GITHUB MCP SERVER (stdio)
      │                  ├── list_commits → recent changes
      │                  ├── get_file_contents → reads source code
      │                  └── Returns: code context + commit info
      │
      │  Result: "3 new commits detected, auth flow changed"
      ▼
  3️⃣  AI AGENT analyzes code context (LangGraph — future)
      │
      │  Currently: auto-generated test plan from code analysis
      │  Future: Claude via LangGraph reads code context →
      │          identifies critical user flows → generates test plan
      │
      │  Output (Markdown):
      │  ┌─────────────────────────────────────────────┐
      │  │ ## Test: Login Flow                          │
      │  │ 1. Navigate to https://app.com/login         │
      │  │ 2. Type "user@test.com" into email field     │
      │  │ 3. Click the "Sign In" button                │
      │  │ 4. Assert page contains "Dashboard"          │
      │  └─────────────────────────────────────────────┘
      ▼
  4️⃣  TEST RUNNER parses plan → executes via Playwright MCP
      │
      ├──── Spawns ──▶  🟢 PLAYWRIGHT MCP SERVER (stdio)
      │                  ├── browser_navigate → opens URLs
      │                  ├── browser_snapshot  → reads accessibility tree
      │                  ├── browser_click     → clicks by meaning
      │                  ├── browser_type      → types in fields
      │                  └── Returns: pass/fail per step
      ▼
  5️⃣  RESULTS collected
      │
      ├── ✅ All pass → store results, notify team
      ├── ❌ Failures → capture accessibility snapshot
      │                  (what the page looks like to the AI)
      ▼
  6️⃣  HEALER AGENT (future — Aaskar's part)
      │  Uses GitHub MCP to read source code
      │  Analyzes the failure + snapshot
      │  Generates a fix → creates a Pull Request
      ▼
  7️⃣  COURIER AGENT (future)
      └── Notifies team via Slack/email
```

---

## How to Connect a Repo

### Step 1: Get a GitHub Personal Access Token
1. Go to https://github.com/settings/personal-access-tokens/new
2. Grant `repo` scope (read access to code)
3. Copy the token

### Step 2: Configure the token
Create `.env.local` in the project root:
```
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here
```

### Step 3: Add a repo to watch
```bash
curl -X POST http://localhost:3000/api/agent/repos \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "Arpit529Srivastava",
    "repo": "Hack-karo",
    "branch": "main",
    "target_url": "http://localhost:3000"
  }'
```

### Step 4: Check the repo for changes
```bash
curl -X POST http://localhost:3000/api/agent/repos/check \
  -H "Content-Type: application/json" \
  -d '{ "owner": "Arpit529Srivastava", "repo": "Hack-karo" }'
```

### Step 5: Run the full pipeline
```bash
curl -X POST http://localhost:3000/api/agent/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "Arpit529Srivastava",
    "repo": "Hack-karo",
    "target_url": "http://localhost:3000",
    "github_mcp_mode": "npx"
  }'
```

---

## How Playwright MCP Works (Accessibility Tree vs CSS Selectors)

| Traditional Playwright | Playwright MCP |
|---|---|
| `page.click('#submit-btn')` | `click("Sign In button")` |
| **Breaks** when HTML changes | AI sees the page semantically |
| Static CSS selectors | **Outcome-driven** instructions |

The AI sees the page as an accessibility tree:

```yaml
- navigation "Main Menu":
  - link "Home"
  - link "Products"
- form "Login Form":
  - textbox "Email" [ref=e5]
  - textbox "Password" [ref=e6]
  - button "Sign In" [ref=e7]    ← AI clicks by MEANING
```

Tests are **self-healing** — if `#submit-btn` gets renamed to `#login-button`, the AI still finds "Sign In" and clicks it.

---

## Communication Architecture

Both MCP servers use the same protocol:

```
┌──────────────┐   JSON-RPC 2.0   ┌──────────────┐
│  Our Backend │ ◄───── stdio ────►│  MCP Server  │
│  (Node.js)   │                   │  (process)   │
└──────────────┘                   └──────────────┘
```

**GitHub MCP**: `npx @modelcontextprotocol/server-github`
**Playwright MCP**: `node playwright-mcp/packages/playwright-mcp/cli.js`

---

## Backend Code Structure

```
src/lib/mcp/
├── types.ts              # TypeScript interfaces
├── github-client.ts      # GitHub MCP client (read repos)
├── playwright-client.ts  # Playwright MCP client (browser control)
├── repo-watcher.ts       # Add/remove/check repos for changes
├── orchestrator.ts       # Full pipeline: GitHub → AI → Playwright
├── test-runner.ts        # Parse test plans → MCP commands
├── session-manager.ts    # Track test sessions
└── index.ts              # Barrel export

src/app/api/agent/
├── repos/route.ts             # POST/GET/DELETE — manage watched repos
├── repos/check/route.ts       # POST — check repo via GitHub MCP
├── pipeline/route.ts          # POST — run full pipeline
├── run-tests/route.ts         # POST — run a test plan
├── sessions/[sessionId]/route.ts  # GET — session results
└── status/route.ts             # GET — agent health

scripts/
├── simulate-mcp.ts       # Low-level MCP verification
└── demo-full-flow.ts     # Full pipeline demo
```

---

## API Routes Summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/agent/repos` | POST | Add a GitHub repo to watch |
| `/api/agent/repos` | GET | List all watched repos |
| `/api/agent/repos` | DELETE | Remove a watched repo |
| `/api/agent/repos/check` | POST | Check repo for changes via GitHub MCP |
| `/api/agent/pipeline` | POST | Run full pipeline (GitHub → AI → Playwright) |
| `/api/agent/run-tests` | POST | Execute a test plan via Playwright MCP |
| `/api/agent/sessions/:id` | GET | Get test session results |
| `/api/agent/status` | GET | Agent and MCP health check |

---

## Example: Test Plan Input → Output

### Input (from AI Agent or manual)

```json
{
  "test_plan": "## Test: Login Flow\n1. Navigate to https://app.com/login\n2. Type \"user@test.com\" into email\n3. Click \"Sign In\"\n4. Assert page contains \"Dashboard\"",
  "target_url": "https://app.com"
}
```

### Output

```json
{
  "total": 4,
  "passed": 3,
  "failed": 1,
  "results": [
    { "name": "Navigate to /login", "status": "passed", "duration_ms": 1200 },
    { "name": "Type email", "status": "passed", "duration_ms": 800 },
    { "name": "Click Sign In", "status": "passed", "duration_ms": 920 },
    { "name": "Assert Dashboard", "status": "failed", "duration_ms": 4750,
      "error": "Page does not contain 'Dashboard'",
      "accessibility_snapshot": "- heading 'Error: Invalid credentials'..." }
  ]
}
```

On failure, the **accessibility snapshot** is included so the Healer agent can analyze what went wrong.

---

## What's Ready vs What's Coming

| Component | Status | Owner |
|-----------|--------|-------|
| Playwright MCP Client | ✅ Done | Himanshu |
| GitHub MCP Client | ✅ Done | Himanshu |
| Repo Watcher (add/check repos) | ✅ Done | Himanshu |
| Agent Orchestrator | ✅ Done (simulated AI) | Himanshu |
| Test Runner & Session Manager | ✅ Done | Himanshu |
| All API Routes | ✅ Done | Himanshu |
| LangGraph AI Orchestration | 🔜 Next | Aaskar |
| Architect Agent (test plan gen) | 🔜 Next | Aaskar |
| Healer Agent (auto-fix bugs) | 🔜 Next | Aaskar |
| Frontend Dashboard | 🔜 Next | Himanshu |
| Slack/Courier notifications | 🔜 Future | — |
