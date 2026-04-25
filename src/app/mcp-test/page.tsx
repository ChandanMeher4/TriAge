"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { MCPHealthReport, MCPCheckResult } from "@/app/api/mcp/health/route";

// ── Icons (inline SVG to avoid extra deps) ────────────────────────────────────

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
    </svg>
  );
}
function IconX() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}
function IconLoader() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 animate-spin">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
function IconGitHub() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}
function IconArrowLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
  );
}
function IconZap() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
    </svg>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MCPCheckResult["status"] | "running" }) {
  const config = {
    pass: { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-400", label: "PASS", icon: <IconCheck /> },
    fail: { bg: "bg-red-500/20", border: "border-red-500/40", text: "text-red-400", label: "FAIL", icon: <IconX /> },
    skip: { bg: "bg-yellow-500/20", border: "border-yellow-500/40", text: "text-yellow-400", label: "SKIP", icon: null },
    running: { bg: "bg-cyan-500/20", border: "border-cyan-500/40", text: "text-cyan-400", label: "RUNNING", icon: <IconLoader /> },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${config.bg} ${config.border} ${config.text}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ── Overall badge ─────────────────────────────────────────────────────────────

function OverallBadge({ status }: { status: MCPHealthReport["overall"] | "idle" | "loading" }) {
  const config = {
    healthy: { color: "text-emerald-400", border: "border-emerald-400/50", glow: "shadow-emerald-500/20", bg: "bg-emerald-500/10", label: "HEALTHY", dot: "bg-emerald-400" },
    degraded: { color: "text-yellow-400", border: "border-yellow-400/50", glow: "shadow-yellow-500/20", bg: "bg-yellow-500/10", label: "DEGRADED", dot: "bg-yellow-400" },
    unreachable: { color: "text-red-400", border: "border-red-400/50", glow: "shadow-red-500/20", bg: "bg-red-500/10", label: "UNREACHABLE", dot: "bg-red-400" },
    idle: { color: "text-slate-400", border: "border-slate-400/30", glow: "", bg: "bg-slate-500/10", label: "NOT TESTED", dot: "bg-slate-400" },
    loading: { color: "text-cyan-400", border: "border-cyan-400/50", glow: "shadow-cyan-500/20", bg: "bg-cyan-500/10", label: "RUNNING CHECKS...", dot: "bg-cyan-400 animate-pulse" },
  }[status];

  return (
    <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-xl border ${config.bg} ${config.border} shadow-lg ${config.glow}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
      <span className={`font-mono font-bold text-lg tracking-widest ${config.color}`}>{config.label}</span>
    </div>
  );
}

// ── Check row ─────────────────────────────────────────────────────────────────

function CheckRow({ check, index }: { check: MCPCheckResult; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className="border border-white/5 rounded-xl overflow-hidden"
    >
      <button
        onClick={() => check.data && setExpanded(!expanded)}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${check.data ? "hover:bg-white/5 cursor-pointer" : "cursor-default"}`}
      >
        {/* Index */}
        <span className="text-slate-600 font-mono text-xs w-5 shrink-0">{String(index + 1).padStart(2, "0")}</span>

        {/* Status badge */}
        <div className="shrink-0">
          <StatusBadge status={check.status} />
        </div>

        {/* Name */}
        <span className="font-mono text-sm text-slate-200 flex-1 truncate">{check.name}</span>

        {/* Duration */}
        <span className="text-slate-500 font-mono text-xs shrink-0">{check.durationMs}ms</span>

        {/* Detail */}
        {check.detail && (
          <span className="text-slate-400 text-xs truncate max-w-xs hidden lg:block">{check.detail}</span>
        )}

        {/* Expand arrow */}
        {check.data && (
          <motion.span
            animate={{ rotate: expanded ? 90 : 0 }}
            className="text-slate-500 ml-1 shrink-0"
          >
            ▶
          </motion.span>
        )}
      </button>

      {/* Detail (mobile) */}
      {check.detail && (
        <div className="px-14 pb-2 text-slate-500 text-xs font-mono lg:hidden">{check.detail}</div>
      )}

      {/* Expanded data */}
      <AnimatePresence>
        {expanded && check.data && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <pre className="px-14 pb-5 pt-1 text-xs font-mono text-cyan-300/80 whitespace-pre-wrap break-all leading-relaxed max-h-64 overflow-y-auto">
              {typeof check.data === "string"
                ? check.data
                : JSON.stringify(check.data, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MCPTestPage() {
  const [report, setReport] = useState<MCPHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const runTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    setElapsed(null);
    const t0 = Date.now();

    try {
      const res = await fetch("/api/mcp/health");
      const data: MCPHealthReport = await res.json();
      setReport(data);
      setElapsed(Date.now() - t0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — is the dev server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  const overallStatus: MCPHealthReport["overall"] | "idle" | "loading" = loading
    ? "loading"
    : report?.overall ?? "idle";

  const passCount = report?.checks.filter((c) => c.status === "pass").length ?? 0;
  const failCount = report?.checks.filter((c) => c.status === "fail").length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-['Inter',sans-serif] relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#00f5ff 1px, transparent 1px), linear-gradient(90deg, #00f5ff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow blobs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">

        {/* Back link */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors mb-10 text-sm font-mono">
          <IconArrowLeft /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <IconGitHub />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">GitHub MCP Health Check</h1>
              <p className="text-slate-400 text-sm">Verify the GitHub MCP server connection and capabilities</p>
            </div>
          </div>
        </div>

        {/* Status card */}
        <div className="glass rounded-2xl border border-white/10 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <p className="text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">Overall Status</p>
              <OverallBadge status={overallStatus} />
              {report && (
                <p className="text-slate-500 text-xs font-mono mt-2">
                  Completed in {report.totalDurationMs}ms · {new Date(report.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Stats */}
            {report && (
              <div className="flex gap-5">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400 font-mono">{passCount}</p>
                  <p className="text-xs text-slate-500 font-mono">PASSED</p>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400 font-mono">{failCount}</p>
                  <p className="text-xs text-slate-500 font-mono">FAILED</p>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-cyan-400 font-mono">{report.tools.length}</p>
                  <p className="text-xs text-slate-500 font-mono">TOOLS</p>
                </div>
              </div>
            )}

            {/* Run button */}
            <button
              onClick={runTest}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 shrink-0"
            >
              {loading ? <IconLoader /> : <IconZap />}
              {loading ? "Running…" : "Run Health Check"}
            </button>
          </div>
        </div>

        {/* Env check */}
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl border border-white/10 p-5 mb-6"
          >
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">Environment</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "PAT", value: report.envCheck.pat ? "Configured" : "Missing", ok: report.envCheck.pat },
                { label: "OWNER", value: report.envCheck.owner ?? "—", ok: !!report.envCheck.owner },
                { label: "REPO", value: report.envCheck.repo ?? "—", ok: !!report.envCheck.repo },
                { label: "BRANCH", value: report.envCheck.branch ?? "—", ok: !!report.envCheck.branch },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl px-4 py-3 border ${item.ok ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                  <p className="text-xs font-mono text-slate-500 mb-1">{item.label}</p>
                  <p className={`text-sm font-mono font-semibold truncate ${item.ok ? "text-emerald-400" : "text-red-400"}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 mb-6"
          >
            <p className="text-red-400 font-mono text-sm">
              <span className="font-bold">Error: </span>{error}
            </p>
          </motion.div>
        )}

        {/* Checks list */}
        {report && report.checks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl border border-white/10 p-5 mb-6"
          >
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">
              Diagnostic Checks
              <span className="text-slate-600 ml-2 normal-case">click a row to expand data</span>
            </p>
            <div className="space-y-2">
              {report.checks.map((check, i) => (
                <CheckRow key={check.name} check={check} index={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Tools list */}
        {report && report.tools.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl border border-white/10 p-5 mb-6"
          >
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">
              Available MCP Tools
              <span className="text-slate-600 ml-2">({report.tools.length} total)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {report.tools.map((tool) => (
                <span
                  key={tool}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono"
                >
                  {tool}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && !report && !error && (
          <div className="glass rounded-2xl border border-white/10 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mx-auto mb-5 text-slate-500">
              <IconGitHub />
            </div>
            <h2 className="text-slate-300 font-semibold mb-2">Ready to Test</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              Clicking <strong className="text-slate-300">Run Health Check</strong> will spawn the GitHub MCP server via{" "}
              <code className="text-cyan-400 bg-cyan-500/10 px-1 rounded">npx</code>, run 5 diagnostic checks against your repo, and display the results here.
              First run may take ~30–60s while npx downloads the package.
            </p>
            <p className="text-slate-600 text-xs font-mono">
              Make sure <code className="text-cyan-400">GITHUB_PERSONAL_ACCESS_TOKEN</code> is set in your <code className="text-cyan-400">.env</code>
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="glass rounded-2xl border border-white/10 p-5 space-y-3">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">Running checks…</p>
            {["PAT Configuration", "MCP Server Start (npx)", "tools/list", "list_commits", "get_file_contents", "list_pull_requests"].map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.15 }}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border border-white/5"
              >
                <span className="text-slate-600 font-mono text-xs w-5">{String(i + 1).padStart(2, "0")}</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                  <IconLoader /> RUNNING
                </span>
                <span className="font-mono text-sm text-slate-500 flex-1">{name}</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="text-slate-600 text-xs font-mono text-center mt-8">
          The MCP server is spawned fresh for each health check and shut down automatically after all checks complete.
          {" "}First run may take ~30s while <code className="text-cyan-700">npx</code> downloads the package.
        </p>
      </div>
    </div>
  );
}
