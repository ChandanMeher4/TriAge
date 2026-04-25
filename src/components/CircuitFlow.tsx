"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitCommit, Bot, BarChart3, CheckCircle2 } from "lucide-react";

const nodes = [
  { icon: GitCommit, label: "Commit", color: "primary" },
  { icon: Bot, label: "Agent", color: "primary" },
  { icon: BarChart3, label: "Metrics", color: "accent" },
  { icon: CheckCircle2, label: "Success", color: "secondary" },
];

export default function CircuitFlow() {
  const [activeNode, setActiveNode] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode((prev) => (prev + 1) % nodes.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="how-it-works" className="relative z-10 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            How It <span className="text-gradient-violet">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            From commit to confidence in four autonomous steps.
          </p>
        </motion.div>

        {/* Circuit path */}
        <div className="relative flex items-center justify-between max-w-3xl mx-auto">
          {/* Background track (recessed) */}
          <div className="absolute top-1/2 left-[10%] right-[10%] h-1 skeuo-inset -translate-y-1/2 rounded-full" />
          {/* Active track */}
          <div
            className="absolute top-1/2 left-[10%] h-1 rounded-full -translate-y-1/2 transition-all duration-500"
            style={{
              width: `${(activeNode / (nodes.length - 1)) * 80}%`,
              background: "linear-gradient(90deg, hsl(263, 70%, 58%), hsl(340, 82%, 52%))",
              boxShadow: "0 0 12px hsl(263, 70%, 58% / 0.4)",
            }}
          />

          {/* Particle */}
          <motion.div
            className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2"
            style={{
              background: "linear-gradient(135deg, hsl(263, 70%, 65%), hsl(340, 82%, 55%))",
              boxShadow: "0 0 16px hsl(263, 70%, 58% / 0.6), 0 0 4px hsl(0, 0%, 100% / 0.3)",
            }}
            animate={{
              left: `${10 + (activeNode / (nodes.length - 1)) * 80}%`,
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />

          {nodes.map((node, i) => {
            const Icon = node.icon;
            const isActive = i <= activeNode;
            return (
              <motion.div
                key={node.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative z-10 flex flex-col items-center gap-3"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isActive
                      ? "skeuo-card glow-violet"
                      : "skeuo-inset"
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 transition-colors duration-500 ${
                      isActive ? "text-primary" : "text-muted-foreground/50"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-semibold transition-colors duration-500 ${
                    isActive ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  {node.label}
                </span>
                {i === activeNode && (
                  <motion.div
                    layoutId="active-ring"
                    className="absolute -inset-1 rounded-2xl border border-primary/40"
                    style={{ animation: "liveness-ring 2s infinite" }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
