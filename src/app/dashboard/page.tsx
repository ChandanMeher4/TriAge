"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  GitBranch,
  Bot,
  FlaskConical,
  TerminalSquare,
  FileSearch,
  GitPullRequest,
  Settings2,
  Play,
  RefreshCcw,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  LogOut,
  Activity,
  Zap,
  Eye,
  Wrench,
  Send,
  Brain,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  CheckCheck,
  Cpu,
  Database,
  GitCommit,
  Slack,
  Github,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Menu,
  X,
  Plug,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = "idle" | "running" | "success" | "error";
type Tab =
  | "overview"
  | "pipeline"
  | "agents"
  | "tests"
  | "terminal"
  | "rca"
  | "prs"
  | "settings";
type PipelineStage =
  | "idle"
  | "architect"
  | "scripter"
  | "watchdog"
  | "healer"
  | "courier_pr"
  | "courier_issue"
  | "complete";

interface TerminalLine {
  text: string;
  type: "info" | "success" | "error" | "warn" | "agent" | "system";
  ts: string;
}

interface TestResult {
  id: number;
  name: string;
  flow: string;
  status: "passed" | "failed" | "running" | "pending";
  duration: string;
  error?: string;
}

// ─── Agent Configs ────────────────────────────────────────────────────────────

const AGENTS = [
  {
    id: "architect",
    name: "THE ARCHITECT",
    role: "Planner",
    owner: "Chandan",
    icon: <Brain className="w-5 h-5" />,
    color: "#A855F7",
    ring: "ring-purple-500/40",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    description:
      "Reads repo via GitHub MCP, generates a comprehensive test plan using Claude 3.5",
    capabilities: [
      "GitHub MCP integration",
      "LangGraph orchestration",
      "Test plan generation",
      "Code analysis",
    ],
  },
  {
    id: "scripter",
    name: "THE SCRIPTER",
    role: "Playwright MCP",
    owner: "Ayush & Amrit",
    icon: <Zap className="w-5 h-5" />,
    color: "#22D3EE",
    ring: "ring-cyan-500/40",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    description:
      "Converts test plan → Playwright TypeScript tests, executes in headless Chromium",
    capabilities: [
      "Playwright MCP execution",
      "Headless browser testing",
      "DOM accessibility snapshots",
      "Test streaming",
    ],
  },
  {
    id: "watchdog",
    name: "THE WATCHDOG",
    role: "SRE Monitor",
    owner: "Varun",
    icon: <Eye className="w-5 h-5" />,
    color: "#F59E0B",
    ring: "ring-amber-500/40",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    description:
      "Queries Prometheus/Grafana/Datadog logs for infrastructure anomalies on test failure",
    capabilities: [
      "Prometheus metrics",
      "Grafana dashboards",
      "Datadog log analysis",
      "Anomaly detection",
    ],
  },
  {
    id: "healer",
    name: "THE HEALER",
    role: "Debugger",
    owner: "Chandan and Ayush",
    icon: <Wrench className="w-5 h-5" />,
    color: "#10B981",
    ring: "ring-emerald-500/40",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    description:
      "Performs Root Cause Analysis via vector DB search, generates targeted code fixes",
    capabilities: [
      "RCA via Claude 3.5",
      "Vector DB semantic search",
      "Code patch generation",
      "Confidence scoring",
    ],
  },
  {
    id: "courier",
    name: "THE COURIER",
    role: "Notifications",
    owner: "Amrit",
    icon: <Send className="w-5 h-5" />,
    color: "#3B82F6",
    ring: "ring-blue-500/40",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    description:
      "Creates GitHub PRs or Issues, posts Slack notifications with full RCA context",
    capabilities: [
      "GitHub PR creation",
      "GitHub Issue filing",
      "Slack API integration",
      "Team notifications",
    ],
  },
];

const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    id: "pipeline",
    label: "Pipeline",
    icon: <GitBranch className="w-4 h-4" />,
  },
  { id: "agents", label: "Agents", icon: <Bot className="w-4 h-4" /> },
  {
    id: "tests",
    label: "Test Results",
    icon: <FlaskConical className="w-4 h-4" />,
  },
  {
    id: "terminal",
    label: "Live Terminal",
    icon: <TerminalSquare className="w-4 h-4" />,
  },
  { id: "rca", label: "RCA Reports", icon: <FileSearch className="w-4 h-4" /> },
  {
    id: "prs",
    label: "PR Tracker",
    icon: <GitPullRequest className="w-4 h-4" />,
  },
] as const;

function Sidebar({
  activeTab,
  setTab,
  session,
  sidebarOpen,
  setSidebarOpen,
}: {
  activeTab: Tab;
  setTab: (t: Tab) => void;
  session: ReturnType<typeof useSession>["data"];
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}) {
  const user = session?.user as
    | { name?: string; email?: string; image?: string }
    | undefined;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 z-40 flex flex-col
          glass-strong border-r border-border/50
          transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border/40 shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/icon.png"
              alt="TriAge"
              width={28}
              height={28}
              className="rounded-md group-hover:opacity-80 transition-opacity"
            />
            <span className="text-base font-extrabold tracking-tight">
              Tri<span className="text-gradient-violet">Age</span>
            </span>
          </Link>
          <button
            className="md:hidden text-muted-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live indicator */}
        <div className="mx-4 mt-4 mb-2 flex items-center gap-2 glass rounded-lg px-3 py-2 neon-border">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
          </span>
          <span className="text-xs text-secondary font-medium">
            Agents Online · 5/5
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 pt-2 pb-1">
            Monitor
          </p>
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id as Tab);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 group text-left
                  ${
                    active
                      ? "bg-primary/15 text-primary border border-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }
                `}
              >
                <span
                  className={
                    active
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground transition-colors"
                  }
                >
                  {item.icon}
                </span>
                {item.label}
                {active && (
                  <ChevronRight className="w-3 h-3 ml-auto text-primary/60" />
                )}
              </button>
            );
          })}

          <div className="pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 pb-1">
              System
            </p>
            <Link
              href="/mcp-test"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
            >
              <Plug className="w-4 h-4" />
              MCP Health Check
            </Link>
            <Link
              href="/notion-test"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 transition-all"
            >
              <FileText className="w-4 h-4" />
              Notion Test
            </Link>
            <button 
              onClick={() => { setTab("settings"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "settings" ? "text-foreground bg-muted/40" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Settings
            </button>
          </div>
        </nav>

        {/* User profile */}
        <div className="border-t border-border/40 p-3 shrink-0">
          {session ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/30 transition-colors group">
              {user?.image ? (
                <img
                  src={user.image}
                  referrerPolicy="no-referrer"
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {user?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.name ?? "User"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Shield className="w-4 h-4" />
              Sign in
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="glass rounded-xl border border-border/50 p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <span style={{ color }} className="opacity-80">
          {icon}
        </span>
      </div>
      <p className="text-2xl font-black text-foreground mb-1">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

// ─── Agent Status Badge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentStatus }) {
  const map = {
    idle: {
      label: "Idle",
      cls: "text-muted-foreground bg-muted/40 border-border/40",
    },
    running: {
      label: "Running",
      cls: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30 animate-pulse",
    },
    success: {
      label: "Done",
      cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    error: {
      label: "Failed",
      cls: "text-red-400 bg-red-500/10 border-red-500/30",
    },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "running"
            ? "bg-cyan-400 animate-ping"
            : status === "success"
              ? "bg-emerald-400"
              : status === "error"
                ? "bg-red-400"
                : "bg-muted-foreground"
        }`}
      />
      {label}
    </span>
  );
}

// ─── Agent Card (mini) ────────────────────────────────────────────────────────

function AgentMiniCard({
  agent,
  status,
  task,
}: {
  agent: (typeof AGENTS)[0];
  status: AgentStatus;
  task: string;
}) {
  return (
    <motion.div
      animate={
        status === "running"
          ? {
              boxShadow: [
                `0 0 0px ${agent.color}00`,
                `0 0 20px ${agent.color}30`,
                `0 0 0px ${agent.color}00`,
              ],
            }
          : {}
      }
      transition={{ duration: 2, repeat: Infinity }}
      className={`glass rounded-xl p-4 border ${status === "running" ? agent.border : "border-border/40"} transition-all`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-9 h-9 rounded-xl ${agent.bg} border ${agent.border} flex items-center justify-center ${agent.text}`}
        >
          {agent.icon}
        </div>
        <StatusBadge status={status} />
      </div>
      <p className={`text-xs font-bold tracking-wide ${agent.text} mb-0.5`}>
        {agent.name}
      </p>
      <p className="text-[10px] text-muted-foreground mb-2">
        {agent.role} · {agent.owner}
      </p>
      <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">
        {task || "Waiting for instructions…"}
      </p>
    </motion.div>
  );
}

// ─── Pipeline Flow Visualization ──────────────────────────────────────────────

function PipelineFlowViz({
  stage,
  agentStatuses,
}: {
  stage: PipelineStage;
  agentStatuses: Record<string, AgentStatus>;
}) {
  const nodeClass = (id: string, activeStage: string) => {
    const agent = AGENTS.find((a) => a.id === id);
    if (!agent) return "";
    const s = agentStatuses[id] ?? "idle";
    const isActive = activeStage === id || stage === activeStage;
    return `${agent.bg} border ${s === "running" ? agent.border : s === "success" ? "border-emerald-500/40" : s === "error" ? "border-red-500/40" : "border-border/40"} ${agent.text}`;
  };

  const FlowNode = ({
    id,
    label,
    role,
    sublabel,
  }: {
    id: string;
    label: string;
    role: string;
    sublabel?: string;
  }) => {
    const agent = AGENTS.find((a) => a.id === id);
    const s = agentStatuses[id] ?? "idle";
    return (
      <motion.div
        animate={s === "running" ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
        className={`relative rounded-xl p-3 border text-center min-w-[130px] ${nodeClass(id, id)}`}
      >
        <div
          className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${agent?.bg}`}
        >
          {agent?.icon}
        </div>
        <p className="text-[11px] font-bold tracking-wide">{label}</p>
        <p className="text-[9px] opacity-60 mt-0.5">{role}</p>
        {sublabel && <p className="text-[9px] opacity-50 mt-0.5">{sublabel}</p>}
        <div className="mt-1.5">
          <StatusBadge status={s} />
        </div>
        {s === "running" && (
          <div
            className="absolute -inset-px rounded-xl border animate-pulse"
            style={{ borderColor: `${agent?.color}40` }}
          />
        )}
      </motion.div>
    );
  };

  const Arrow = ({ vertical }: { vertical?: boolean }) => (
    <div
      className={`flex items-center justify-center ${vertical ? "flex-col" : ""}`}
    >
      {vertical ? (
        <div className="w-px h-6 bg-gradient-to-b from-border/50 to-border/50 relative">
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border/60" />
        </div>
      ) : (
        <div className="h-px w-8 bg-gradient-to-r from-border/50 to-border/50 relative flex items-center justify-end">
          <div className="absolute -right-1 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-border/60" />
        </div>
      )}
    </div>
  );

  const Decision = ({ label }: { label: string }) => (
    <div className="relative w-24 h-12 flex items-center justify-center">
      <div className="absolute inset-0 rotate-45 rounded-md border border-border/50 bg-muted/20" />
      <p className="relative z-10 text-[10px] font-bold text-foreground/60 text-center leading-tight px-1">
        {label}
      </p>
    </div>
  );

  return (
    <div className="glass rounded-2xl neon-border p-6 overflow-x-auto">
      <h3 className="text-sm font-bold text-foreground mb-6 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        Live Pipeline — Multi-Agent Data Flow
      </h3>

      {/* Row 1: Trigger → Architect → Scripter → Decision */}
      <div className="flex items-center gap-2 mb-4">
        {/* Trigger */}
        <div
          className={`rounded-xl p-3 border text-center min-w-[100px] ${stage !== "idle" ? "border-primary/40 bg-primary/10 text-primary" : "border-border/40 bg-muted/20 text-muted-foreground"}`}
        >
          <GitCommit className="w-6 h-6 mx-auto mb-1.5" />
          <p className="text-[11px] font-bold">CODE PUSH</p>
          <p className="text-[9px] opacity-60">Trigger</p>
        </div>
        <Arrow />
        <FlowNode
          id="architect"
          label="THE ARCHITECT"
          role="Planner"
          sublabel="Aaskar"
        />
        <Arrow />
        <FlowNode
          id="scripter"
          label="THE SCRIPTER"
          role="Playwright MCP"
          sublabel="Harsh & Himanshu"
        />
        <Arrow />
        <Decision label="Tests Pass?" />

        {/* YES branch */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-emerald-400 font-bold">YES</span>
          <Arrow />
          <div
            className={`rounded-xl p-3 border text-center min-w-[110px] ${agentStatuses.courier === "success" && stage === "complete" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border/40 bg-muted/20 text-muted-foreground"}`}
          >
            <Send className="w-5 h-5 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold">COURIER</p>
            <p className="text-[9px] opacity-60">All Clear → Slack</p>
          </div>
        </div>
      </div>

      {/* NO branch — flows down from Decision */}
      <div className="ml-[460px] flex flex-col items-start gap-0">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[10px] text-red-400 font-bold ml-2">NO</span>
        </div>
        <div className="flex items-start gap-2">
          <Arrow vertical />
          <div className="flex flex-col gap-2 -mt-3">
            <FlowNode
              id="watchdog"
              label="THE WATCHDOG"
              role="SRE Monitor"
              sublabel="Arpit"
            />
            <div className="flex justify-center">
              <Arrow vertical />
            </div>
            <FlowNode
              id="healer"
              label="THE HEALER"
              role="Debugger"
              sublabel="Aaskar"
            />
            <div className="flex justify-center">
              <Arrow vertical />
            </div>
            <Decision label="Confidence >80%?" />
            <div className="flex gap-6 mt-1">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-emerald-400 font-bold">
                  YES
                </span>
                <Arrow vertical />
                <div
                  className={`rounded-xl p-3 border text-center min-w-[110px] ${stage === "courier_pr" || stage === "complete" ? "border-blue-500/40 bg-blue-500/10 text-blue-400" : "border-border/40 bg-muted/20 text-muted-foreground"}`}
                >
                  <Github className="w-5 h-5 mx-auto mb-1.5" />
                  <p className="text-[11px] font-bold">COURIER</p>
                  <p className="text-[9px] opacity-60">Create GitHub PR</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-red-400 font-bold">NO</span>
                <Arrow vertical />
                <div className="rounded-xl p-3 border border-border/40 bg-muted/20 text-muted-foreground text-center min-w-[110px]">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1.5" />
                  <p className="text-[11px] font-bold">COURIER</p>
                  <p className="text-[9px] opacity-60">Create GitHub Issue</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Live Terminal ────────────────────────────────────────────────────────────

function LiveTerminalPanel({ lines }: { lines: TerminalLine[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const colorMap = {
    system: "text-primary",
    info: "text-foreground/70",
    success: "text-emerald-400",
    error: "text-red-400",
    warn: "text-amber-400",
    agent: "text-cyan-400",
  };

  return (
    <div className="glass rounded-xl neon-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-card/20">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-secondary/60" />
        </div>
        <span className="text-xs text-muted-foreground font-mono ml-2">
          triage — pipeline output
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span className="text-[10px] text-secondary">Live</span>
        </div>
      </div>
      <div className="p-4 font-mono text-xs leading-relaxed bg-black/30 min-h-[320px] max-h-[400px] overflow-y-auto">
        {lines.length === 0 ? (
          <p className="text-muted-foreground/40">
            Waiting for pipeline trigger…
          </p>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="flex gap-3 mb-0.5">
              <span className="text-muted-foreground/40 shrink-0">
                {line.ts}
              </span>
              <span className={colorMap[line.type]}>{line.text}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Activity Feed (live from terminal lines) ────────────────────────────────

function getActivityIcon(line: TerminalLine) {
  const t = line.text.toLowerCase();
  if (t.includes("courier") || t.includes("pr")) return { icon: <Send className="w-3 h-3" />, color: "text-blue-400" };
  if (t.includes("healer") || t.includes("rca")) return { icon: <Wrench className="w-3 h-3" />, color: "text-emerald-400" };
  if (t.includes("watchdog") || t.includes("observ")) return { icon: <Eye className="w-3 h-3" />, color: "text-amber-400" };
  if (t.includes("fail") || t.includes("error")) return { icon: <XCircle className="w-3 h-3" />, color: "text-red-400" };
  if (t.includes("pass") || t.includes("success") || t.includes("done")) return { icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-400" };
  if (t.includes("architect") || t.includes("plan")) return { icon: <Brain className="w-3 h-3" />, color: "text-purple-400" };
  if (t.includes("pipeline") || t.includes("started")) return { icon: <GitCommit className="w-3 h-3" />, color: "text-primary" };
  if (t.includes("test") || t.includes("playwright")) return { icon: <FlaskConical className="w-3 h-3" />, color: "text-cyan-400" };
  return { icon: <Activity className="w-3 h-3" />, color: "text-muted-foreground" };
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  agentStatuses,
  agentTasks,
  stage,
  terminalLines,
  tests,
}: {
  agentStatuses: Record<string, AgentStatus>;
  agentTasks: Record<string, string>;
  stage: PipelineStage;
  terminalLines: TerminalLine[];
  tests: TestResult[];
}) {
  const [config, setConfig] = useState<{ owner: string, repo: string, targetUrl: string, aiEngine: string } | null>(null);

  useEffect(() => {
    fetch("/api/agent/config")
      .then(r => r.json())
      .then(setConfig)
      .catch(console.error);
  }, []);

  const passed = tests.filter((t) => t.status === "passed").length;
  const failed = tests.filter((t) => t.status !== "passed").length;
  const total = tests.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const activeAgents = Object.values(agentStatuses).filter(
    (s) => s === "running",
  ).length;

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      {config && (
        <div className="glass rounded-xl p-4 border border-border/40 flex flex-wrap gap-6 items-center text-sm">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Target Repo:</span>
            <span className="font-mono font-bold text-foreground">{config.owner}/{config.repo}</span>
          </div>
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-emerald-400" />
            <span className="text-muted-foreground">Target URL:</span>
            <span className="font-mono font-bold text-emerald-400">{config.targetUrl}</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            <span className="text-muted-foreground">AI Engine:</span>
            <span className="font-mono font-bold text-purple-400">{config.aiEngine}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tests"
          value={String(total)}
          sub={`${passed} passed · ${failed} failed`}
          icon={<FlaskConical className="w-4 h-4" />}
          color="#22D3EE"
        />
        <StatCard
          label="Pass Rate"
          value={`${passRate}%`}
          sub={stage === "idle" ? "Awaiting next run" : "Current run"}
          icon={<TrendingUp className="w-4 h-4" />}
          color="#10B981"
        />
        <StatCard
          label="Agents Online"
          value={`${5 - activeAgents > 0 ? 5 : activeAgents}/5`}
          sub="All agents healthy"
          icon={<Bot className="w-4 h-4" />}
          color="#A855F7"
        />
        <StatCard
          label="Last Run"
          value={stage === "idle" ? "Ready" : stage === "complete" ? "Done" : "Running"}
          sub={terminalLines.length > 0 ? `${terminalLines.length} events logged` : "No runs yet"}
          icon={<Zap className="w-4 h-4" />}
          color="#F59E0B"
        />
      </div>

      {/* Agent grid */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" /> Agent Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {AGENTS.map((agent) => (
            <AgentMiniCard
              key={agent.id}
              agent={agent}
              status={agentStatuses[agent.id] ?? "idle"}
              task={agentTasks[agent.id] ?? ""}
            />
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Terminal preview */}
        <LiveTerminalPanel lines={terminalLines.slice(-12)} />

        {/* Activity feed — live from WebSocket */}
        <div className="glass rounded-xl border border-border/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Recent Activity
            </span>
            {terminalLines.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 ml-auto">
                LIVE
              </span>
            )}
          </div>
          <div className="divide-y divide-border/30">
            {terminalLines.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground/50 text-xs">
                Run the pipeline to see live activity
              </div>
            ) : (
              terminalLines.slice(-7).reverse().map((line, i) => {
                const { icon, color } = getActivityIcon(line);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className={`mt-0.5 ${color} shrink-0`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground/80 leading-relaxed truncate">
                        {line.text}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 shrink-0 mt-0.5">
                      {line.ts}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Agents Tab ───────────────────────────────────────────────────────────────

function AgentsTab({
  agentStatuses,
  agentTasks,
}: {
  agentStatuses: Record<string, AgentStatus>;
  agentTasks: Record<string, string>;
}) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
      {AGENTS.map((agent) => {
        const status = agentStatuses[agent.id] ?? "idle";
        const task = agentTasks[agent.id] ?? "Waiting for instructions…";
        return (
          <motion.div
            key={agent.id}
            animate={
              status === "running"
                ? {
                    boxShadow: [
                      `0 0 0px ${agent.color}00`,
                      `0 0 30px ${agent.color}25`,
                      `0 0 0px ${agent.color}00`,
                    ],
                  }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
            className={`glass rounded-2xl border p-5 transition-all ${status === "running" ? agent.border : "border-border/40"}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl ${agent.bg} border ${agent.border} flex items-center justify-center ${agent.text}`}
              >
                <span className="scale-125">{agent.icon}</span>
              </div>
              <StatusBadge status={status} />
            </div>

            <h3
              className={`text-sm font-black tracking-wide ${agent.text} mb-0.5`}
            >
              {agent.name}
            </h3>
            <p className="text-xs text-muted-foreground mb-1">{agent.role}</p>
            <div
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${agent.bg} ${agent.text} mb-3`}
            >
              Owner: {agent.owner}
            </div>

            <p className="text-xs text-foreground/60 leading-relaxed mb-4">
              {agent.description}
            </p>

            {/* Current task */}
            <div
              className={`rounded-lg p-3 ${agent.bg} border ${agent.border} mb-3`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-widest ${agent.text} mb-1`}
              >
                Current Task
              </p>
              <p className="text-xs text-foreground/80">{task}</p>
            </div>

            {/* Capabilities */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
                Capabilities
              </p>
              <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className={`text-[10px] px-2 py-0.5 rounded-md bg-muted/40 border border-border/40 text-muted-foreground`}
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Tests Tab ────────────────────────────────────────────────────────────────

function TestsTab({ tests }: { tests: TestResult[] }) {
  const passed = tests.filter((t) => t.status === "passed").length;
  const failed = tests.filter((t) => t.status === "failed").length;
  const pending = tests.filter((t) => t.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: tests.length, color: "text-foreground" },
          { label: "Passed", value: passed, color: "text-emerald-400" },
          { label: "Failed", value: failed, color: "text-red-400" },
          { label: "Pending", value: pending, color: "text-muted-foreground" },
        ].map((item) => (
          <div
            key={item.label}
            className="glass rounded-xl p-4 border border-border/40 text-center"
          >
            <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Test table */}
      <div className="glass rounded-xl border border-border/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 grid grid-cols-12 gap-4">
          <p className="col-span-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Test Name
          </p>
          <p className="col-span-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Flow
          </p>
          <p className="col-span-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Status
          </p>
          <p className="col-span-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Time
          </p>
          <p className="col-span-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Error
          </p>
        </div>
        <div className="divide-y divide-border/20">
          {tests.map((test) => (
            <div
              key={test.id}
              className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-muted/10 transition-colors"
            >
              <div className="col-span-5 flex items-center gap-2">
                {test.status === "passed" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                {test.status === "failed" && (
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
                {test.status === "running" && (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                )}
                {test.status === "pending" && (
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-xs text-foreground/80 font-mono truncate">
                  {test.name}
                </span>
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                {test.flow}
              </p>
              <div className="col-span-2">
                <StatusBadge
                  status={
                    test.status === "pending"
                      ? "idle"
                      : test.status === "running"
                        ? "running"
                        : test.status === "passed"
                          ? "success"
                          : "error"
                  }
                />
              </div>
              <p className="col-span-1 text-xs font-mono text-muted-foreground">
                {test.duration}
              </p>
              <p className="col-span-2 text-[10px] font-mono text-red-400/70 truncate">
                {test.error ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RCA Report Tab ───────────────────────────────────────────────────────────

function RcaTab({ stage }: { stage: PipelineStage }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/pipeline/rca")
      .then((res) => res.json())
      .then((data) => {
        setReports(data.reports || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading RCA Reports...</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/50">
        <FileSearch className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No RCA reports yet</p>
        <p className="text-xs mt-1">
          Reports appear here once test failures are analyzed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div key={report.id} className="glass rounded-2xl border border-border/40 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/40 bg-muted/5 flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  report.status === "Fixed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : 
                  report.status === "Failed" ? "bg-red-500/10 text-red-400 border-red-500/30" : 
                  "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}>
                  {report.status}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Generated by {report.agent?.toUpperCase?.()} · {new Date(report.time).toLocaleString()}
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground truncate">
                {report.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Repo: {report.repo} · Event: {report.event}
              </p>
            </div>
            {report.confidence > 0 && (
              <div className="text-right shrink-0">
                <p className={`text-2xl font-black ${
                  report.confidence >= 0.8 ? "text-emerald-400" : 
                  report.confidence >= 0.5 ? "text-amber-400" : "text-red-400"
                }`}>
                  {Math.round(report.confidence * 100)}%
                </p>
                <p className="text-[10px] text-muted-foreground">Confidence</p>
              </div>
            )}
          </div>

          {/* Healer RCA Analysis */}
          {report.rca_report && (
            <div className="px-6 py-4 border-b border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Healer Analysis</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {report.rca_report}
              </p>
            </div>
          )}

          {/* Proposed Code Fix */}
          {report.proposed_fix && (
            <div className="px-6 py-4 border-b border-border/30 bg-muted/5">
              <div className="flex items-center gap-2 mb-2">
                <GitPullRequest className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Proposed Fix</span>
              </div>
              <pre className="text-xs text-foreground/70 bg-background/50 rounded-lg p-3 overflow-x-auto border border-border/30 font-mono">
                {report.proposed_fix}
              </pre>
              {report.target_files?.length > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">Files:</span>
                  {report.target_files.map((f: string) => (
                    <span key={f} className="text-[10px] px-2 py-0.5 rounded bg-muted/20 border border-border/30 text-foreground/60 font-mono">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="p-4 bg-muted/10 flex justify-between items-center border-t border-border/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSearch className="w-4 h-4" />
              Notion Database Entry
            </div>
            <div className="flex items-center gap-3">
              {report.confidence >= 0.5 && (
                <button
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
                  onClick={() => window.open(report.pr_url || report.url, "_blank")}
                >
                  <GitPullRequest className="w-3 h-3" /> Merge Fix
                </button>
              )}
              <a
                href={report.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View in Notion <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PR Tracker Tab ───────────────────────────────────────────────────────────

interface PRData {
  id: number;
  title: string;
  branch: string;
  status: string;
  confidence: number;
  time: string;
  tests: string;
  author: string;
  url: string;
}

function PrsTab() {
  const [prs, setPrs] = useState<PRData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/pipeline/prs")
      .then((res) => res.json())
      .then((data) => {
        setPrs(data.prs || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const total = prs.length;
  const merged = prs.filter((p) => p.status === "merged").length;
  const open = prs.filter((p) => p.status === "open").length;

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading Pull Requests...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total PRs", value: total, color: "text-foreground" },
          { label: "Merged", value: merged, color: "text-emerald-400" },
          { label: "Open", value: open, color: "text-amber-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="glass rounded-xl p-4 border border-border/40 text-center"
          >
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {prs.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No SentinelQA Pull Requests found.
          </div>
        )}
        {prs.map((pr) => (
          <div
            key={pr.id}
            className={`glass rounded-xl border p-5 ${pr.status === "open" ? "border-amber-500/30 bg-amber-500/5" : "border-border/40"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      pr.status === "open"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {pr.status === "open" ? "● OPEN" : "✓ MERGED"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    PR #{pr.id}
                  </span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">
                    {pr.time}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  {pr.title}
                </h4>
                <p className="text-xs font-mono text-muted-foreground/60">
                  {pr.branch}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-emerald-400">
                  {pr.confidence}%
                </p>
                <p className="text-[10px] text-muted-foreground">confidence</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FlaskConical className="w-3 h-3" />
                {pr.tests} tests
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Bot className="w-3 h-3" />
                {pr.author}
              </div>
              <a
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Github className="w-3 h-3" /> View on GitHub{" "}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const [config, setConfig] = useState<{
    owner: string; repo: string; targetUrl: string; aiEngine: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/config")
      .then((r) => r.json())
      .then((data) => { setConfig(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading configuration...
      </div>
    );
  }

  const envItems = [
    {
      label: "GitHub Repository",
      value: config ? `${config.owner}/${config.repo}` : "Not configured",
      icon: <Github className="w-5 h-5" />,
      color: "text-foreground",
      status: config?.owner ? "connected" : "missing",
    },
    {
      label: "Target URL",
      value: config?.targetUrl || "Not set",
      icon: <ExternalLink className="w-5 h-5" />,
      color: "text-emerald-400",
      status: config?.targetUrl ? "connected" : "missing",
    },
    {
      label: "AI Engine",
      value: config?.aiEngine || "Not connected",
      icon: <Brain className="w-5 h-5" />,
      color: "text-purple-400",
      status: config?.aiEngine && config.aiEngine !== "not connected" ? "connected" : "missing",
    },
    {
      label: "Notion Integration",
      value: "Configured via NOTION_TOKEN",
      icon: <Database className="w-5 h-5" />,
      color: "text-amber-400",
      status: "connected",
    },
    {
      label: "GitHub PAT",
      value: "••••••••••",
      icon: <Shield className="w-5 h-5" />,
      color: "text-blue-400",
      status: config?.owner ? "connected" : "missing",
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Pipeline Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Environment variables and service connections for the SentinelQA pipeline.
        </p>
      </div>

      {/* Integration Status Cards */}
      <div className="space-y-3">
        {envItems.map((item) => (
          <div
            key={item.label}
            className="glass rounded-xl border border-border/40 p-4 flex items-center gap-4 hover:border-border transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-center ${item.color}`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{item.value}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              item.status === "connected"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border-red-500/30"
            }`}>
              {item.status === "connected" ? "Connected" : "Not Set"}
            </span>
          </div>
        ))}
      </div>

      {/* Agent Configuration */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" /> Agent Roster
        </h3>
        <div className="glass rounded-xl border border-border/40 overflow-hidden divide-y divide-border/30">
          {AGENTS.map((agent) => (
            <div key={agent.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
              <div className={`w-8 h-8 rounded-lg ${agent.bg} border ${agent.border} flex items-center justify-center ${agent.text}`}>
                {agent.icon}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">{agent.name}</p>
                <p className="text-[10px] text-muted-foreground">{agent.role} · {agent.owner}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Health Check Links */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Plug className="w-4 h-4 text-cyan-400" /> Health Checks
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/mcp-test"
            className="glass rounded-xl border border-border/40 p-4 hover:border-cyan-500/30 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1">
              <Plug className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-foreground group-hover:text-cyan-400 transition-colors">MCP Health</span>
            </div>
            <p className="text-xs text-muted-foreground">Test GitHub & Playwright MCP connections</p>
          </Link>
          <Link
            href="/notion-test"
            className="glass rounded-xl border border-border/40 p-4 hover:border-purple-500/30 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-foreground group-hover:text-purple-400 transition-colors">Notion Health</span>
            </div>
            <p className="text-xs text-muted-foreground">Verify Notion database connectivity</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────

function PipelineTab({
  stage,
  agentStatuses,
  onRun,
  running,
}: {
  stage: PipelineStage;
  agentStatuses: Record<string, AgentStatus>;
  onRun: () => void;
  running: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Multi-Agent Pipeline
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time orchestration across all 5 AI agents
          </p>
        </div>
        <Button
          onClick={onRun}
          disabled={running}
          className="glow-cyan bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Pipeline
            </>
          )}
        </Button>
      </div>
      <PipelineFlowViz stage={stage} agentStatuses={agentStatuses} />
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Pipeline simulation state
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [running, setRunning] = useState(false);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, AgentStatus>
  >({
    architect: "idle",
    scripter: "idle",
    watchdog: "idle",
    healer: "idle",
    courier: "idle",
  });
  const [agentTasks, setAgentTasks] = useState<Record<string, string>>({
    architect: "Awaiting trigger…",
    scripter: "Awaiting test plan…",
    watchdog: "Monitoring metrics…",
    healer: "On standby…",
    courier: "Ready to notify…",
  });
  const [tests, setTests] = useState<TestResult[]>([]);

  // Run pipeline modal state
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runConfig, setRunConfig] = useState({ owner: "", repo: "", branch: "main", targetUrl: "" });

  const addLines = useCallback((lines: TerminalLine[], offset = 0) => {
    lines.forEach((line, i) => {
      setTimeout(
        () => {
          setTerminalLines((prev) => [...prev, { ...line, ts: now() }]);
        },
        offset + i * 300,
      );
    });
  }, []);

  const runPipeline = useCallback(async (config?: { owner: string; repo: string; branch: string; targetUrl: string }) => {
    if (running) return;
    setRunning(true);
    setTerminalLines([]);
    setTests([]);
    setAgentStatuses({
      architect: "idle",
      scripter: "idle",
      watchdog: "idle",
      healer: "idle",
      courier: "idle",
    });
    setAgentTasks({
      architect: "Awaiting trigger…",
      scripter: "Awaiting test plan…",
      watchdog: "Monitoring metrics…",
      healer: "On standby…",
      courier: "Ready to notify…",
    });
    setStage("architect");

    try {
      const bodyParams = config ? {
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        target_url: config.targetUrl
      } : {};
      const res = await fetch("/api/agent/pipeline/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyParams),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventMatch = line.match(/event: (.*)\ndata: (.*)/);
            if (eventMatch) {
              const eventName = eventMatch[1];
              const data = JSON.parse(eventMatch[2]);
              
              const mapAgent = (n: string) => (n === "playwright" || n === "test-writer" ? "scripter" : n);

              if (eventName === "agent.started" || eventName === "agent.completed") {
                const agentKey = mapAgent(data.agent_name);
                
                setAgentStatuses((p) => ({ ...p, [agentKey]: data.status === "started" ? "running" : "success" }));
                setAgentTasks((p) => ({ ...p, [agentKey]: data.message || (data.status === "started" ? "Running..." : "Completed") }));
                
                if (data.status === "started") {
                  if (agentKey === "architect") setStage("architect");
                  if (agentKey === "scripter") setStage("scripter");
                  if (agentKey === "watchdog") setStage("watchdog");
                  if (agentKey === "healer") setStage("healer");
                  if (agentKey === "courier") setStage("courier_pr");
                }
              }

              if (eventName === "session.status_changed") {
                // If the entire session finishes
                if (data.status === "completed" || data.status === "failed") {
                    setStage("complete");
                }
              }

              if (eventName === "test.result") {
                  setTests((prev) => {
                      // Prevent duplicates or update existing if needed, but for simplicity just append
                      return [...prev, data];
                  });
              }

              setTerminalLines((p) => [...p, {
                text: `[${eventName.toUpperCase()}] ${JSON.stringify(data).substring(0, 100)}...`,
                type: "info",
                ts: now()
              }]);
              
              if (eventName === "pipeline.completed") {
                setStage("complete");
                setRunning(false);
              }
              
              if (eventName === "error") {
                setTerminalLines((p) => [...p, { text: `[ERROR] ${data.error}`, type: "error", ts: now() }]);
                setRunning(false);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      setRunning(false);
    }
  }, [running]);

  // Fetch default config on mount
  useEffect(() => {
    fetch("/api/agent/config")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setRunConfig({
            owner: data.owner || "",
            repo: data.repo || "",
            branch: "main",
            targetUrl: data.targetUrl || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const TAB_TITLES: Record<Tab, string> = {
    overview: "Overview",
    pipeline: "Pipeline",
    agents: "Agents",
    tests: "Test Results",
    terminal: "Live Terminal",
    rca: "RCA Reports",
    prs: "PR Tracker",
    settings: "Settings",
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setTab={setActiveTab}
        session={session}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main content */}
      <main className="flex-1 md:ml-64 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="shrink-0 h-14 border-b border-border/40 glass-strong flex items-center px-6 gap-4">
          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground">
              {TAB_TITLES[activeTab]}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => setRunModalOpen(true)}
              disabled={running}
              className="glow-cyan bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-8 text-xs"
            >
              {running ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Running
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Run Pipeline
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStage("idle");
                setTerminalLines([]);
                setTests([]);
                setAgentStatuses({
                  architect: "idle",
                  scripter: "idle",
                  watchdog: "idle",
                  healer: "idle",
                  courier: "idle",
                });
              }}
              className="gap-1.5 h-8 text-xs border-border/50"
            >
              <RefreshCcw className="w-3 h-3" />
              Reset
            </Button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "overview" && (
                <OverviewTab
                  agentStatuses={agentStatuses}
                  agentTasks={agentTasks}
                  stage={stage}
                  terminalLines={terminalLines}
                  tests={tests}
                />
              )}
              {activeTab === "pipeline" && (
                <PipelineTab
                  stage={stage}
                  agentStatuses={agentStatuses}
                  onRun={() => setRunModalOpen(true)}
                  running={running}
                />
              )}
              {activeTab === "agents" && (
                <AgentsTab
                  agentStatuses={agentStatuses}
                  agentTasks={agentTasks}
                />
              )}
              {activeTab === "tests" && <TestsTab tests={tests} />}
              {activeTab === "terminal" && (
                <div className="h-[calc(100vh-8rem)]">
                  <LiveTerminalPanel lines={terminalLines} />
                </div>
              )}
              {activeTab === "rca" && <RcaTab stage={stage} />}
              {activeTab === "prs" && <PrsTab />}
              {activeTab === "settings" && <SettingsTab />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Run Pipeline Modal */}
        <Dialog open={runModalOpen} onOpenChange={setRunModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Run Pipeline</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Repository Owner</Label>
                <Input
                  value={runConfig.owner}
                  onChange={(e) => setRunConfig({ ...runConfig, owner: e.target.value })}
                  placeholder="e.g. ChandanMeher4"
                />
              </div>
              <div className="space-y-2">
                <Label>Repository Name</Label>
                <Input
                  value={runConfig.repo}
                  onChange={(e) => setRunConfig({ ...runConfig, repo: e.target.value })}
                  placeholder="e.g. MergeMind"
                />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input
                  value={runConfig.branch}
                  onChange={(e) => setRunConfig({ ...runConfig, branch: e.target.value })}
                  placeholder="e.g. main"
                />
              </div>
              <div className="space-y-2">
                <Label>Target URL</Label>
                <Input
                  value={runConfig.targetUrl}
                  onChange={(e) => setRunConfig({ ...runConfig, targetUrl: e.target.value })}
                  placeholder="e.g. https://merge-mind-one.vercel.app/"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRunModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setRunModalOpen(false);
                  runPipeline(runConfig);
                }}
              >
                Run
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
