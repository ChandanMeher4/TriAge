"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle, HeartPulse, Check, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const healCode = [
  "// Healer Agent activated",
  "const oldSelector = '.btn-primary';",
  "const newSelector = await findBestMatch('.btn-primary');",
  "// Found: button[data-testid='submit']",
  "await page.click(button[data-testid='submit']);",
  "// ✓ Selector healed successfully",
];

type Phase = "idle" | "broken" | "healing" | "healed";

export default function RemediationSimulator() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [healLine, setHealLine] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const simulateBreak = () => {
    setPhase("broken");
    setTimeout(() => {
      setPhase("healing");
      setHealLine(0);
    }, 2000);
  };

  useEffect(() => {
    if (phase === "healing") {
      if (healLine < healCode.length) {
        timerRef.current = setTimeout(() => setHealLine((l) => l + 1), 600);
      } else {
        setTimeout(() => {
          setPhase("healed");
          toast({
            title: "Test Healed",
            description: "Healer Agent fixed the broken selector in 1.8s",
          });
        }, 800);
      }
    }
    if (phase === "healed") {
      setTimeout(() => setPhase("idle"), 5000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, healLine]);

  const overlayColor =
    phase === "broken"
      ? "bg-rose-500/5"
      : phase === "healing"
        ? "bg-amber-500/5"
        : phase === "healed"
          ? "bg-emerald-500/5"
          : "";

  return (
    <section className="relative z-10 py-24 px-6">
      <div
        className={`absolute inset-0 transition-colors duration-1000 ${overlayColor}`}
      />
      <div className="max-w-4xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Remediation <span className="text-gradient-violet">Simulator</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            See how the Healer Agent fixes broken tests in real-time.
          </p>
        </motion.div>

        <div className="skeuo-card rounded-2xl overflow-hidden max-w-2xl mx-auto relative noise">
          {/* Terminal header */}
          <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70 shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70 shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70 shadow-inner" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">
                healer-agent.ts
              </span>
            </div>
            <div className="flex items-center gap-2">
              {phase === "broken" && (
                <span className="text-xs text-rose-400 font-mono flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> BROKEN
                </span>
              )}
              {phase === "healing" && (
                <span className="text-xs text-amber-400 font-mono flex items-center gap-1 animate-pulse">
                  <HeartPulse className="w-3 h-3" /> HEALING
                </span>
              )}
              {phase === "healed" && (
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="w-3 h-3" /> HEALED
                </span>
              )}
            </div>
          </div>

          {/* Terminal body */}
          <div className="relative z-10 p-3">
            <div className="skeuo-inset rounded-xl p-4 font-mono text-xs sm:text-sm min-h-[220px]">
              {/* Scanline effect */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl opacity-[0.03]">
                <div
                  className="w-full h-8 bg-gradient-to-b from-transparent via-white to-transparent"
                  style={{ animation: "scanline 4s linear infinite" }}
                />
              </div>

              <AnimatePresence mode="wait">
                {phase === "idle" && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-[180px] gap-4"
                  >
                    <p className="text-muted-foreground text-center">
                      Click below to simulate a broken test selector.
                    </p>
                    <Button
                      onClick={simulateBreak}
                      className="skeuo-btn text-white font-semibold gap-2 rounded-xl"
                      style={{
                        background: "linear-gradient(180deg, hsl(38, 92%, 55%), hsl(38, 92%, 42%))",
                        borderColor: "hsl(38, 92%, 35%)",
                      }}
                    >
                      <AlertTriangle className="w-4 h-4" /> Simulate Break
                    </Button>
                  </motion.div>
                )}

                {phase === "broken" && (
                  <motion.div
                    key="broken"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    <div className="text-red-400">
                      ✗ Error: Element not found: .btn-primary
                    </div>
                    <div className="text-red-400/70">
                      {" "}
                      at login.spec.ts:7:3
                    </div>
                    <div className="text-amber-400 mt-4">
                      Healer Agent dispatched...
                    </div>
                  </motion.div>
                )}

                {(phase === "healing" || phase === "healed") && (
                  <motion.div
                    key="healing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-1"
                  >
                    {healCode
                      .slice(0, phase === "healed" ? healCode.length : healLine)
                      .map((line, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={
                            line.startsWith("//")
                              ? "text-emerald-400"
                              : "text-foreground/80"
                          }
                        >
                          <span className="text-muted-foreground/40 mr-3 select-none">
                            {i + 1}
                          </span>
                          {line}
                        </motion.div>
                      ))}
                    {phase === "healing" && healLine < healCode.length && (
                      <span
                        className="inline-block w-[2px] h-4 bg-primary ml-6"
                        style={{ animation: "typing-cursor 1s infinite" }}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Slack notification */}
        <AnimatePresence>
          {phase === "healed" && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 right-4 skeuo-card rounded-xl p-4 max-w-[260px] glow-rose"
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-foreground">
                  #triage-alerts
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-emerald-400 font-semibold">
                  Healer Agent:
                </span>{" "}
                Fixed broken selector in{" "}
                <span className="text-foreground">login.spec.ts</span>. New
                selector:{" "}
                <code className="text-primary">
                  button[data-testid=&apos;submit&apos;]
                </code>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
