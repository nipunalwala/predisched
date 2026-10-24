import { useState } from "react";
import type { SuiteCell } from "./BenchmarkCharts";
import { STRATEGY_LABELS } from "../theme/palette";
import { Card, PanelState } from "./ui/primitives";

const METRICS: [string, string, boolean][] = [
  ["mean_latency_ms", "Mean latency (ms)", true],
  ["p95_latency_ms", "P95 latency (ms)", true],
  ["throughput_per_s", "Throughput (tasks/s)", false],
  ["sla_violation_pct", "SLA violations (%)", true],
];
function measurement(cell: SuiteCell | undefined, metric: string) {
  const v = cell?.metrics[metric];
  if (v == null) return "Not recorded";
  const stats = cell!.stats[metric];
  return `${v.toFixed(2)} · ${stats.n > 1 && stats.sd != null ? `SD ${stats.sd.toFixed(2)}` : "variation unavailable"} · n=${stats.n}`;
}
export function BenchmarkComparison({ cells }: { cells: SuiteCell[] }) {
  const [scenario, setScenario] = useState("");
  const [baseline, setBaseline] = useState("least_loaded");
  const scenarios = [...new Set(cells.map((c) => c.scenario))];
  const selected = scenarios.includes(scenario) ? scenario : scenarios[0] ?? "";
  const strategies = cells.filter((c) => c.scenario === selected && c.strategy !== "predictive").map((c) => c.strategy);
  const selectedBaseline = strategies.includes(baseline) ? baseline : strategies[0] ?? "";
  const predictive = cells.find((c) => c.scenario === selected && c.strategy === "predictive");
  const base = cells.find((c) => c.scenario === selected && c.strategy === selectedBaseline);
  return <Card title="Did prediction help?" action={<div className="flex flex-wrap gap-2 text-sm">
    <label>Scenario<select aria-label="Comparison scenario" className="ml-2 h-8 max-w-48 rounded border border-rule bg-panel px-2" value={selected} onChange={(e) => setScenario(e.target.value)}>{scenarios.map((s) => <option key={s}>{s}</option>)}</select></label>
    <label>Baseline<select aria-label="Comparison baseline" className="ml-2 h-8 max-w-48 rounded border border-rule bg-panel px-2" value={selectedBaseline} onChange={(e) => setBaseline(e.target.value)}>{strategies.map((s) => <option key={s} value={s}>{STRATEGY_LABELS[s] ?? s}</option>)}</select></label>
  </div>}>
    {!predictive || !base ? <PanelState kind="empty" message="This scenario needs both predictive and baseline measurements for a comparison. Choose another scenario or suite." /> : <>
      <p className="mb-3 text-sm text-muted">Same suite and scenario. Each value is the mean across runs; SD describes observed run-to-run variation, not a confidence interval. Run P95 values are averaged, not pooled task percentiles.</p>
      <div className="overflow-x-auto"><table className="tabular w-full min-w-[660px] text-sm" data-testid="benchmark-comparison">
        <caption className="sr-only">Predictive versus baseline measurements</caption>
        <thead className="text-left text-xs text-muted"><tr><th className="py-2">Metric</th><th>Predictive</th><th>{STRATEGY_LABELS[selectedBaseline] ?? selectedBaseline}</th><th>Predictive change</th></tr></thead>
        <tbody>{METRICS.map(([key, label, lower]) => {
          const p = predictive.metrics[key], b = base.metrics[key];
          const delta = p != null && b != null && b !== 0 ? 100 * (p - b) / Math.abs(b) : null;
          return <tr key={key} className="border-t border-rule"><th scope="row" className="py-3 text-left font-medium">{label}</th><td>{measurement(predictive, key)}</td><td>{measurement(base, key)}</td><td>{delta == null ? "Not comparable (%)" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}% · ${delta === 0 ? "unchanged" : (delta < 0) === lower ? "better" : "worse"}`}</td></tr>;
        })}</tbody>
      </table></div>
      <p className="mt-3 text-xs text-muted">Sample: predictive {predictive.n} runs / {predictive.taskCount ?? "unknown"} tasks; baseline {base.n} runs / {base.taskCount ?? "unknown"} tasks. Counts are submitted tasks, not successful completions. Missing values are excluded per metric. With one run, variation cannot be estimated. These descriptive comparisons do not establish statistical significance.</p>
    </>}
  </Card>;
}
