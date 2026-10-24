const LABELS: Record<string, string> = {
  mean_latency_ms: "Mean latency (ms)", p95_latency_ms: "P95 latency (ms)", p99_latency_ms: "P99 latency (ms)",
  throughput: "Throughput (tasks/s)", throughput_per_s: "Throughput (tasks/s)", throughput_per_sec: "Throughput (tasks/s)",
  sla_violation_pct: "SLA violations (%)", makespan_ms: "Makespan (ms)", exec_time_ms: "Execution time (ms)",
  worker_id: "Worker", trace_id: "Trace ID", task_id: "Task ID", input: "Input", type: "Task type",
  tasks: "Submitted tasks", completed: "Completed tasks", failed: "Failed tasks", imbalance: "Worker imbalance",
  overhead_mean_us: "Mean scheduling overhead (µs)", overhead_p95_us: "P95 scheduling overhead (µs)",
};
export function metricLabel(key: string): string {
  const snake = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  if (LABELS[snake]) return LABELS[snake];
  const words = snake.replace(/_/g, " ").replace(/\bms$/, "(ms)").replace(/\bus$/, "(µs)").replace(/\bpct$/, "(%)");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
export function metricValue(value: unknown): string {
  if (value == null || typeof value !== "number" || !Number.isFinite(value)) return "–";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
