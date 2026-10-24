import { expect, it } from "vitest";
import { suiteCells } from "../components/BenchmarkCharts";
const run = (id: string, latency: number, tasks = 100) => ({ run_id: id, scenario: "benchmark:suite:steady", strategy: "predictive", metrics: JSON.stringify({ mean_latency_ms: latency, tasks }) });
it("keeps per-metric run counts and sample deviation without pooling suite scenarios", () => {
  const [cell] = suiteCells([run("a", 100), run("b", 200), { ...run("c", 999), scenario: "benchmark:other:steady" }], "suite");
  expect(cell.n).toBe(2);
  expect(cell.taskCount).toBe(200);
  expect(cell.stats.mean_latency_ms.n).toBe(2);
  expect(cell.stats.mean_latency_ms.sd).toBeCloseTo(70.710678);
});
it("does not invent uncertainty from one run or absent values", () => {
  const [cell] = suiteCells([run("a", 100), { ...run("b", 0), metrics: '{"tasks":50}' }], "suite");
  expect(cell.n).toBe(2);
  expect(cell.stats.mean_latency_ms).toEqual({ n: 1, sd: null });
  expect(cell.metrics.mean_latency_ms).toBe(100);
});
