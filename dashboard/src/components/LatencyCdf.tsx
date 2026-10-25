import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLatencyCdf } from "../api/hooks";
import type { CdfSeries } from "../api/types";
import { STRATEGY_COLORS, STRATEGY_LABELS } from "../theme/palette";
import { Card, Guard, PanelState } from "./ui/primitives";

/** Carry each empirical step forward on the union of measured latencies. */
export function cdfRows(series: CdfSeries[]) {
  if (!series.length) return [];
  const latencies = [...new Set([0, ...series.flatMap((s) => s.points.map((p) => p.latencyMs))])].sort((a, b) => a - b);
  const indices = series.map(() => 0);
  const values = series.map(() => 0);
  return latencies.map((latencyMs) => {
    const row: Record<string, number> = { latencyMs };
    series.forEach((s, i) => {
      while (indices[i] < s.points.length && s.points[indices[i]].latencyMs <= latencyMs) {
        values[i] = s.points[indices[i]++].cumulativePct;
      }
      row[s.strategy] = values[i];
    });
    return row;
  });
}

export function LatencyCdf({ suite }: { suite: string }) {
  const query = useLatencyCdf(suite);
  const [scenario, setScenario] = useState("");
  const selected = query.data?.scenarios.find((s) => s.scenario === scenario) ?? query.data?.scenarios[0];
  const data = useMemo(() => cdfRows(selected?.strategies ?? []), [selected]);
  return <Card title="Latency CDF overlay" action={query.data?.scenarios.length ?
    <select aria-label="CDF scenario" className="h-8 rounded border border-rule bg-panel px-2 text-sm"
      value={selected?.scenario ?? ""} onChange={(event) => setScenario(event.target.value)}>
      {query.data.scenarios.map((s) => <option key={s.scenario}>{s.scenario}</option>)}
    </select> : undefined}>
    {!suite ? <PanelState kind="empty" message="Select a benchmark suite to view its latency distribution." /> :
      <Guard query={query}>
        {() => !selected ? <PanelState kind="empty" message="No per-task latency records are saved for this suite." /> : <>
          <p className="mb-3 text-sm text-muted">Recorded task latencies · completed tasks pooled across runs, including warm-up.
            At the same completion percentage, further left means lower latency.</p>
          {!!query.data?.missingRuns && <p className="mb-3 text-sm text-muted">
            Partial archive: per-task files are missing for {query.data.missingRuns} runs in this suite.
          </p>}
          <div className="h-72" data-testid="latency-cdf" role="img" aria-label={`Latency CDF for ${selected.scenario}; latency in milliseconds versus completed tasks percent`}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis type="number" dataKey="latencyMs" domain={[0, "dataMax"]} tickCount={4}
                  label={{ value: "Latency (ms)", position: "insideBottom", offset: -12 }} fontSize={11} />
                <YAxis domain={[0, 100]} unit="%" width={48} fontSize={11} />
                <Tooltip labelFormatter={(value) => `${Number(value).toLocaleString()} ms`}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{ background: "var(--panel)", border: "1px solid var(--rule)" }} />
                <Legend verticalAlign="top" />
                {selected.strategies.map((s) => <Line key={s.strategy} type="stepAfter" dataKey={s.strategy}
                  name={STRATEGY_LABELS[s.strategy] ?? s.strategy} stroke={STRATEGY_COLORS[s.strategy] ?? "var(--accent)"}
                  strokeWidth={2} dot={false} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" data-testid="cdf-samples">
            {selected.strategies.map((s) => <li key={s.strategy}>{STRATEGY_LABELS[s.strategy] ?? s.strategy}: {s.tasks} tasks · {s.runs} runs</li>)}
          </ul>
        </>}
      </Guard>}
  </Card>;
}
