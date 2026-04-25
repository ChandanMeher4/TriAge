# SentinelQA API Contract

> **Version**: 1.0.0  
> **Owner**: Arpit (Infrastructure)  
> **Consumers**: Aaskar (AI Agents), Harsh/Himanshu (Dashboard)  
> **Last Updated**: March 8, 2026

---

## Table of Contents

- [Overview](#overview)
- [Base URLs](#base-urls)
- [Authentication](#authentication)
- [MCP Gateway API](#mcp-gateway-api)
- [Session Management API](#session-management-api)
- [Courier API](#courier-api)
- [WebSocket Events](#websocket-events)
- [Watchdog API](#watchdog-api-phase-2)
- [Error Codes](#error-codes)
- [Rate Limits](#rate-limits)
- [Versioning](#versioning)
- [Health Check](#health-check)
- [Next Steps](#next-steps)

---

## Overview

This contract defines the interface between:
- **Arpit's Go API Server** (infrastructure layer)
- **Aaskar's LangGraph Agents** (AI orchestration)
- **Harsh/Himanshu's Dashboard** (UI)

**Architectural Pattern**: Clients → Go API → MCP Gateway → MCP Servers

---

## Base URLs

| Environment | URL                          |
| ----------- | ---------------------------- |
| Development | `http://localhost:8080`      |
| Staging     | `https://staging.sentinel.qa` |
| Production  | `https://api.sentinel.qa`    |

**Note**: All endpoint paths in this document include the `/api` prefix (e.g., `POST /api/sessions`). Combine the base URL with the endpoint path for the full URL.

---

## Authentication

All requests require a Bearer token in the `Authorization` header.

```http
Authorization: Bearer <jwt_token>
```

**Token Payload**:
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "admin|developer|viewer",
  "iat": 1772928000,
  "exp": 1773014400
}
```

**Role-Based Access Control**:
- `admin` - Full access to all endpoints
- `developer` - Can create/update sessions, call MCP tools, trigger Courier
- `viewer` - Read-only access to sessions and results

**Error Response (401)**:
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "code": "AUTH_INVALID_TOKEN"
}
```

**Standard Error Envelope**: All error responses follow the format `{ "success": false, "error": "...", "message": "...", "code": "..." }`. Success responses use `{ "success": true, "data": {...} }` for MCP/Courier endpoints, or return data directly for Session endpoints.

---

## MCP Gateway API

### Overview
The MCP Gateway proxies JSON-RPC 2.0 calls to MCP servers (GitHub, Playwright, Prometheus). This allows Python/TypeScript clients to call MCP tools via REST instead of spawning processes.

### 1. Call GitHub MCP Tool

**Endpoint**: `POST /api/mcp/github/call`

**Authorization**: Requires `developer` or `admin` role

**Purpose**: Execute GitHub MCP server tools (read files, list commits, create issues/PRs)

**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "github__get_file_contents",
    "arguments": {
      "owner": "facebook",
      "repo": "react",
      "path": "src/index.js",
      "ref": "main"
    }
  }
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "content": "import React from 'react';\n...",
    "sha": "abc123",
    "size": 2048,
    "encoding": "utf-8"
  }
}
```

**Available GitHub Tools**:
- `github__get_file_contents` - Read file from repo
- `github__list_commits` - Get commit history
- `github__create_issue` - Create GitHub issue
- `github__create_pull_request` - Create GitHub PR
- `github__search_code` - Search code in repo
- `github__get_pull_request` - Get PR details

**Error Response (500)**:
```json
{
  "success": false,
  "error": "MCP server error",
  "message": "GitHub API rate limit exceeded",
  "code": "MCP_GITHUB_RATE_LIMIT"
}
```

---

### 2. Call Playwright MCP Tool

**Endpoint**: `POST /api/mcp/playwright/call`

**Authorization**: Requires `developer` or `admin` role

**Purpose**: Execute Playwright MCP tools (navigate, click, type, snapshot)

**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "playwright_navigate",
    "arguments": {
      "url": "https://example.com/login"
    }
  }
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "status": "success",
    "url": "https://example.com/login",
    "title": "Login - Example App"
  }
}
```

**Available Playwright Tools**:
- `playwright_navigate` - Navigate to URL
- `playwright_click` - Click element by accessible name
- `playwright_type` - Type text into input
- `playwright_snapshot` - Get accessibility tree snapshot
- `playwright_hover` - Hover over element
- `playwright_wait` - Wait for element/condition
- `playwright_select_option` - Select dropdown option
- `playwright_screenshot` - Take screenshot

---

### 3. Call Prometheus MCP Tool (Phase 2)

**Endpoint**: `POST /api/mcp/prometheus/call`

**Authorization**: Requires `developer` or `admin` role

**Purpose**: Query Prometheus metrics for observability

**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "prometheus_query",
    "arguments": {
      "query": "rate(http_requests_total[5m])",
      "time": "2026-03-08T10:00:00Z"
    }
  }
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "resultType": "vector",
    "result": [
      {
        "metric": {"__name__": "http_requests_total", "status": "200"},
        "value": [1709888400, "125.5"]
      }
    ]
  }
}
```

---

## Session Management API

### Overview
Sessions track test runs from trigger → test plan → execution → results → remediation.

### 1. Create Session

**Endpoint**: `POST /api/sessions`

**Authorization**: Requires `developer` or `admin` role

**Purpose**: Initialize a new test session

**Request**:
```json
{
  "trigger_type": "deployment",
  "repo_url": "https://github.com/facebook/react",
  "branch": "main",
  "commit_sha": "abc123def456",
  "target_url": "https://staging.example.com",
  "metadata": {
    "triggered_by": "GitHub Actions",
    "pr_number": 12345
  }
}
```

**Response (201)**:
```json
{
  "session_id": "sess_1234567890abcdef",
  "status": "initialized",
  "created_at": "2026-03-08T10:00:00Z",
  "ws_url": "wss://api.sentinel.qa/ws/sessions/sess_1234567890abcdef"
}
```

---

### 2. Get Session

**Endpoint**: `GET /api/sessions/:session_id`

**Authorization**: All authenticated roles (`viewer`, `developer`, `admin`)

**Purpose**: Retrieve session state and results

**Response (200)**:
```json
{
  "session_id": "sess_1234567890abcdef",
  "status": "running",
  "trigger_type": "deployment",
  "repo_url": "https://github.com/facebook/react",
  "branch": "main",
  "commit_sha": "abc123def456",
  "current_stage": "executing_tests",
  "agents": {
    "architect": {
      "status": "completed",
      "started_at": "2026-03-08T10:00:01Z",
      "completed_at": "2026-03-08T10:00:15Z",
      "output": {
        "test_plan": "## Test: Login Flow\n..."
      }
    },
    "scripter": {
      "status": "running",
      "started_at": "2026-03-08T10:00:16Z",
      "progress": "3/5 tests completed"
    }
  },
  "test_results": [
    {
      "name": "Login Flow",
      "status": "passed",
      "duration_ms": 2340
    },
    {
      "name": "Checkout Flow",
      "status": "failed",
      "error": "Button 'Confirm Purchase' not found",
      "screenshot_url": "https://s3.../screenshot.png"
    }
  ],
  "created_at": "2026-03-08T10:00:00Z",
  "updated_at": "2026-03-08T10:00:45Z"
}
```

**Session Status Values**:
- `initialized` - Session created, waiting for Architect
- `generating_tests` - Architect agent running
- `executing_tests` - Scripter running Playwright tests
- `analyzing_failures` - Watchdog analyzing anomalies
- `healing` - Healer generating fixes
- `reporting` - Courier creating PR/Issue
- `completed` - All stages done, success
- `failed` - Unrecoverable error
- `cancelled` - User cancelled

---

### 3. Update Session State

**Endpoint**: `PUT /api/sessions/:session_id/state`

**Authorization**: Requires `developer` or `admin` role (not accessible to `viewer`)

**Purpose**: Update session checkpoints (used by LangGraph for persistence)

**Request**:
```json
{
  "current_stage": "healing",
  "agents": {
    "healer": {
      "status": "running",
      "started_at": "2026-03-08T10:05:00Z"
    }
  },
  "checkpoint_data": {
    "langgraph_state": {
      "test_plan": "## Test: Login Flow\n...",
      "test_results": [
        {
          "name": "Login Flow",
          "status": "passed",
          "duration_ms": 2340
        },
        {
          "name": "Checkout Flow",
          "status": "failed",
          "error": "Button not found"
        }
      ],
      "rca_report": "Root cause: Button ID changed in commit abc123"
    }
  }
}
```

**Response (200)**:
```json
{
  "success": true,
  "session_id": "sess_1234567890abcdef",
  "updated_at": "2026-03-08T10:05:01Z"
}
```

---

### 4. List Sessions

**Endpoint**: `GET /api/sessions`

**Authorization**: All authenticated roles (`viewer`, `developer`, `admin`)

**Purpose**: List all sessions with filtering

**Query Parameters**:
- `status` - Filter by status (e.g., `running`, `completed`)
- `repo_url` - Filter by repository
- `trigger_type` - Filter by trigger type
- `from` - Start date (ISO 8601)
- `to` - End date (ISO 8601)
- `limit` - Max results (default: 50, max: 200)
- `offset` - Pagination offset

**Example**: `GET /api/sessions?status=failed&limit=20`

**Response (200)**:
```json
{
  "sessions": [
    {
      "session_id": "sess_abc123",
      "status": "failed",
      "repo_url": "https://github.com/facebook/react",
      "created_at": "2026-03-08T09:30:00Z"
    }
  ],
  "total": 127,
  "limit": 20,
  "offset": 0
}
```

---

### 5. Cancel Session

**Endpoint**: `DELETE /api/sessions/:session_id`

**Authorization**: Requires `developer` or `admin` role

**Purpose**: Cancel a running session

**Response (200)**:
```json
{
  "success": true,
  "session_id": "sess_1234567890abcdef",
  "status": "cancelled",
  "cancelled_at": "2026-03-08T10:10:00Z"
}
```

---

## Courier API

### Overview
Courier handles GitHub PR/Issue creation after test completion or failure.

### 1. Create Pull Request

**Endpoint**: `POST /api/courier/pr`

**Authorization**: Requires `developer` or `admin` role

**Purpose**: Create a GitHub PR with code fixes (used by Healer agent)

**Request**:
```json
{
  "session_id": "sess_1234567890abcdef",
  "repo_url": "https://github.com/facebook/react",
  "base_branch": "main",
  "head_branch": "sentinel-fix-checkout-flow",
  "title": "[SentinelQA] Fix: Checkout button ID mismatch",
  "body": "## Root Cause Analysis\n\nTest failure in `Checkout Flow` detected...\n\n## Proposed Fix\n\nChanged button ID from `confirmBtn` to `confirm-purchase`...",
  "diff": "--- a/src/components/Checkout.tsx\n+++ b/src/components/Checkout.tsx\n@@ -15,7 +15,7 @@\n-  <button id=\"confirmBtn\">Confirm</button>\n+  <button id=\"confirm-purchase\">Confirm Purchase</button>",
  "confidence_score": 0.92,
  "metadata": {
    "healer_agent_version": "1.2.0",
    "failed_tests": ["Checkout Flow", "Payment Flow"]
  }
}
```

**Response (201)**:
```json
{
  "success": true,
  "pr_url": "https://github.com/facebook/react/pull/12346",
  "pr_number": 12346,
  "created_at": "2026-03-08T10:15:00Z"
}
```

---

### 2. Create Issue

**Endpoint**: `POST /api/courier/issue`

**Authorization**: Requires `developer` or `admin` role

**Purpose**: Create a GitHub issue for low-confidence fixes or manual review

**Request**:
```json
{
  "session_id": "sess_1234567890abcdef",
  "repo_url": "https://github.com/facebook/react",
  "title": "[SentinelQA Alert] Test failure: Checkout Flow",
  "body": "## Test Failure Report\n\n**Test**: Checkout Flow  \n**Error**: Button 'Confirm Purchase' not found  \n**Screenshot**: https://s3.../screenshot.png\n\n## Root Cause Analysis\n\nThe Healer agent detected a button ID mismatch but confidence score is low (0.65).\n\nManual review required.",
  "labels": ["sentinel-qa", "test-failure", "needs-review"],
  "confidence_score": 0.65,
  "metadata": {
    "test_results": [...]
  }
}
```

**Response (201)**:
```json
{
  "success": true,
  "issue_url": "https://github.com/facebook/react/issues/12347",
  "issue_number": 12347,
  "created_at": "2026-03-08T10:15:00Z"
}
```

---

### 3. Send Slack Notification (Future)

**Endpoint**: `POST /api/courier/slack`

**Authorization**: Requires `developer` or `admin` role

**Purpose**: Send real-time notifications to Slack

**Request**:
```json
{
  "session_id": "sess_1234567890abcdef",
  "channel": "#qa-alerts",
  "message": "🚨 Test failure detected in `facebook/react` (main branch)",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Test*: Checkout Flow\n*Error*: Button not found\n*Session*: <https://sentinel.qa/sessions/sess_123|View Details>"
      }
    }
  ]
}
```

**Response (200)**:
```json
{
  "success": true,
  "slack_ts": "1709888400.123456"
}
```

---

## WebSocket Events

### Overview
Real-time updates for session progress. Aaskar's agents subscribe to events, Dashboard displays live status.

### Connection

**URL**: `wss://api.sentinel.qa/ws/sessions/:session_id`

**Authentication**: Send JWT in the `Sec-WebSocket-Protocol` header during WebSocket handshake:
```javascript
// JavaScript example
const ws = new WebSocket(
  'wss://api.sentinel.qa/ws/sessions/sess_123',
  ['Bearer', jwt_token]
);
```

**Security Note**: Never pass authentication tokens as query parameters, as they will be logged by servers and proxies. Use the WebSocket subprotocol negotiation or upgrade headers instead.

---

### Event Types

#### 1. `session.status_changed`

```json
{
  "event": "session.status_changed",
  "session_id": "sess_1234567890abcdef",
  "timestamp": "2026-03-08T10:00:45Z",
  "data": {
    "old_status": "generating_tests",
    "new_status": "executing_tests",
    "current_stage": "scripter"
  }
}
```

---

#### 2. `agent.started`

```json
{
  "event": "agent.started",
  "session_id": "sess_1234567890abcdef",
  "timestamp": "2026-03-08T10:00:01Z",
  "data": {
    "agent": "architect",
    "input": {
      "repo_url": "https://github.com/facebook/react",
      "changed_files": ["src/index.js", "src/app.js"]
    }
  }
}
```

---

#### 3. `agent.completed`

```json
{
  "event": "agent.completed",
  "session_id": "sess_1234567890abcdef",
  "timestamp": "2026-03-08T10:00:15Z",
  "data": {
    "agent": "architect",
    "status": "success",
    "duration_ms": 14000,
    "output": {
      "test_plan": "## Test: Login Flow\n..."
    }
  }
}
```

---

#### 4. `test.progress`

```json
{
  "event": "test.progress",
  "session_id": "sess_1234567890abcdef",
  "timestamp": "2026-03-08T10:02:30Z",
  "data": {
    "completed": 3,
    "total": 5,
    "current_test": "Checkout Flow",
    "results": [
      {"name": "Login Flow", "status": "passed"},
      {"name": "Dashboard Flow", "status": "passed"},
      {"name": "Profile Flow", "status": "passed"}
    ]
  }
}
```

---

#### 5. `test.failed`

**Critical**: Triggers Watchdog and Healer agents

```json
{
  "event": "test.failed",
  "session_id": "sess_1234567890abcdef",
  "timestamp": "2026-03-08T10:03:00Z",
  "data": {
    "test_name": "Checkout Flow",
    "error": "Button 'Confirm Purchase' not found",
    "screenshot_url": "https://s3.../screenshot.png",
    "dom_snapshot": "<button id=\"confirmBtn\">Confirm</button>",
    "logs": ["[ERROR] Element not found: role=button[name='Confirm Purchase']"]
  }
}
```

---

#### 6. `healing.started`

```json
{
  "event": "healing.started",
  "session_id": "sess_1234567890abcdef",
  "timestamp": "2026-03-08T10:05:00Z",
  "data": {
    "failed_tests": ["Checkout Flow"],
    "healer_agent_version": "1.2.0"
  }
}
```

---

#### 7. `healing.completed`

```json
{
  "event": "healing.completed",
  "session_id": "sess_1234567890abcdef",
  "timestamp": "2026-03-08T10:06:30Z",
  "data": {
    "rca_report": "Root cause: Button ID changed in commit abc123...",
    "proposed_fix": "--- a/src/components/Checkout.tsx\n+++ b/src/components/Checkout.tsx\n...",
    "confidence_score": 0.92,
    "action": "create_pr"
  }
}
```

---

#### 8. `courier.pr_created`

```json
{
  "event": "courier.pr_created",
  "session_id": "sess_1234567890abcdef",
  "timestamp": "2026-03-08T10:15:00Z",
  "data": {
    "pr_url": "https://github.com/facebook/react/pull/12346",
    "pr_number": 12346,
    "title": "[SentinelQA] Fix: Checkout button ID mismatch"
  }
}
```

---

## Watchdog API (Phase 2)

### 1. Query Metrics

**Endpoint**: `GET /api/watchdog/metrics`

**Authorization**: All authenticated roles (`viewer`, `developer`, `admin`)

**Purpose**: Get aggregated metrics snapshot for a session

**Query Parameters**:
- `session_id` - Session ID
- `time_range` - Time range (e.g., `5m`, `1h`, `24h`)
- `metrics` - Comma-separated metric names

**Example**: `GET /api/watchdog/metrics?session_id=sess_123&time_range=5m&metrics=error_rate,cpu_usage`

**Response (200)**:
```json
{
  "session_id": "sess_1234567890abcdef",
  "time_range": "5m",
  "metrics": {
    "error_rate": {
      "current": 15.2,
      "baseline": 0.1,
      "anomaly": true,
      "severity": "critical"
    },
    "cpu_usage": {
      "current": 45.0,
      "baseline": 40.0,
      "anomaly": false
    }
  },
  "timestamp": "2026-03-08T10:00:00Z"
}
```

---

### 2. Detect Anomalies

**Endpoint**: `POST /api/watchdog/detect`

**Authorization**: Requires `developer` or `admin` role

**Purpose**: Run anomaly detection on metrics

**Request**:
```json
{
  "session_id": "sess_1234567890abcdef",
  "metrics": ["error_rate", "latency_p95", "memory_usage"],
  "time_range": "5m"
}
```

**Response (200)**:
```json
{
  "anomalies_detected": true,
  "anomalies": [
    {
      "metric": "error_rate",
      "current_value": 15.2,
      "baseline_value": 0.1,
      "threshold": 5.0,
      "severity": "critical",
      "detected_at": "2026-03-08T10:00:00Z"
    }
  ],
  "recommendation": "trigger_healer"
}
```

---

## Error Codes

### General Errors

| Code                    | HTTP | Description                |
| ----------------------- | ---- | -------------------------- |
| `AUTH_INVALID_TOKEN`    | 401  | Invalid or expired JWT     |
| `AUTH_MISSING_TOKEN`    | 401  | Authorization header missing |
| `FORBIDDEN`             | 403  | Insufficient permissions   |
| `NOT_FOUND`             | 404  | Resource not found         |
| `VALIDATION_ERROR`      | 400  | Invalid request body       |
| `RATE_LIMIT_EXCEEDED`   | 429  | Too many requests          |
| `INTERNAL_SERVER_ERROR` | 500  | Unexpected server error    |

### MCP Gateway Errors

| Code                        | HTTP | Description                          |
| --------------------------- | ---- | ------------------------------------ |
| `MCP_SERVER_UNAVAILABLE`    | 503  | MCP server not responding            |
| `MCP_GITHUB_RATE_LIMIT`     | 429  | GitHub API rate limit exceeded       |
| `MCP_PLAYWRIGHT_TIMEOUT`    | 504  | Playwright operation timed out       |
| `MCP_INVALID_TOOL`          | 400  | Tool name not recognized             |
| `MCP_TOOL_ERROR`            | 500  | Tool execution failed                |

### Session Errors

| Code                     | HTTP | Description                       |
| ------------------------ | ---- | --------------------------------- |
| `SESSION_NOT_FOUND`      | 404  | Session doesn't exist             |
| `SESSION_ALREADY_EXISTS` | 409  | Session with this ID already exists |
| `SESSION_CANCELLED`      | 410  | Session was cancelled             |
| `SESSION_EXPIRED`        | 410  | Session expired (TTL exceeded)    |

### Courier Errors

| Code                        | HTTP | Description                         |
| --------------------------- | ---- | ----------------------------------- |
| `GITHUB_AUTH_FAILED`        | 401  | GitHub token invalid                |
| `PR_CREATION_FAILED`        | 500  | Failed to create PR                 |
| `ISSUE_CREATION_FAILED`     | 500  | Failed to create issue              |
| `BRANCH_ALREADY_EXISTS`     | 409  | Branch with this name exists        |

---

## Rate Limits

| Endpoint Pattern        | Rate Limit           | Window |
| ----------------------- | -------------------- | ------ |
| `/api/mcp/*`            | 100 requests/min     | 1 min  |
| `/api/sessions` (POST)  | 10 requests/min      | 1 min  |
| `/api/sessions` (GET)   | 300 requests/min     | 1 min  |
| `/api/courier/*`        | 20 requests/min      | 1 min  |

---

## Versioning

The API is currently at version `v1`. In this document, all endpoints are shown without an explicit version segment in the path (e.g., `/api/sessions`), which should be interpreted as version `v1`.

**Current (v1)**: `https://api.sentinel.qa/api/sessions`  
**Future (v2)**: `https://api.sentinel.qa/api/v2/sessions`

Version `v1` does not include an explicit version prefix in the URL path. If and when `v2` is introduced, it will use the `/api/v2/...` prefix, and existing `v1` URLs will be maintained for backward compatibility.

---

## Health Check

**Endpoint**: `GET /api/health`

**Authorization**: Public (no authentication required)

**Response (200)**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "services": {
    "mcp_github": "healthy",
    "mcp_playwright": "healthy",
    "mcp_prometheus": "unavailable",
    "database": "healthy",
    "websocket": "healthy"
  }
}
```

---

## Next Steps

1. **Arpit**: Implement Go API server with these endpoints
2. **Aaskar**: Update LangGraph agents to call these APIs instead of spawning MCP servers directly
3. **Harsh/Himanshu**: Update dashboard to call Session API and subscribe to WebSocket events
4. **Team**: Review and iterate on request/response schemas

**Questions? Discuss in the team Slack channel or open a GitHub issue.**
