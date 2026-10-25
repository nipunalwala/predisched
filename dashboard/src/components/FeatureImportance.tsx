import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFeatureImportance } from "../api/hooks";
import { Card, Guard, PanelState } from "./ui/primitives";

export function FeatureImportance() {
  const query = useFeatureImportance();
  const [count, setCount] = useState("15");
  return <Card title="Feature importance · execution-time model" action={
    <select aria-label="Feature count" className="h-8 rounded border border-rule bg-panel px-2 text-sm"
      value={count} onChange={(event) => setCount(event.target.value)}>
      <option value="15">Top 15 features</option><option value="all">All features</option>
    </select>}>
    <Guard query={query}>
      {(report) => {
        const features = [...report.features].sort((a, b) => b.importance - a.importance);
        const shown = count === "all" ? features : features.slice(0, 15);
        const coefficient = report.method === "absolute_standardized_coefficient";
        return !report.available || !features.length ?
          <PanelState kind="empty" message={report.message ?? "The live model does not expose feature weights."} /> : <>
            <p className="mb-1 text-sm text-muted">Live registry · M1 v{report.version} · {report.candidate}</p>
            <p className="mb-3 text-xs text-muted">{coefficient ?
              "Absolute coefficients on standardized inputs. Larger bars indicate stronger model weights, not causal effects." :
              "Feature importance from the fitted model. Larger bars indicate greater model importance, not causal effects."}</p>
            <div data-testid="feature-importance-chart" style={{ height: Math.max(220, shown.length * 30 + 45) }}
              aria-label={`Feature weights for M1 version ${report.version}`}>
              <ResponsiveContainer>
                <BarChart data={shown} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 22 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" fontSize={11} tickCount={4}
                    label={{ value: coefficient ? "Absolute coefficient" : "Importance", position: "insideBottom", offset: -12 }} />
                  <YAxis type="category" dataKey="feature" width={155} fontSize={11} interval={0}
                    tickFormatter={(value: string) => value.length > 23 ? `${value.slice(0, 21)}…` : value} />
                  <Tooltip cursor={{ fill: "var(--surface)" }}
                    labelFormatter={(_, payload) => String(payload[0]?.payload.feature ?? "")}
                    formatter={(value: number) => [value.toPrecision(7), coefficient ? "Absolute coefficient" : "Importance"]}
                    contentStyle={{ background: "var(--panel)", border: "1px solid var(--rule)" }} />
                  <Bar dataKey="importance" fill="var(--accent)" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-accent">View exact weights</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="tabular w-full text-xs" data-testid="feature-weights">
                  <thead><tr><th className="text-left">Feature</th><th className="text-right">Weight</th></tr></thead>
                  <tbody>{features.map((item) => <tr key={item.feature} className="border-b border-rule">
                    <td className="break-all py-1">{item.feature}</td>
                    <td className="text-right">{String(item.importance)}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </details>
          </>;
      }}
    </Guard>
  </Card>;
}
