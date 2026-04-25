// ============================================================================
// GET /api/watchdog/metrics
//
// Returns current infrastructure metrics snapshot.
// Query params: ?metrics=error_rate,cpu_usage (comma-separated, optional)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getMetrics, MetricName } from "@/lib/mcp/watchdog";

const VALID_METRICS: MetricName[] = [
  "error_rate", "latency_p95", "cpu_usage", "memory_usage", "request_count",
];

export async function GET(request: NextRequest) {
  const metricsParam = request.nextUrl.searchParams.get("metrics");

  let metricNames: MetricName[] | undefined;
  if (metricsParam) {
    const requested = metricsParam.split(",").map((m) => m.trim()) as MetricName[];
    const invalid = requested.filter((m) => !VALID_METRICS.includes(m));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid metrics: ${invalid.join(", ")}. Valid: ${VALID_METRICS.join(", ")}` },
        { status: 400 }
      );
    }
    metricNames = requested;
  }

  const snapshots = getMetrics(metricNames);
  return NextResponse.json({ metrics: snapshots, count: snapshots.length });
}
