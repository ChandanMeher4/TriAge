<div align="center">

<img src="./public/icon.png" alt="Triage Icon" width="120" />

# Triage - Autonomous Quality Engineering

> An autonomous AI system that uses Agentic AI, LLMs, and Playwright MCP to plan, execute, monitor, and self-heal software tests independently — bridging the gap between testing and SRE.

</div>

---

## ⚡ Quick Start — Local Development

### 1. Clone & Install

```bash
git clone https://github.com/ChandanMeher4/TriAge
cd Hack-karo
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>

# GitHub OAuth (for dashboard login)
GITHUB_ID=<your-oauth-app-client-id>
GITHUB_SECRET=<your-oauth-app-client-secret>

# GitHub MCP — Personal Access Token (repo read scope)
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Choose your LLM Provider
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
# OR
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# Triage Agent Config
SENTINELQA_DEFAULT_OWNER=<github-org-or-username>
SENTINELQA_DEFAULT_REPO=<repo-name>
SENTINELQA_DEFAULT_BRANCH=main
SENTINELQA_TARGET_URL=http://localhost:3000
```

### 3. Start the MCP Server

The GitHub MCP server must be running for the Architect agent to read repository code and generate test plans. Keep this terminal running.

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
npx @modelcontextprotocol/server-github
```

### 4. Start the Next.js Dashboard

Open a **new terminal** and run:

```bash
npm run dev
```

Visit **http://localhost:3000**

### 5. Set Up Notion Integration

Triage automatically creates a Notion page every time an agent takes action.
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) → **New Integration**. Copy the Token to `NOTION_TOKEN`.
2. Create a Database with columns: `Name` (Title), `Repo` (Text), `Agent` (Select), `Event` (Select), `Confidence` (Number), `PR Link` (URL), `Status` (Select).
3. Share the database with your integration and add the ID to `NOTION_DATABASE_ID`.

### 6. Trigger the Agent Pipeline

With the servers running, you can trigger the pipeline directly from the **Dashboard (http://localhost:3000)** via the **"Run Pipeline"** button, which allows you to enter the Repository, Branch, and Target URL in the frontend.

Alternatively, trigger via API:

```bash
curl -X POST http://localhost:3000/api/agent/pipeline/stream \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "YourOrg",
    "repo": "YourRepo",
    "branch": "main",
    "target_url": "http://localhost:3000"
  }'
```

---

## 1. The Problem Space: Why Triage Exists

### 1.1 The "Automation Debt" Crisis

Modern engineering teams face a compounding debt:
- **Flaky/Broken Tests**: 40-60% of E2E tests break after UI changes, costing hours of manual maintenance.
- **Blind Deployments**: Teams ship code without full confidence; post-deploy monitoring is reactive.
- **Siloed Tooling**: Playwright, Prometheus, GitHub, Slack exist in isolation — no unified reasoning layer.
- **MTTR Bottleneck**: Mean Time to Recovery averages **4-6 hours**; most time is spent in diagnosis.

### 1.2 The Deployment Gate Flow (Pre-Production)

Triage acts as a **quality gate before production**. The primary workflow triggers during staging/canary deployments:

```
Code Push → CI Builds → Deploy to STAGING
                              ↓
                    Triage kicks in:
                    1. AI writes E2E tests for the changed code
                    2. Runs tests against the staging environment
                    3. Checks ALL log sources (container logs, metrics, traces)
                    4. If everything passes → ✅ Green light to production
                    5. If something fails → ❌ Blocks deployment
                       → Performs RCA, creates fix PR, notifies team
```

Triage **prevents bad code from reaching production** rather than just reacting to production incidents.

---

## 2. The Brain: Multi-Agent Orchestration with LangGraph

LangGraph is the leading framework for **stateful, graph-based multi-agent orchestration**. Triage's five agents map to a **Supervisor + Specialist** pattern:

```mermaid
graph TD
    A["AI Orchestration Layer<br/>(Supervisor/Router)"] --> B["The Architect<br/>(Planner Agent)"]
    A --> C["The Scripter<br/>(Playwright MCP Agent)"]
    A --> D["The Watchdog<br/>(SRE Agent)"]
    A --> E["The Healer<br/>(Debugger Agent)"]
    A --> F["The Courier<br/>(Integrator Agent)"]

    B -->|Test Plans| C
    C -->|Test Results| D
    D -->|Failure Analysis| E
    E -->|Fix + Confidence| A
    A -->|Notify| F
```

### Agent Responsibilities & LangGraph Node Design

| Agent             | Role                                                                  | MCP Servers Used                                   | LangGraph Pattern                       |
| ----------------- | --------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------- |
| **The Architect** | Analyzes codebase/requirements → generates test plans                 | GitHub MCP                                         | Planner node                            |
| **The Scripter**  | Converts test plans → executable Playwright scripts, runs them        | Playwright MCP                                     | Executor node                           |
| **The Watchdog**  | Monitors observability stack, detects anomalies post-deploy/post-test | Prometheus MCP, Grafana MCP, Datadog MCP           | Watcher node (event-driven)             |
| **The Healer**    | Performs RCA on failures, generates code fixes                        | GitHub MCP, Playwright MCP (for DOM introspection) | Debugger node (cycles back to Scripter) |
| **The Courier**   | Creates PRs, files issues, sends Slack notifications                  | GitHub MCP, Slack MCP                              | Output node                             |

### The LangGraph State Machine — A Typical Flow

1. **TRIGGER**: New deployment detected / scheduled test run / manual trigger from dashboard.
2. **ARCHITECT**: Reads repo via GitHub MCP → generates test plan (Markdown).
3. **SCRIPTER**: Converts plan → Playwright test scripts → executes in headless browser cluster.
4. **DECISION NODE**: All tests pass?
   - **YES** → COURIER: Sends "All Clear" to Slack, updates dashboard.
   - **NO**  → WATCHDOG: Queries Prometheus/Grafana for correlated anomalies.
5. **HEALER**: Receives test failure + observability context.
   - Performs RCA (analyzes error, DOM snapshot, metrics).
   - Generates code fix + Confidence score.
6. **DECISION NODE**: Confidence score > threshold?
   - **YES** → COURIER: Creates GitHub PR with fix, notifies on Slack.
   - **NO**  → COURIER: Creates GitHub Issue with RCA report, pages oncall via Slack.

---

## 3. The Nervous System: Model Context Protocol (MCP)

### 3.1 What is MCP?

MCP is an **open standard introduced by Anthropic (Nov 2024)** that standardizes how AI systems connect to external tools and data. It is commonly called the _"USB-C port for AI"_. Each agent in the multi-agent squad gets its **own MCP client**, connecting to the appropriate MCP servers. This gives agents fine-grained, tool-scoped access.

### 3.2 Available MCP Servers (Relevant to Triage)

| MCP Server         | Capabilities                                                                                         | Maturity                            |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Playwright MCP** | Browser automation via accessibility tree, not screenshots. Planner/Generator/Healer agents built-in | ✅ Production-ready (by Microsoft)  |
| **GitHub MCP**     | Read repos, manage issues, create PRs, analyze code                                                  | ✅ Official (open-source by GitHub) |
| **Prometheus MCP** | Execute PromQL, list/discover metrics, troubleshoot infra                                            | ✅ Available (PyPI, Docker)         |
| **Grafana MCP**    | Dashboard management, data source querying, alerting                                                 | ✅ Official (by Grafana Labs)       |
| **Datadog MCP**    | Query logs/metrics/traces, investigate incidents via natural language                                | ⚠️ Preview                          |
| **Slack MCP**      | Search messages, send notifications, manage channels                                                 | ✅ Available (via user tokens)      |

> [!IMPORTANT]
> This is the critical insight: **Triage doesn't need to build custom integrations**. The MCP ecosystem already provides standardized bridges. The value-add is the _reasoning layer on top_.

---

## 4. The Muscle: Playwright MCP

Playwright MCP is **fundamentally different** from traditional Playwright scripting. Instead of developers writing static selectors manually (`page.click('#submit-btn')`), the AI reads the **accessibility tree** (DOM) and issues outcome-driven instructions (`"Click the Submit button"`). The AI resolves to the correct element dynamically.

**Language Agnostic Fixing**:
While Playwright MCP generates tests in TypeScript/JavaScript, the application being tested can be in **any language** (Go, Python, Java, Rust, etc.). When the Healer agent generates code fixes via the LLM, it is written in whatever language your project uses.

---

## 5. The Observability Feedback Loop

Logs and errors are not limited to Prometheus or Datadog. The Watchdog agent is **pluggable** — able to connect to whatever observability source the team uses.

1. **Prometheus MCP**: Execute PromQL queries in natural language. Example: _"Show me the p99 latency for the `/api/checkout` endpoint over the last 30 minutes"_.
2. **Grafana MCP**: Programmatically read dashboard panels, check alert states, create annotations.
3. **Datadog MCP**: Search distributed traces for error patterns, correlate deployment events.

### The Self-Healing Feedback Loop

This is the **core differentiator** of Triage:

```
Deploy → Watchdog detects anomaly (e.g., error rate spike from 0.1% to 5%)
    ↓
Watchdog pulls context: recent deployment SHA, affected service, error traces
    ↓
Healer performs RCA:
  - Reads the diff of the recent commit (via GitHub MCP)
  - Correlates with error traces (via Datadog MCP)
  - Identifies root cause (e.g., "null check removed in line 47 of checkout.ts")
    ↓
Healer generates fix + confidence score
    ↓
Courier: Creates PR with fix OR creates Issue with RCA report
Courier: Notifies team on Slack with full context
```

By automating Root Cause Analysis, Triage targets the diagnosis phase specifically, reducing Mean Time to Recovery (MTTR) by **50-70%**.

---

## 6. Competitive Landscape & Positioning

### 6.1 Direct Competitors

| Tool                      | Approach                             | Triage Differentiator                           |
| ------------------------- | ------------------------------------ | --------------------------------------------------- |
| **Applitools Autonomous** | Visual AI + NLP test authoring       | No observability integration, no self-healing infra |
| **Katalon TrueTest**      | AI test gen from real user journeys  | No RCA, no automated remediation                    |
| **Virtuoso QA**           | NLP scripting + self-healing tests   | No deployment monitoring loop                       |
| **ACCELQ Autopilot**      | GenAI test automation lifecycle      | No MCP, no multi-agent architecture                 |
| **Testsigma Atto**        | Low-code + AI coworkers              | No infrastructure observability                     |
| **Mabl**                  | AI-native test automation + adaptive | No GitHub PR generation, no root cause analysis     |

### 6.2 Triage's Unique Position

None of the existing tools close the **full loop**:

```text
       Existing Tools               Triage
       ─────────────               ──────────
Test Generation    ✅                  ✅
Test Execution     ✅                  ✅
Self-Healing Tests ✅                  ✅
Infra Monitoring   ❌                  ✅ (via Prometheus/Grafana/Datadog MCP)
Root Cause Analysis❌                  ✅ (Healer agent)
Auto-Remediation   ❌                  ✅ (generates code fixes)
PR Creation        ❌                  ✅ (via GitHub MCP)
Team Notification  ❌                  ✅ (via Slack MCP)
```

### 6.3 Market Opportunity

- **75% of companies** will adopt AI-driven test automation by 2025 (Gartner)
- AI-powered testing market projected at **$9.9 billion by 2034**
- Current solutions address testing alone — **none offer the observability ↔ remediation feedback loop**
- Target buyers: **CTOs and Lead Developers** at Series B+ companies running microservices on K8s

---

## 7. Technical Risks & Mitigations

| Risk                                 | Severity  | Mitigation                                                                                      |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------------------------- |
| **LLM Hallucination in Code Fixes**  | 🔴 High   | Confidence scoring + mandatory human review of all PRs; never auto-merge                        |
| **MCP Security Vulnerabilities**     | 🟡 Medium | Scoped tool permissions per agent; no destructive MCP actions without human approval            |
| **Cost of Claude API calls**         | 🟡 Medium | Caching test plans; batching related queries; using smaller models for simple routing decisions |
| **Playwright Test Flakiness**        | 🟡 Medium | Retry logic; accessibility-tree-based selectors are inherently more stable than CSS selectors   |
| **LangGraph Python ↔ Go Complexity** | 🟡 Medium | Clear gRPC contracts; containerize each service independently                                   |
| **Kubernetes Resource Costs**        | 🟡 Medium | Ephemeral pods for test execution; scale-to-zero when idle                                      |

---

## 8. Project Structure

```text
Hack-karo/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Landing page
│   │   ├── auth/page.tsx         ← Login / Signup (GitHub, Google, GitLab, Email)
│   │   ├── dashboard/page.tsx    ← Real-time agent monitoring dashboard
│   │   └── api/                  ← NextAuth + Next.js API Routes for LangGraph triggers
│   ├── lib/
│   │   ├── mongodb.ts            ← MongoDB client singleton
│   │   ├── mcp/                  ← Integrations for Playwright, GitHub, Slack
│   │   ├── orchestrator.ts       ← Core LangGraph/AI Engine controller
│   │   └── test-runner.ts        ← Executes tests generated by the AI
│   └── components/               ← React components for UI/Dashboard
├── ai-engine/                    ← Python FastAPI backend for AI processing
│   ├── sentinel/agents/          ← Logic for Architect, Watchdog, Healer, etc.
│   ├── llm/client.py             ← LLM provider configuration (Groq/Anthropic)
│   └── server.py                 ← LangGraph orchestration endpoints
├── docs/                         ← Architecture diagrams & workbooks
└── .env                          ← Environment variables (git-ignored)
```

---

## 9. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion, Three.js |
| **Auth** | Auth.js (NextAuth v4) — GitHub, Google, GitLab OAuth + Email/Password |
| **Database** | MongoDB Atlas (users, sessions, test traces, agent memory) |
| **AI/LLM** | Claude 3.5/4 (Anthropic) or Llama 3.3 (Groq) via LangGraph multi-agent orchestration |
| **MCP Servers** | GitHub MCP, Playwright MCP, Prometheus MCP, Slack MCP |
| **Testing** | Playwright (headless Chromium, accessibility-tree based) |
| **Observability** | Prometheus, Grafana, Datadog |
| **Infrastructure** | Kubernetes, Docker, GitHub Actions |

---

## 10. Getting OAuth Credentials

| Provider | Where to get credentials | Callback URL |
|---|---|---|
| **GitHub** | [github.com/settings/developers](https://github.com/settings/developers) → OAuth Apps | `http://localhost:3000/api/auth/callback/github` |
| **Google** | [console.cloud.google.com](https://console.cloud.google.com) → Credentials → OAuth Client ID | `http://localhost:3000/api/auth/callback/google` |
| **GitLab** | [gitlab.com/-/profile/applications](https://gitlab.com/-/profile/applications) — scopes: `read_user openid profile email` | `http://localhost:3000/api/auth/callback/gitlab` |
| **GitHub PAT** | [github.com/settings/tokens](https://github.com/settings/tokens) — scope: `repo` | _(used by GitHub MCP server, not OAuth)_ |
