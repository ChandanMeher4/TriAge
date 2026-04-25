"use client";

import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Activity } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

const sparkData = Array.from({ length: 20 }, (_, i) => ({
  v: Math.sin(i * 0.5) * 30 + 50 + Math.random() * 20,
}));

const features = [
  {
    icon: Sparkles,
    title: "AI Test Generation",
    desc: "Agents analyze your code changes and auto-generate comprehensive Playwright test suites. No manual test writing.",
  },
  {
    icon: ShieldCheck,
    title: "Self-Healing Tests",
    desc: "When selectors break, the Healer agent detects failures, finds new selectors, and patches tests autonomously.",
  },
  {
    icon: Activity,
    title: "Observability Loop",
    desc: "Real-time metrics, latency tracking, and pass-rate sparklines. Full visibility into your test health.",
    hasChart: true,
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="relative z-10 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Built for <span className="text-gradient-violet">Autonomous QA</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Three pillars of intelligent test automation.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="skeuo-card rounded-2xl p-6 relative noise group cursor-default"
              >
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:glow-violet transition-all duration-300 shadow-inner">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {f.desc}
                  </p>
                  {f.hasChart && (
                    <div className="h-16 mt-2 skeuo-inset rounded-xl p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData}>
                          <defs>
                            <linearGradient
                              id="sparkGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="hsl(263, 70%, 58%)"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="100%"
                                stopColor="hsl(263, 70%, 58%)"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="v"
                            stroke="hsl(263, 70%, 58%)"
                            strokeWidth={1.5}
                            fill="url(#sparkGrad)"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
