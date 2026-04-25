# Phase 1 Integration Complete ✓

All Phase 1 infrastructure is wired and integrated with Aaskar's AI Engine.

## What's Working

### 1. **Courier Agent** (GitHub PR/Issue automation)
```bash
POST /api/courier/pr
POST /api/courier/issue
```
- Creates PRs for high-confidence fixes (confidence >= 0.8)
- Creates Issues for lower-confidence or investigation-needed failures
- Wired into orchestrator — runs automatically after test failures

### 2. **Session Persistence** (MongoDB)
- Sessions survive server restarts
- TTL index: 7-day retention
- Per-agent status tracking
- Checkpoint support for LangGraph state

### 3. **WebSocket Hub** (Real-time updates)
- 11 event types: pipeline, agent, test, healing, courier
- Room-based sessions
- React hook: `useSessionWebSocket(sessionId)`
- Orchestrator emits events at every stage

### 4. **Docker Compose** (Full stack)
```bash
docker compose up --build
```
Services:
- `sentinelqa-app` (Next.js) → http://localhost:3000
- `mongodb` (Mongo 7) → mongodb://localhost:27017
- `ai-engine` (FastAPI + LangGraph) → http://localhost:5000

### 5. **Mock Watchdog** (Infrastructure metrics)
```bash
GET  /api/watchdog/metrics
POST /api/watchdog/detect
```
- 5 metrics: error_rate, latency_p95, cpu_usage, memory_usage, request_count
- Anomaly injection for demo
- Severity classification: low/medium/high/critical

### 6. **AI Engine Integration**
**TypeScript Client** ([ai-engine-client.ts](src/lib/mcp/ai-engine-client.ts)):
```typescript
import { aiEngine } from "@/lib/mcp/ai-engine-client";

// Auto-switches between real service (AI_ENGINE_URL set) and mock fallback
const testPlan = await aiEngine.generateTestPlan(code, files, url);
```

**Python FastAPI Server** ([ai-engine/server.py](ai-engine/server.py)):
```python
POST /generate-test-plan
POST /analyze-failure  # TODO: Healer agent
```

**LangGraph Pipeline** (Aaskar's work):
- Architect agent: Test plan generation (OpenAI/Anthropic/Mock)
- State schema: Full pipeline state management
- Phase 1 graph: Architect → MockScripter

## Testing

### Local Dev (no Docker)
```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Python AI Engine (mock mode)
cd ai-engine
python3 -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
python server.py

# Terminal 3: Test endpoints
curl http://localhost:3000/api/watchdog/metrics
curl http://localhost:5000/health
```

### Docker Compose (full stack)
```bash
# Build and start all services
docker compose up --build

# Check logs
docker compose logs -f ai-engine
docker compose logs -f sentinelqa-app

# Check services
curl http://localhost:3000/api/agent/status
curl http://localhost:5000/health
curl http://localhost:5000/docs  # FastAPI interactive docs
```

### Verify AI Engine Integration
```bash
# Test with mock LLM (no API key needed)
curl -X POST http://localhost:5000/generate-test-plan \
  -H "Content-Type: application/json" \
  -d '{
    "code_context": "Next.js app with auth and dashboard",
    "changed_files": ["src/app/auth/page.tsx"],
    "target_url": "http://localhost:3000",
    "repo_url": "Arpit529Srivastava/Hack-karo",
    "branch": "main"
  }'
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

**Required:**
- `MONGODB_URI` — MongoDB connection string
- `NEXTAUTH_SECRET` — NextAuth session secret
- `GITHUB_PERSONAL_ACCESS_TOKEN` — For GitHub MCP

**Optional (AI Engine):**
- `AI_ENGINE_URL=http://localhost:5000` — Connect to Aaskar's service (or unset for mock)
- `LLM_PROVIDER=openai` — Choose openai or anthropic
- `OPENAI_API_KEY` — For gpt-4o-mini (recommended)
- `ANTHROPIC_API_KEY` — For Claude Sonnet (alternative)

**Without LLM keys:** Everything still works in mock mode (perfect for local demo).

## Architecture Flow

```
GitHub Webhook → Orchestrator
  ├─→ GitHub MCP: Read code changes
  ├─→ AI Engine: Generate test plan (Architect agent)
  ├─→ Playwright MCP: Execute tests
  ├─→ Watchdog: Check metrics (mock for demo)
  ├─→ AI Engine: Analyze failures (Healer agent — TODO)
  └─→ Courier: Create PR/Issue on GitHub

Real-time events → WebSocket → Dashboard
Sessions → MongoDB (survives restarts)
```

## Next Steps

- [ ] Aaskar: Healer agent implementation
- [ ] Harsh/Himanshu: Wire dashboard to WebSocket events
- [ ] Integration test: Full pipeline with real GitHub repo
- [ ] Demo walkthrough with pre-recorded flow

## Files Created/Modified

**New Files (Phase 1):**
- `src/lib/mcp/courier.ts` — GitHub automation
- `src/lib/mcp/ai-engine-client.ts` — AI service wrapper
- `src/lib/mcp/watchdog.ts` — Mock metrics
- `src/lib/websocket/events.ts` — Event type definitions
- `src/lib/websocket/server.ts` — Socket.io singleton
- `src/hooks/use-websocket.ts` — React WebSocket hook
- `src/app/api/courier/pr/route.ts` — PR creation endpoint
- `src/app/api/courier/issue/route.ts` — Issue creation endpoint
- `src/app/api/watchdog/metrics/route.ts` — Metrics snapshot
- `src/app/api/watchdog/detect/route.ts` — Anomaly detection
- `Dockerfile` — Multi-stage Next.js build
- `docker-compose.yml` — 3-service stack
- `.env.example` — All environment variables
- `ai-engine/server.py` — FastAPI wrapper for LangGraph

**Modified Files:**
- `src/lib/mcp/orchestrator.ts` — Added Courier, WebSocket, AI Engine calls
- `src/lib/mcp/session-manager.ts` — MongoDB persistence
- `next.config.mjs` — Added `output: "standalone"`
- `package.json` — Added socket.io dependencies
- `ai-engine/requirements.txt` — Added FastAPI/uvicorn
- `ai-engine/README.md` — Updated with server docs

**Aaskar's Files (merged from dev-rana):**
- `ai-engine/sentinel/` — LangGraph agents and state
- `ai-engine/run_*.py` — Test runners
- `ai-engine/.env.example` — LLM config
