"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { NotionHealthReport, NotionCheckResult, NotionTestPageResult } from "@/app/api/notion/health/route";

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconCheck() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" /></svg>;
}
function IconX() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
}
function IconSkip() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zM9 13a1 1 0 102 0 1 1 0 00-2 0z" /></svg>;
}
function IconLoader() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>;
}
function IconArrowLeft() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>;
}
function IconExternalLink() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>;
}
function IconNotion() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function CheckBadge({ status }: { status: NotionCheckResult["status"] | "running" }) {
  const cfg = {
    pass:    { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-400", label: "PASS",    icon: <IconCheck /> },
    fail:    { bg: "bg-red-500/20",     border: "border-red-500/40",     text: "text-red-400",     label: "FAIL",    icon: <IconX /> },
    skip:    { bg: "bg-yellow-500/20",  border: "border-yellow-500/40",  text: "text-yellow-400",  label: "SKIP",    icon: <IconSkip /> },
    running: { bg: "bg-cyan-500/20",    border: "border-cyan-500/40",    text: "text-cyan-400",    label: "RUNNING", icon: <IconLoader /> },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function OverallBadge({ status }: { status: NotionHealthReport["overall"] | "idle" | "loading" }) {
  const cfg = {
    healthy:     { color: "text-emerald-400", border: "border-emerald-400/50", bg: "bg-emerald-500/10", label: "HEALTHY",          dot: "bg-emerald-400" },
    degraded:    { color: "text-yellow-400",  border: "border-yellow-400/50",  bg: "bg-yellow-500/10",  label: "DEGRADED",         dot: "bg-yellow-400" },
    unreachable: { color: "text-red-400",     border: "border-red-400/50",     bg: "bg-red-500/10",     label: "UNREACHABLE",      dot: "bg-red-400" },
    idle:        { color: "text-slate-400",   border: "border-slate-400/30",   bg: "bg-slate-500/10",   label: "NOT TESTED",       dot: "bg-slate-400" },
    loading:     { color: "text-cyan-400",    border: "border-cyan-400/50",    bg: "bg-cyan-500/10",    label: "RUNNING CHECKS…",  dot: "bg-cyan-400 animate-pulse" },
  }[status];
  return (
    <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
      <span className={`font-mono font-bold text-lg tracking-widest ${cfg.color}`}>{cfg.label}</span>
    </div>
  );
}

// ── Check row ─────────────────────────────────────────────────────────────────
function CheckRow({ check, index }: { check: NotionCheckResult; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}
      className="border border-white/5 rounded-xl overflow-hidden">
      <button onClick={() => check.data && setOpen(!open)}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${check.data ? "hover:bg-white/5 cursor-pointer" : "cursor-default"}`}>
        <span className="text-slate-600 font-mono text-xs w-5 shrink-0">{String(index + 1).padStart(2, "0")}</span>
        <div className="shrink-0"><CheckBadge status={check.status} /></div>
        <span className="font-mono text-sm text-slate-200 flex-1 truncate">{check.name}</span>
        <span className="text-slate-500 font-mono text-xs shrink-0">{check.durationMs}ms</span>
        {check.detail && <span className="text-slate-400 text-xs truncate max-w-xs hidden lg:block">{check.detail}</span>}
        {check.data && <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-slate-500 shrink-0 text-xs">▶</motion.span>}
      </button>
      {check.detail && <div className="px-14 pb-2 text-slate-500 text-xs font-mono lg:hidden">{check.detail}</div>}
      <AnimatePresence>
        {open && check.data && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <pre className="px-14 pb-5 pt-1 text-xs font-mono text-cyan-300/80 whitespace-pre-wrap break-all leading-relaxed max-h-56 overflow-y-auto">
              {typeof check.data === "string" ? check.data : JSON.stringify(check.data, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Test report scenarios ─────────────────────────────────────────────────────
const SCENARIOS = [
  { id: "test",     emoji: "🚀", label: "Pipeline Start",    desc: "Logs when a new pipeline run begins" },
  { id: "failure",  emoji: "❌", label: "Test Failure",      desc: "Watchdog report with logs + root cause + diff" },
  { id: "fix",      emoji: "🔧", label: "Healer Fix",        desc: "Full RCA + code fix with confidence score" },
  { id: "complete", emoji: "✅", label: "Pipeline Complete", desc: "Final summary with pass/fail stats + PR link" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NotionTestPage() {
  const [report, setReport]           = useState<NotionHealthReport | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [sending, setSending]         = useState<string | null>(null);   // scenario id being sent
  const [sentPages, setSentPages]     = useState<Record<string, NotionTestPageResult>>({});
  const [sendError, setSendError]     = useState<string | null>(null);

  // ── Connectivity check ─────────────────────────────────────────────────────
  const runHealthCheck = useCallback(async () => {
    setLoadingHealth(true);
    setHealthError(null);
    setReport(null);
    try {
      const res = await fetch("/api/notion/health");
      setReport(await res.json());
    } catch (e) {
      setHealthError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  // ── Send test report ───────────────────────────────────────────────────────
  const sendReport = useCallback(async (scenario: string) => {
    setSending(scenario);
    setSendError(null);
    try {
      const res = await fetch("/api/notion/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const data: NotionTestPageResult = await res.json();
      setSentPages((prev) => ({ ...prev, [scenario]: data }));
      if (!data.success) setSendError(data.error ?? "Failed");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSending(null);
    }
  }, []);

  const overallStatus: NotionHealthReport["overall"] | "idle" | "loading" =
    loadingHealth ? "loading" : report?.overall ?? "idle";

  const passCount = report?.checks.filter((c) => c.status === "pass").length ?? 0;
  const failCount = report?.checks.filter((c) => c.status === "fail").length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-['Inter',sans-serif] relative overflow-hidden">
      {/* Grid bg */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="absolute top-20 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">

        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-purple-400 transition-colors mb-10 text-sm font-mono">
          <IconArrowLeft /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <IconNotion />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Notion Integration Test</h1>
            <p className="text-slate-400 text-sm">Verify database access and send real test report pages</p>
          </div>
        </div>

        {/* ── SECTION 1: Connectivity check ─────────────────────────────────── */}
        <div className="glass rounded-2xl border border-white/10 p-6 mb-6">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-5">Step 1 — Connectivity Check</p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <p className="text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">Status</p>
              <OverallBadge status={overallStatus} />
              {report && (
                <p className="text-slate-500 text-xs font-mono mt-2">
                  Completed in {report.totalDurationMs}ms · {new Date(report.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>

            {report && (
              <div className="flex gap-5">
                {[
                  { label: "PASSED", val: passCount, color: "text-emerald-400" },
                  { label: "FAILED", val: failCount, color: "text-red-400" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.val}</p>
                    <p className="text-xs text-slate-500 font-mono">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={runHealthCheck} disabled={loadingHealth}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shrink-0 shadow-lg shadow-purple-500/20">
              {loadingHealth ? <IconLoader /> : <IconNotion />}
              {loadingHealth ? "Checking…" : "Run Connectivity Check"}
            </button>
          </div>
        </div>

        {/* Env check */}
        {report && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl border border-white/10 p-5 mb-6">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">Environment</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "NOTION_TOKEN", value: report.envCheck.token ? "Configured" : "Missing", ok: report.envCheck.token },
                { label: "NOTION_DATABASE_ID", value: report.envCheck.databaseId ?? "Missing", ok: !!report.envCheck.databaseId },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl px-4 py-3 border ${item.ok ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                  <p className="text-xs font-mono text-slate-500 mb-1">{item.label}</p>
                  <p className={`text-sm font-mono font-semibold truncate ${item.ok ? "text-emerald-400" : "text-red-400"}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {healthError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 mb-6">
            <p className="text-red-400 font-mono text-sm"><span className="font-bold">Error: </span>{healthError}</p>
          </div>
        )}

        {/* Check rows */}
        {report && report.checks.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-2xl border border-white/10 p-5 mb-6">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">
              Diagnostic Checks <span className="text-slate-600 normal-case">— click to expand</span>
            </p>
            <div className="space-y-2">
              {report.checks.map((c, i) => <CheckRow key={c.name} check={c} index={i} />)}
            </div>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loadingHealth && (
          <div className="glass rounded-2xl border border-white/10 p-5 mb-6 space-y-2">
            {["Token Configuration", "Database ID Configuration", "Database Access", "Query Database", "Schema Validation"].map((n, i) => (
              <motion.div key={n} animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.12 }}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border border-white/5">
                <span className="text-slate-600 font-mono text-xs w-5">{String(i + 1).padStart(2, "0")}</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border bg-purple-500/10 border-purple-500/30 text-purple-400">
                  <IconLoader /> RUNNING
                </span>
                <span className="font-mono text-sm text-slate-500 flex-1">{n}</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── SECTION 2: Send test reports ──────────────────────────────────── */}
        <div className="glass rounded-2xl border border-white/10 p-6 mb-6">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Step 2 — Send Real Test Reports to Notion</p>
          <p className="text-slate-500 text-sm mb-6">Each button creates a real page in your Notion database. Click any scenario to test it.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SCENARIOS.map((s) => {
              const sent = sentPages[s.id];
              const isLoading = sending === s.id;

              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border p-4 transition-colors ${sent?.success ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"}`}>

                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-sm text-slate-200">{s.emoji} {s.label}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{s.desc}</p>
                    </div>
                    {sent?.success && (
                      <a href={sent.pageUrl} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors font-mono">
                        Open <IconExternalLink />
                      </a>
                    )}
                  </div>

                  {sent?.success ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
                        <IconCheck /> Page created in {sent.durationMs}ms
                      </div>
                      {sent.pageUrl && (
                        <p className="text-slate-500 text-xs font-mono truncate">{sent.pageUrl}</p>
                      )}
                    </div>
                  ) : sent && !sent.success ? (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-mono">
                      <IconX /> {sent.error}
                    </div>
                  ) : (
                    <button onClick={() => sendReport(s.id)} disabled={!!sending}
                      className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      {isLoading ? <><IconLoader /> Sending…</> : <>Send to Notion</>}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {sendError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3">
              <p className="text-red-400 font-mono text-sm">{sendError}</p>
            </motion.div>
          )}
        </div>

        {/* ── SECTION 3: What gets logged automatically ──────────────────────── */}
        <div className="glass rounded-2xl border border-white/10 p-6 mb-6">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">Auto-Logged Events (Pipeline Integration)</p>
          <div className="space-y-2">
            {[
              { agent: "pipeline",   event: "Pipeline Start",    trigger: "POST /api/agent/pipeline is called",               color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
              { agent: "watchdog",   event: "Test Failure",       trigger: "Any test fails in the Playwright run",             color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
              { agent: "courier",    event: "PR Created",         trigger: "Courier opens a GitHub PR (confidence ≥ 0.8)",     color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { agent: "courier",    event: "Issue Created",      trigger: "Courier files a GitHub Issue (confidence < 0.8)",  color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20" },
              { agent: "pipeline",   event: "Pipeline Complete",  trigger: "Full pipeline run finishes",                       color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
            ].map((item) => (
              <div key={item.event} className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${item.bg} ${item.border}`}>
                <span className={`text-xs font-mono font-semibold w-20 shrink-0 ${item.color}`}>{item.agent}</span>
                <span className="text-sm font-mono text-slate-200 w-36 shrink-0">{item.event}</span>
                <span className="text-slate-400 text-xs">{item.trigger}</span>
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-xs font-mono mt-4">
            All events are fire-and-forget — a Notion failure never blocks the pipeline.
          </p>
        </div>

        {/* ── SECTION 4: Manual curl ─────────────────────────────────────────── */}
        <div className="glass rounded-2xl border border-white/10 p-5 mb-6">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">Manual API — POST /api/agent/debug-report</p>
          <pre className="text-xs font-mono text-cyan-300/80 whitespace-pre-wrap leading-relaxed overflow-x-auto">{`curl -X POST http://localhost:3000/api/agent/debug-report \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Login Failure Fix",
    "repo": "Hack-karo",
    "agent": "healer",
    "event": "Fix Generated",
    "confidence": 0.91,
    "pr": "https://github.com/user/repo/pull/12",
    "logs": "AssertionError: expected 200 got 401",
    "rootCause": "Missing Authorization header in /api/auth/me",
    "codeDiff": "- const session = await getSession()\\n+ const session = await getServerSession(authOptions)"
  }'`}</pre>
        </div>

        <p className="text-slate-600 text-xs font-mono text-center mt-4">
          Pages are created in your Notion database at <code className="text-purple-700">NOTION_DATABASE_ID</code>.
          Make sure your integration is shared with the database.
        </p>
      </div>
    </div>
  );
}
