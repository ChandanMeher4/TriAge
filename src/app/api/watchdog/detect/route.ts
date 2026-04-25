// ============================================================================
// POST /api/watchdog/detect
//
// Runs anomaly detection on current metrics.
// Body: { "metrics": ["error_rate", "cpu_usage"], "inject_anomaly": { "metric": "error_rate", "severity": "high" } }
// The inject_anomaly field is optional — used for demo purposes.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  detectAnomalies,
  injectAnomaly,
  clearAnomalies,
  MetricName,
} from "@/lib/mcp/watchdog";

const VALID_METRICS: MetricName[] = [
  "error_rate", "latency_p95", "cpu_usage", "memory_usage", "request_count",
];

const VALID_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metrics, inject_anomaly, clear_anomalies } = body;

    // Optionally clear all injected anomalies
    if (clear_anomalies) {
      clearAnomalies();
    }

    // Optionally inject an anomaly for demo
    if (inject_anomaly) {
      const { metric, severity } = inject_anomaly;
      if (!VALID_METRICS.includes(metric)) {
        return NextResponse.json(
          { error: `Invalid metric: ${metric}` },
          { status: 400 }
        );
      }
      if (!VALID_SEVERITIES.includes(severity)) {
        return NextResponse.json(
          { error: `Invalid severity: ${severity}. Valid: ${VALID_SEVERITIES.join(", ")}` },
          { status: 400 }
        );
      }
      injectAnomaly(metric, severity);
    }

    // Validate requested metrics
    let metricNames: MetricName[] | undefined;
    if (metrics && Array.isArray(metrics)) {
      const invalid = metrics.filter((m: string) => !VALID_METRICS.includes(m as MetricName));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Invalid metrics: ${invalid.join(", ")}` },
          { status: 400 }
        );
      }
      metricNames = metrics as MetricName[];
    }

    const result = detectAnomalies(metricNames);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
