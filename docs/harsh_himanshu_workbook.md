# 🟢 Harsh & Himanshu's Workbook — Fullstack Engineers

> **Role**: Playwright MCP Integration + Next.js Frontend Dashboard  
> **Tech Stack**: TypeScript, Node.js, Playwright, Next.js, React, WebSocket  
> **You Own**: The Scripter Agent (Playwright side), Test Execution, SaaS Dashboard, Real-Time UI

---

## What You're Building (In Simple Terms)

You're building **two things**:

### 1. The Test Execution Engine (Playwright MCP)

When Aaskar's AI brain (LangGraph) generates a test plan, **your code takes that plan and actually runs it in a browser**. You use Playwright MCP to:

- Receive a test plan (Markdown) from the Architect agent
- Convert it into actual Playwright TypeScript tests
- Run them in a headless browser
- Return results (pass/fail/errors) back to the AI pipeline

### 2. The SaaS Dashboard (Next.js)

A beautiful, real-time dashboard where users can:

- See the 5 AI agents' status (running/idle/error)
- Watch live terminal output of test execution
- View test results, metrics, and RCA reports
- Approve/reject auto-generated PRs

---

## Work Split Between Harsh & Himanshu

| Component                        | Suggested Owner | Why                             |
| -------------------------------- | --------------- | ------------------------------- |
| **Playwright MCP integration**   | **Harsh**       | Deeper backend integration work |
| **Next.js frontend dashboard**   | **Himanshu**    | Frontend UI/UX intensive        |
| **WebSocket real-time layer**    | **Both**        | Bridges both sides              |
| **Test result visualization**    | **Himanshu**    | Chart.js/Recharts + UI          |
| **Test runner containerization** | **Harsh**       | Docker + headless browser setup |

_(Feel free to swap — this is just a suggestion)_

---

## What You Need to Learn First

### 1. Playwright MCP (Priority: 🔴 Critical)

Playwright MCP is NOT regular Playwright scripting. Instead of writing `page.click('#btn')`, the AI sends natural language commands and the MCP server interacts with the browser using the **accessibility tree** (not CSS selectors).

**Key concepts:**

- MCP Server: Runs alongside a browser, exposes tools for navigation, clicking, typing, asserting
- Accessibility Snapshots: The AI sees the page as a semantic tree (roles, labels, states), NOT as HTML
- Playwright's 3 built-in agents: Planner (explores app), Generator (writes tests), Healer (fixes broken tests)

**Resources:**

- 📖 [Playwright MCP Official Repo](https://github.com/microsoft/playwright-mcp)
- 📖 [Playwright MCP Documentation](https://playwright.dev/docs/mcp)
- 📖 [Playwright Test Agents Guide](https://playwright.dev/docs/test-agents)
- 🎥 [Playwright MCP Tutorial (YouTube)](https://www.youtube.com/results?search_query=playwright+mcp+server+tutorial)
- 📖 [Playwright Test Docs](https://playwright.dev/docs/intro)

### 2. Next.js App Router (Priority: 🔴 Critical)

**Resources:**

- 📖 [Next.js Docs](https://nextjs.org/docs)
- 📖 [Next.js App Router](https://nextjs.org/docs/app)
- 📖 [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

### 3. WebSocket for Real-Time (Priority: 🟡 Medium — Phase 2)

**Resources:**

- 📖 [WebSocket with Next.js](https://socket.io/how-to/use-with-nextjs)
- 📖 [Socket.io Docs](https://socket.io/docs/v4/)

### 4. Glassmorphism + Dark Mode Design (Priority: 🟡 Medium)

**Resources:**

- 📖 [Glassmorphism CSS Generator](https://glassmorphism.com/)
- 📖 [Glassmorphism Guide](https://hype4.academy/articles/design/glassmorphism-how-create-glass-effect-in-css)

---

## Phase-by-Phase Tasks

### Phase 1: Foundation

**Goal**: Get Playwright MCP running + basic Next.js dashboard with agent cards.

#### HARSH — Playwright MCP Setup

##### Step 1: Install and Run Playwright MCP Server

```bash
# Create playwright service directory
mkdir -p services/playwright-runner && cd services/playwright-runner
npm init -y

# Install Playwright
npm install @playwright/test playwright
npx playwright install chromium

# Install MCP server
npm install @anthropic-ai/mcp @modelcontextprotocol/server-playwright
# OR use the official playwright MCP:
npx @playwright/mcp@latest
```

##### Step 2: Run Your First MCP Test

Get Playwright MCP running and interacting with a real website:

```bash
# Start the MCP server
npx @playwright/mcp@latest --headless

# The server exposes tools like:
# - browser_navigate: Go to a URL
# - browser_click: Click an element (by accessibility label)
# - browser_type: Type text into a field
# - browser_snapshot: Get accessibility tree of current page
# - browser_assert: Assert something on the page
```

##### Step 3: Build the Test Runner Service

Create a Node.js service that:

1. Receives a test plan (Markdown) from Aaskar's LangGraph (via API call)
2. Uses Playwright MCP to execute the tests
3. Returns results as JSON

```typescript
// Expected interface (agree with Aaskar):

// INPUT: Test plan from Architect agent
interface TestPlanInput {
  test_plan: string; // Markdown test plan
  target_url: string; // URL of the app to test
  session_id: string; // For tracking
}

// OUTPUT: Test results back to LangGraph
interface TestResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  duration_ms: number;
  error?: string;
  screenshot_base64?: string; // On failure
  accessibility_snapshot?: string; // DOM state on failure
}

interface TestRunOutput {
  session_id: string;
  results: TestResult[];
  total: number;
  passed: number;
  failed: number;
  duration_ms: number;
}
```

##### Step 4: Containerize the Browser

```dockerfile
# Dockerfile for headless Playwright runner
FROM mcr.microsoft.com/playwright:v1.43.0-jammy

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["node", "server.js"]
```

---

#### HIMANSHU — Next.js Dashboard Setup

##### Step 1: Create Next.js App

```bash
cd /Users/arpitsrivastava/Desktop/Hack-karo
npx -y create-next-app@latest frontend --typescript --app --no-src-dir --tailwind
cd frontend
```

##### Step 2: Set Up the Design System

Create the "Cyber-Engineering" dark mode aesthetic:

```css
/* app/globals.css — Design Tokens */
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-glass: rgba(255, 255, 255, 0.05);
  --accent-cyan: #00f5ff;
  --accent-purple: #7b2ffa;
  --accent-green: #00ff88;
  --accent-red: #ff4757;
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
  --border-glass: rgba(255, 255, 255, 0.1);
  --blur-glass: blur(12px);
}

/* Glassmorphism Card */
.glass-card {
  background: var(--bg-glass);
  backdrop-filter: var(--blur-glass);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
}
```

**Fonts to import:**

- `JetBrains Mono` — for terminal/code sections
- `Inter` — for all UI text

##### Step 3: Build the Agent Status Cards

Create 5 cards showing each agent's live status:

```
┌─────────────────────┐
│ 🧠 THE ARCHITECT    │
│ Status: ● RUNNING   │
│ Task: Generating     │
│   test plan for      │
│   checkout-service   │
│ Last: 2 min ago     │
└─────────────────────┘
```

Each card should have:

- Agent name + icon
- Status indicator (green=idle, cyan=running, red=error)
- Current task description
- Time since last action
- Pulsing animation when running

##### Step 4: Build the Dashboard Layout

```
┌──────────────────────────────────────────────────┐
│  SentinelQA                         [Settings] ⚙ │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │Architect│ │Scripter │ │Watchdog │            │
│  └─────────┘ └─────────┘ └─────────┘            │
│  ┌─────────┐ ┌─────────┐                        │
│  │ Healer  │ │ Courier │                        │
│  └─────────┘ └─────────┘                        │
│                                                   │
│  ┌──────────────────┐ ┌──────────────────┐       │
│  │ LIVE TERMINAL    │ │ TEST RESULTS     │       │
│  │ > Running test...│ │ ✅ Login: pass   │       │
│  │ > Navigating to  │ │ ❌ Cart: fail    │       │
│  │   /checkout...   │ │ ✅ Search: pass  │       │
│  └──────────────────┘ └──────────────────┘       │
│                                                   │
│  ┌─────────────────────────────────────────┐     │
│  │ RECENT ACTIVITY                          │     │
│  │ 🟢 10:42 — Architect generated test plan │     │
│  │ 🔵 10:43 — Scripter running 5 tests      │     │
│  │ 🔴 10:44 — Test "Checkout" failed         │     │
│  └─────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

**Deliverable**: A working Next.js app with the dark mode design, agent cards (with mock data), and the layout above.

---

### Phase 2: Integration

**Goal**: Connect everything to real data via WebSocket + build the live terminal.

#### HARSH — Playwright ↔ LangGraph Integration

- Connect your test runner to Aaskar's LangGraph agent
- Stream test execution logs to the dashboard via WebSocket
- Handle concurrent test sessions

#### HIMANSHU — Real-Time Dashboard

- Implement WebSocket connection to Arpit's Go API server
- **Live Terminal Component**: Green-on-black terminal that streams Playwright output in real-time
- **Test Results Panel**: Auto-updates as tests complete
- **Metrics Sparklines**: Small inline charts (use Recharts) showing recent pass/fail trends

##### Live Terminal Component

```typescript
// Key features:
// - Monospace font (JetBrains Mono)
// - Auto-scroll to bottom
// - Color-coded output (green=pass, red=fail, cyan=info)
// - Timestamp prefix on each line
// - Smooth typing animation for incoming text
```

---

### Phase 3: Self-Healing

#### HARSH — Healer Integration

- When Aaskar's Healer generates a code fix, display it in a code diff viewer
- Playwright DOM snapshots on failure → send to Healer for context

#### HIMANSHU — Advanced Dashboard Pages

**RCA Report Page:**

- Display Healer-generated root cause analysis
- Show the code diff (before/after)
- Show related metrics/logs that contributed to the diagnosis
- "Approve PR" / "Reject" buttons

**PR Tracker Page:**

- List of auto-generated PRs with status (open/merged/rejected)
- Link to GitHub PR

**Landing Page ("The Hook"):**

- Animated 30-second demo loop showing the full SentinelQA flow
- Use CSS animations + typed.js for the terminal effect
- Glassmorphism hero section with particle background (Three.js)

---

### Phase 4: Polish

#### Both

- Responsive design (mobile + tablet)
- Loading states and error handling
- Performance optimization (lazy loading, code splitting)
- Integration testing with the full pipeline

---

## What You Deliver

| Phase   | HARSH Delivers                                                | HIMANSHU Delivers                               |
| ------- | ------------------------------------------------------------- | ----------------------------------------------- |
| Phase 1 | Playwright MCP running, test runner service, Docker container | Next.js app with dark mode, agent cards, layout |
| Phase 2 | Playwright ↔ LangGraph connected, log streaming               | Live terminal, WebSocket, real-time updates     |
| Phase 3 | Healer integration, DOM snapshots                             | RCA report page, PR tracker, landing page       |
| Phase 4 | Containerized test runner on K8s                              | Responsive polish, performance optimization     |

---

## Key Decisions for You

1. **Playwright MCP generates TypeScript tests only** — this is fine, don't fight it
2. **The app being tested can be in any language** — Playwright just interacts with the browser UI
3. **Use Tailwind CSS** for the dashboard — fastest way to match the glassmorphism design
4. **WebSocket for live data, REST for historical data** — don't WebSocket everything
5. **Three.js particle background** — only on the landing page, not the dashboard (performance)
