// ============================================================================
// SentinelQA — Watchdog Agent (Mock Metrics Generator)
//
// Produces realistic-looking infrastructure metrics and supports anomaly
// injection for demo scenarios. In Phase 2 this would query real Prometheus.
// ============================================================================

// ── Types ───────────────────────────────────────────────────────────────────

export type MetricName =
  | "error_rate"
  | "latency_p95"
  | "cpu_usage"
  | "memory_usage"
  | "request_count";

export interface MetricSnapshot {
  name: MetricName;
  value: number;
  unit: string;
  timestamp: string;
}

export interface Anomaly {
  metric: MetricName;
  severity: "low" | "medium" | "high" | "critical";
  current_value: number;
  baseline_value: number;
  threshold: number;
  message: string;
}

export interface AnomalyDetectionResult {
  anomalies_detected: boolean;
  anomalies: Anomaly[];
  recommendation: string;
  checked_at: string;
}

// ── Baselines & thresholds ──────────────────────────────────────────────────

const METRIC_CONFIG: Record<
  MetricName,
  { baseline: number; unit: string; threshold: number; noise: number }
> = {
  error_rate: { baseline: 0.02, unit: "%", threshold: 0.05, noise: 0.01 },
  latency_p95: { baseline: 120, unit: "ms", threshold: 500, noise: 30 },
  cpu_usage: { baseline: 35, unit: "%", threshold: 80, noise: 10 },
  memory_usage: { baseline: 55, unit: "%", threshold: 85, noise: 5 },
  request_count: { baseline: 1200, unit: "req/min", threshold: 5000, noise: 200 },
};

// ── Generator ───────────────────────────────────────────────────────────────

const injectedAnomalies = new Map<MetricName, "low" | "medium" | "high" | "critical">();

function addNoise(base: number, noise: number): number {
  return base + (Math.random() * 2 - 1) * noise;
}

function anomalyMultiplier(severity: "low" | "medium" | "high" | "critical"): number {
  switch (severity) {
    case "low": return 1.5;
    case "medium": return 2.5;
    case "high": return 4;
    case "critical": return 8;
  }
}

export function injectAnomaly(metric: MetricName, severity: "low" | "medium" | "high" | "critical"): void {
  injectedAnomalies.set(metric, severity);
}

export function clearAnomalies(): void {
  injectedAnomalies.clear();
}

export function getMetrics(metricNames?: MetricName[]): MetricSnapshot[] {
  const names = metricNames ?? (Object.keys(METRIC_CONFIG) as MetricName[]);
  const now = new Date().toISOString();

  return names.map((name) => {
    const config = METRIC_CONFIG[name];
    let value = addNoise(config.baseline, config.noise);

    const severity = injectedAnomalies.get(name);
    if (severity) {
      value = config.baseline * anomalyMultiplier(severity);
      value = addNoise(value, config.noise * 0.5);
    }

    return {
      name,
      value: Math.max(0, parseFloat(value.toFixed(2))),
      unit: config.unit,
      timestamp: now,
    };
  });
}

export function detectAnomalies(metricNames?: MetricName[]): AnomalyDetectionResult {
  const snapshots = getMetrics(metricNames);
  const anomalies: Anomaly[] = [];

  for (const snap of snapshots) {
    const config = METRIC_CONFIG[snap.name];
    if (snap.value > config.threshold) {
      const ratio = snap.value / config.baseline;
      let severity: Anomaly["severity"] = "low";
      if (ratio > 6) severity = "critical";
      else if (ratio > 3) severity = "high";
      else if (ratio > 2) severity = "medium";

      anomalies.push({
        metric: snap.name,
        severity,
        current_value: snap.value,
        baseline_value: config.baseline,
        threshold: config.threshold,
        message: `${snap.name} is at ${snap.value}${config.unit} (baseline: ${config.baseline}${config.unit}, threshold: ${config.threshold}${config.unit})`,
      });
    }
  }

  let recommendation = "All metrics within normal range.";
  if (anomalies.length > 0) {
    const worst = anomalies.sort((a, b) => {
      const order = { low: 0, medium: 1, high: 2, critical: 3 };
      return order[b.severity] - order[a.severity];
    })[0];
    recommendation = `Investigate ${worst.metric} — ${worst.severity} severity anomaly detected. ${worst.message}`;
  }

  return {
    anomalies_detected: anomalies.length > 0,
    anomalies,
    recommendation,
    checked_at: new Date().toISOString(),
  };
}
