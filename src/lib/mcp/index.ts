// ============================================================================
// SentinelQA — MCP Module Barrel Export
// ============================================================================

export { PlaywrightMCPClient } from "./playwright-client";
export { GitHubMCPClient } from "./github-client";
export { AgentOrchestrator } from "./orchestrator";
export { RepoWatcher, repoWatcher } from "./repo-watcher";
export type { OrchestratorConfig } from "./orchestrator";
export type { GitHubToolResponse } from "./github-client";
export type { WatchedRepo, RepoCheck, CommitInfo } from "./repo-watcher";
export { TestRunner, parseTestPlan } from "./test-runner";
export { SessionManager, sessionManager } from "./session-manager";
export type {
    TestPlanInput,
    TestResult,
    TestRunOutput,
    TestStep,
    TestSession,
    AgentStatus,
    AgentState,
    MCPAction,
    MCPToolCall,
    MCPToolResponse,
    MCPServerConfig,
    SessionStatus,
} from "./types";
export { DEFAULT_MCP_CONFIG } from "./types";
