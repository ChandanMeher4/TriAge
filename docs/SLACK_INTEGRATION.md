# SentinelQA — Slack Integration

> **Purpose**: Real-time Slack notifications for every key event in the SentinelQA pipeline — agent triggers, test results, and errors.  
> **Channel**: `#sentinelqa`  
> **Owner**: Harsh & Himanshu  
> **Branch**: `feature/slack-integration`

---

## Overview

SentinelQA sends professional Slack notifications (using Block Kit) at every significant pipeline event so the team never has to poll a dashboard to know what

```
  GitHub Commit Detected
         │
         ▼
  🔔 Slack: "Agent Triggered — 3 new commits on Hack-karo"
         │
         ▼
  Tests Start Running
         │
         ▼
  ┌──────────────────────────────┐
  │  All Pass?  ──Yes──▶  ✅ Slack: "All 12 tests passed (2.3s)"  │
  │             ──No───▶  ❌ Slack: "4/12 tests failed — step breakdown"  │
  └──────────────────────────────┘
         │
  On any exception:
         ▼
  🚨 Slack: "Pipeline Error — stage: Test Execution — <error message>"
```

---

## Notification Types

### 1. 🔍 Agent Triggered
Fires when the repo watcher detects **new commits** on a watched branch.

**Contains:**
- Repository name + branch (linked to GitHub)
- Number of new commits
- List of up to 5 recent commit messages with SHA and author
- Timestamp

**Trigger:** `POST /api/agent/repos/check` → when `hasChanges === true`

---

### 2. ⚡ Tests Started *(optional — available in code)*
Fires when test execution begins.

**Contains:**
- Repo, session ID, target URL
- Number of test steps to be executed

**Trigger:** Call `notifyTestsStarted(...)` manually from your route if needed.

---

### 3. ✅ All Tests Passed
Fires when the full test run completes with zero failures.

**Contains:**
- Total tests passed
- Duration (seconds)
- Session ID for traceability

**Trigger:** `POST /api/agent/pipeline` or `POST /api/agent/run-tests` → when `failed === 0`

---

### 4. ❌ Tests Failed
Fires when one or more tests fail. Designed to give engineers enough context to act immediately — no need to open the dashboard.

**Contains:**
- Pass/fail counts out of total
- Duration
- Up to 6 failed steps with step description + error message (truncated to 120 chars)
- Session ID + target URL

**Trigger:** `POST /api/agent/pipeline` or `POST /api/agent/run-tests` → when `failed > 0`

---

### 5. 🚨 Pipeline Error
Fires when an unhandled exception crashes any stage of the pipeline.

**Contains:**
- Repo and stage name (e.g., "Pipeline Execution", "Test Execution")
- Full error message (up to 500 chars)
- Timestamp

**Trigger:** `catch` block in any API route

---

## File Structure

```
src/
└── lib/
    └── notifications/
        └── slack.ts          ← All notification logic lives here

src/app/api/agent/
├── pipeline/route.ts         ← notifyPipelineStarted, notifyTestsPassed/Failed, notifyPipelineError
├── run-tests/route.ts        ← notifyTestsPassed/Failed, notifyPipelineError
└── repos/check/route.ts      ← notifyAgentTriggered (only when hasChanges)
```

---

## Environment Setup

Add this to your `.env.local`:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxxx
```

The notifier reads `process.env.SLACK_WEBHOOK_URL` automatically. If the variable is missing, notifications are silently skipped with a console warning — the pipeline never breaks because of Slack.

---

## How to Create / Rotate the Webhook

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your app (or create a new one → **Create New App → From Scratch**)
3. Go to **Incoming Webhooks** → toggle **Activate Incoming Webhooks** ON
4. Click **Add New Webhook to Workspace** → select `#sentinelqa`
5. Copy the webhook URL → paste into `.env.local` as `SLACK_WEBHOOK_URL`
6. Restart the dev server: `npm run dev`

---

## Using the Notifier in Your Code

Import only what you need:

```typescript
import {
  notifyAgentTriggered,
  notifyTestsStarted,
  notifyTestsPassed,
  notifyTestsFailed,
  notifyPipelineError,
} from "@/lib/notifications/slack";
```

### Examples

**Agent triggered by new commits:**
```typescript
await notifyAgentTriggered(
  "Arpit529Srivastava",   // owner
  "Hack-karo",            // repo
  "main",                 // branch
  3,                      // commitCount
  [
    { sha: "a1b2c3d", message: "fix: auth flow", author: "arpit" },
    { sha: "e4f5g6h", message: "feat: dashboard", author: "himanshu" },
  ]
);
```

**All tests passed:**
```typescript
await notifyTestsPassed(
  "Arpit529Srivastava",
  "Hack-karo",
  "http://localhost:3000",
  12,             // total tests
  2340,           // duration in ms
  "session_xyz"
);
```

**Tests failed with details:**
```typescript
await notifyTestsFailed(
  "Arpit529Srivastava",
  "Hack-karo",
  "http://localhost:3000",
  8,              // passed
  4,              // failed
  12,             // total
  5100,           // duration in ms
  "session_xyz",
  [
    { step: "Click the 'Sign In' button", error: "Element not found" },
    { step: "Assert page contains 'Dashboard'", error: "Expected text not visible" },
  ]
);
```

**Pipeline error:**
```typescript
await notifyPipelineError(
  "Arpit529Srivastava",
  "Hack-karo",
  "GitHub Code Read",     // stage name
  "ECONNREFUSED — Docker not running"
);
```

---

## Notification Preview (Block Kit)

Each notification uses Slack's **Block Kit** format — structured, scannable cards instead of plain text walls.

```
┌──────────────────────────────────────────────────┐
│  ❌  SentinelQA — Tests Failed                   │
├──────────────────────────────────────────────────┤
│  4/12 tests failed on http://localhost:3000 —    │
│  immediate attention required!                   │
├──────────────────────────────────────────────────┤
│  Repo              │ Failed                       │
│  Arpit/Hack-karo   │ ✗ 4                          │
│  Passed            │ Duration                     │
│  ✓ 8               │ 5.1s                         │
├──────────────────────────────────────────────────┤
│  Failed Steps:                                   │
│                                                  │
│  • Step: Click the 'Sign In' button              │
│    Error: Element not found                      │
│                                                  │
│  • Step: Assert page contains 'Dashboard'        │
│    Error: Expected text not visible              │
├──────────────────────────────────────────────────┤
│  Session: session_xyz  │ Target: localhost:3000  │
├──────────────────────────────────────────────────┤
│  Failed at Mar 9, 2026 at 2:34 PM — Check       │
│  session session_xyz for full details.           │
└──────────────────────────────────────────────────┘
```

---

## Failure Behaviour

| Scenario | Behaviour |
|---|---|
| `SLACK_WEBHOOK_URL` not set | Warning logged to console, pipeline continues normally |
| Slack API returns non-200 | Error logged to console, pipeline continues normally |
| Network timeout / fetch error | Error caught and logged, pipeline continues normally |

Slack calls are **non-blocking** — routes fire them with `void notifyX(...)` so the HTTP response is never held waiting on Slack. Each webhook request has a hard **5-second timeout** via `AbortSignal.timeout(5_000)`, so even a completely unresponsive Slack endpoint cannot stall the pipeline for more than 5 seconds.

---

## Branch

```
feature/slack-integration
```

Commit this file along with:
- `src/lib/notifications/slack.ts`
- Updated `src/app/api/agent/pipeline/route.ts`
- Updated `src/app/api/agent/run-tests/route.ts`
- Updated `src/app/api/agent/repos/check/route.ts`
- `.env.example` (with `SLACK_WEBHOOK_URL=` placeholder)
