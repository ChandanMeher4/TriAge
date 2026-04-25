# 🟣 Aaskar's Workbook — AI Engineer

> **Role**: AI Orchestration — The Brain of SentinelQA  
> **Tech Stack**: Python, LangGraph, Claude 3.5/4 (Anthropic API), MCP Client  
> **You Own**: The Architect Agent, The Healer Agent, LangGraph State Machine, Prompt Engineering

---

## What You're Building (In Simple Terms)

You're building the **AI brain** that decides:

1. **What tests to write** (Architect agent reads the code, generates a test plan)
2. **What went wrong** when tests fail (Healer agent does root cause analysis)
3. **How to fix it** (Healer generates code patches)
4. **The orchestration flow** — which agent runs when, in what order, with what data

Think of it as a **multi-agent pipeline**: Trigger → Architect → Scripter → Watchdog → Healer → Courier

---

## What You Need to Learn First

### 1. LangGraph (Priority: 🔴 Critical)

LangGraph is the framework for building your multi-agent system. It's NOT like a simple LLM chain — it's a **state machine with nodes and edges**.

**Key concepts to understand:**

- **StateGraph**: A shared state that all agents read/write to
- **Nodes**: Each agent is a node (a function that takes state, calls LLM, returns updated state)
- **Edges**: Connections between nodes (can be conditional — e.g., "if tests pass, go to Courier; if fail, go to Watchdog")
- **Checkpointing**: Saves state so you can resume after failures

**Resources:**

- 📖 [LangGraph Official Docs](https://langchain-ai.github.io/langgraph/)
- 📖 [LangGraph Multi-Agent Tutorial](https://langchain-ai.github.io/langgraph/tutorials/multi_agent/multi-agent-collaboration/)
- 📖 [LangGraph Supervisor Pattern](https://langchain-ai.github.io/langgraph/tutorials/multi_agent/agent_supervisor/)
- 🎥 [LangGraph Crash Course (YouTube)](https://www.youtube.com/results?search_query=langgraph+multi+agent+tutorial+2025)
- 💻 [LangGraph Examples (GitHub)](https://github.com/langchain-ai/langgraph/tree/main/examples)

### 2. Claude API / Anthropic SDK (Priority: 🔴 Critical)

You'll use Claude as the LLM powering each agent's reasoning.

**Key concepts:**

- Tool calling (Claude can call tools/functions you define)
- System prompts (you'll craft a unique system prompt per agent)
- Structured output (getting Claude to return JSON)

**Resources:**

- 📖 [Anthropic Python SDK](https://docs.anthropic.com/en/docs/sdks/python)
- 📖 [Tool Use / Function Calling](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- 📖 [Claude Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)

### 3. MCP Client (Priority: 🟡 Medium — Phase 2)

Your LangGraph agents will call MCP servers to use tools (Playwright, GitHub, etc.). You need to understand how to make MCP client calls from Python.

**Resources:**

- 📖 [MCP Official Spec](https://modelcontextprotocol.io/)
- 📖 [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- 📖 [LangChain MCP Integration](https://python.langchain.com/docs/integrations/tools/mcp/)

---

## Phase-by-Phase Tasks

### Phase 1: Foundation

**Goal**: Get a single agent working end-to-end with LangGraph + Claude.

#### Step 1: Environment Setup

```bash
# Create Python project
mkdir -p ai-engine && cd ai-engine
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install langgraph langchain-anthropic langchain-core python-dotenv

# Create .env
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

#### Step 2: Build Your First LangGraph Agent (Hello World)

Build the simplest possible graph: a single node that takes user input, sends it to Claude, returns the response.

```python
# This is just to understand the pattern — not production code
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic

# 1. Define state
# 2. Create LLM
# 3. Create node function
# 4. Build graph with add_node / add_edge
# 5. Compile and invoke
```

#### Step 3: Build the Architect Agent

The Architect receives a repo URL and file list, then generates a test plan.

**Input**: Repository URL + list of changed files (from GitHub MCP)
**Output**: A Markdown test plan with scenarios

```
System Prompt for Architect:
"You are a QA Architect. Given a codebase and its changes,
generate a comprehensive E2E test plan in Markdown format.
Focus on user-facing workflows. Output test scenarios with:
- Test name
- Steps to reproduce
- Expected outcome
- Priority (P0/P1/P2)"
```

#### Step 4: Build the State Schema

```python
from typing import TypedDict, Optional

class SentinelState(TypedDict):
    trigger_type: str        # "deployment" | "scheduled" | "manual"
    repo_url: str
    branch: str
    commit_sha: str
    changed_files: list[str]

    # Architect output
    test_plan: str           # Markdown test plan
    test_plan_approved: bool

    # Scripter output (from Harsh/Himanshu's Playwright)
    test_results: list[dict]  # [{name, status, error}]

    # Watchdog output (from Arpit's observability)
    metrics_snapshot: dict
    anomalies: list[dict]

    # Healer output
    rca_report: str
    proposed_fix: str        # Code diff
    confidence_score: float
    fix_language: str        # "go" | "python" | "typescript" etc.

    # Courier output
    pr_url: Optional[str]
    issue_url: Optional[str]
    slack_sent: bool
```

#### Step 5: Build a 2-Node Graph

Connect Architect → a mock Scripter (just returns fake test results for now). This validates your graph flow works before real integration.

**Deliverable**: A working LangGraph that takes a repo description → generates test plan → returns mock test results.

---

### Phase 2: Integration

**Goal**: Connect your agents to real MCP servers and build the full pipeline.

#### Step 6: Connect Architect to GitHub MCP

- Use the MCP Python SDK to call the GitHub MCP server
- Architect should be able to: read repo files, read recent commits, read PR diffs
- Feed the real code into Claude for test plan generation

#### Step 7: Build the Full Graph with Conditional Routing

```
Architect → Scripter → Decision Node
                         ├── All Pass → Courier (success)
                         └── Failures → Watchdog → Healer → Decision
                                                     ├── High confidence → Courier (PR)
                                                     └── Low confidence → Courier (Issue)
```

#### Step 8: Connect to Harsh/Himanshu's Playwright

- Define the interface: your agent sends a test plan (Markdown), their Playwright runner returns results (JSON)
- This is the key integration point — agree on the JSON schema together

**Interface Contract (agree with Harsh & Himanshu):**

```json
// You send TO Playwright (via MCP):
{
  "test_plan": "## Test: Login Flow\n1. Navigate to /login\n2. Enter email...",
  "target_url": "https://staging.example.com"
}

// You receive FROM Playwright:
{
  "results": [
    {"name": "Login Flow", "status": "passed", "duration_ms": 2340},
    {"name": "Checkout Flow", "status": "failed", "error": "Button not found", "screenshot": "base64..."}
  ],
  "total": 5,
  "passed": 4,
  "failed": 1
}
```

---

### Phase 3: Self-Healing

**Goal**: Build the Healer agent that performs RCA and generates code fixes.

#### Step 9: Build the Healer Agent

This is the most complex agent. It receives:

- Test failure details
- Error traces/logs (from Arpit's Watchdog)
- Git diff of the recent commit

And produces:

- A root cause analysis report
- A proposed code fix (as a diff)
- A confidence score (0-1)

```
System Prompt for Healer:
"You are a senior debugger. Given:
1. A test failure with error message and DOM snapshot
2. Recent code changes (git diff)
3. Metrics/log anomalies from the observability stack

Perform root cause analysis. Identify the exact cause.
Generate a minimal code fix as a unified diff.
Rate your confidence 0-1. Be conservative — only rate > 0.8
if you are very sure the fix is correct."
```

#### Step 10: Implement Confidence Scoring & Human-in-the-Loop

- If confidence > 0.8 → Courier creates a GitHub PR with the fix
- If confidence ≤ 0.8 → Courier creates a GitHub Issue with the RCA report
- **Never auto-merge** — humans always review

---

### Phase 4: Polish

#### Step 11: LangSmith Tracing

- Connect LangSmith for full observability into your agent pipeline
- Log every LLM call, token usage, latency

#### Step 12: Prompt Optimization

- Test with different codebases
- Improve system prompts based on failure cases
- Add few-shot examples to improve test plan quality

---

## What You Deliver

| Phase   | Deliverable                                                            |
| ------- | ---------------------------------------------------------------------- |
| Phase 1 | Working LangGraph with Architect agent generating test plans from code |
| Phase 2 | Full multi-agent pipeline connected to Playwright MCP + GitHub MCP     |
| Phase 3 | Healer agent performing RCA and generating code fix proposals          |
| Phase 4 | Optimized prompts, LangSmith tracing, reliability improvements         |

---

## Key Decisions for You

1. **LangGraph version**: Use LangGraph 0.2+ (latest stable)
2. **Claude model**: Start with `claude-3-5-sonnet` for cost efficiency, switch to `claude-4` for the Healer agent (needs best reasoning)
3. **State persistence**: Use LangGraph's built-in checkpointing with SQLite (Phase 1) → PostgreSQL (Phase 3)
4. **Your agents talk to MCP via Arpit's MCP Gateway** — don't connect directly to MCP servers. This lets Arpit handle auth and routing centrally.
