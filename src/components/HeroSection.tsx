"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, MousePointer2 } from "lucide-react";
import Link from "next/link";

const codeLines = [
  { text: "import { test, expect } from '@playwright/test';", delay: 0 },
  { text: "", delay: 800 },
  {
    text: "test('login flow works correctly', async ({ page }) => {",
    delay: 1200,
  },
  { text: "  await page.goto('https://app.triage.ai');", delay: 2000 },
  { text: "  await page.fill('#email', 'agent@triage.ai');", delay: 2800 },
  { text: "  await page.fill('#password', '••••••••');", delay: 3600 },
  { text: "  await page.click('button[type=\"submit\"]');", delay: 4400 },
  {
    text: "  await expect(page.locator('.dashboard')).toBeVisible();",
    delay: 5400,
  },
  { text: "  // ✓ Test passed — 1.2s", delay: 6400 },
  { text: "});", delay: 7000 },
];

const browserSteps = [
  { step: "idle", at: 0 },
  { step: "navigate", at: 2000 },
  { step: "fill-email", at: 2800 },
  { step: "fill-password", at: 3600 },
  { step: "click-submit", at: 4400 },
  { step: "dashboard", at: 5400 },
  { step: "passed", at: 6400 },
];

function TypewriterCode() {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [currentChars, setCurrentChars] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let lineIndex = 0;
    let charIndex = 0;

    const type = () => {
      if (lineIndex >= codeLines.length) {
        // Reset after a pause
        setTimeout(() => {
          setVisibleLines(0);
          setCurrentChars(0);
          lineIndex = 0;
          charIndex = 0;
        }, 3000);
        return;
      }

      const currentLine = codeLines[lineIndex].text;
      if (charIndex <= currentLine.length) {
        setVisibleLines(lineIndex);
        setCurrentChars(charIndex);
        charIndex++;
        intervalRef.current = setTimeout(type, 25 + Math.random() * 35);
      } else {
        lineIndex++;
        charIndex = 0;
        intervalRef.current = setTimeout(type, 200);
      }
    };

    intervalRef.current = setTimeout(type, 1000);
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, []);

  return (
    <div className="skeuo-card rounded-2xl overflow-hidden relative noise">
      {/* Editor header */}
      <div className="relative z-10 flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-transparent via-primary/[0.03] to-transparent">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70 shadow-inner" />
          <div className="w-3 h-3 rounded-full bg-amber-500/70 shadow-inner" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/70 shadow-inner" />
        </div>
        <span className="text-xs text-muted-foreground font-mono ml-2">
          login.spec.ts
        </span>
      </div>
      {/* Code area */}
      <div className="relative z-10 p-4 font-mono text-xs sm:text-sm leading-relaxed min-h-[280px] skeuo-inset m-3 rounded-xl">
        {codeLines.map((line, i) => {
          if (i > visibleLines) return null;
          const text =
            i === visibleLines ? line.text.slice(0, currentChars) : line.text;
          const isComment = text.trimStart().startsWith("//");
          return (
            <div key={i} className="flex">
              <span className="text-muted-foreground/40 select-none w-6 text-right mr-3 shrink-0">
                {i + 1}
              </span>
              <span
                className={isComment ? "text-emerald-400" : "text-foreground/90"}
              >
                {text}
                {i === visibleLines && (
                  <span
                    className="inline-block w-[2px] h-4 bg-primary ml-0.5 align-middle"
                    style={{ animation: "typing-cursor 1s infinite" }}
                  />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrowserMockup() {
  const [step, setStep] = useState("idle");

  useEffect(() => {
    const timeouts = browserSteps.map((s) =>
      setTimeout(() => setStep(s.step), s.at + 1000),
    );

    const resetTimeout = setTimeout(() => {
      setStep("idle");
    }, 10000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(resetTimeout);
    };
  }, []);

  return (
    <div className="skeuo-card rounded-2xl overflow-hidden relative noise">
      {/* Browser bar */}
      <div className="relative z-10 flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70 shadow-inner" />
          <div className="w-3 h-3 rounded-full bg-amber-500/70 shadow-inner" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/70 shadow-inner" />
        </div>
        <div className="flex-1 ml-3">
          <div className="skeuo-inset rounded-lg px-3 py-1.5 text-xs text-muted-foreground font-mono">
            {step === "idle" ? "about:blank" : "https://app.triage.ai"}
          </div>
        </div>
      </div>
      {/* Browser content */}
      <div className="relative z-10 p-6 min-h-[280px] flex items-center justify-center relative">
        {step === "idle" && (
          <p className="text-muted-foreground/40 text-sm">
            Waiting for test...
          </p>
        )}
        {step === "navigate" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[200px] space-y-3"
          >
            <div className="text-center text-sm font-semibold text-foreground mb-4">
              Log In
            </div>
            <div className="h-8 rounded-lg skeuo-inset" />
            <div className="h-8 rounded-lg skeuo-inset" />
            <div className="h-8 rounded-lg bg-muted/50 border border-primary/30 text-center text-xs text-muted-foreground flex items-center justify-center">
              Sign In
            </div>
          </motion.div>
        )}
        {step === "fill-email" && (
          <motion.div className="w-full max-w-[200px] space-y-3">
            <div className="text-center text-sm font-semibold text-foreground mb-4">
              Log In
            </div>
            <div className="h-8 rounded-lg skeuo-inset border-primary/50 px-2 flex items-center text-xs text-primary font-mono glow-violet">
              agent@triage.ai
            </div>
            <div className="h-8 rounded-lg skeuo-inset" />
            <div className="h-8 rounded-lg bg-muted/50 border border-primary/30 text-center text-xs text-muted-foreground flex items-center justify-center">
              Sign In
            </div>
            <MousePointer2 className="absolute bottom-16 right-20 w-4 h-4 text-primary animate-pulse" />
          </motion.div>
        )}
        {step === "fill-password" && (
          <motion.div className="w-full max-w-[200px] space-y-3">
            <div className="text-center text-sm font-semibold text-foreground mb-4">
              Log In
            </div>
            <div className="h-8 rounded-lg skeuo-inset px-2 flex items-center text-xs text-foreground/60 font-mono">
              agent@triage.ai
            </div>
            <div className="h-8 rounded-lg skeuo-inset border-primary/50 px-2 flex items-center text-xs text-primary font-mono glow-violet">
              ••••••••
            </div>
            <div className="h-8 rounded-lg bg-muted/50 border border-primary/30 text-center text-xs text-muted-foreground flex items-center justify-center">
              Sign In
            </div>
          </motion.div>
        )}
        {step === "click-submit" && (
          <motion.div className="w-full max-w-[200px] space-y-3">
            <div className="text-center text-sm font-semibold text-foreground mb-4">
              Log In
            </div>
            <div className="h-8 rounded-lg skeuo-inset px-2 flex items-center text-xs text-foreground/60 font-mono">
              agent@triage.ai
            </div>
            <div className="h-8 rounded-lg skeuo-inset px-2 flex items-center text-xs text-foreground/60 font-mono">
              ••••••••
            </div>
            <motion.div
              animate={{ scale: [1, 0.95, 1] }}
              transition={{ duration: 0.2 }}
              className="h-8 rounded-lg skeuo-btn text-white text-center text-xs font-semibold flex items-center justify-center"
            >
              Signing In...
            </motion.div>
            <MousePointer2 className="absolute bottom-12 right-24 w-4 h-4 text-primary" />
          </motion.div>
        )}
        {(step === "dashboard" || step === "passed") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full space-y-3"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-primary/20 border border-primary/40" />
              <span className="text-xs font-semibold text-foreground">
                Dashboard
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg skeuo-inset"
                />
              ))}
            </div>
            <div className="h-20 rounded-lg skeuo-inset" />
            {step === "passed" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 right-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-xs text-emerald-400 font-mono glow-rose"
              >
                ✓ Test Passed
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative z-10 pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 skeuo-card rounded-full px-5 py-2 mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Agents Online
            </span>
          </motion.div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-4">
            <span className="text-gradient-violet">Intelligent</span>
            <br />
            <span className="text-foreground">Bug Triage</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            AI agents that write, heal, and observe your tests in real-time.
            Zero maintenance. Infinite coverage.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="skeuo-btn text-white font-semibold gap-2 rounded-xl px-6 h-12"
              asChild
            >
              <Link href="/auth">
                <Play className="w-4 h-4" /> Start Testing
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="emboss-border text-foreground hover:bg-muted/50 gap-2 rounded-xl px-6 h-12 bg-card/30"
            >
              Watch Demo <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Split view */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto"
        >
          <TypewriterCode />
          <BrowserMockup />
        </motion.div>
      </div>
    </section>
  );
}
