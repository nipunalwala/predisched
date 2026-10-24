import { useEffect, useState } from "react";
import type { Overview } from "../api/types";

export function SystemStatus({ overview }: { overview?: Overview }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const c = overview?.cluster;
  const age = c ? Math.max(0, Math.floor((now - c.atMs) / 1000)) : null;
  const stale = age === null || !Number.isFinite(age) || age > 10;
  const schedulers = c?.nodes.filter((n) => n.reachable).length ?? 0;
  const available = c?.workers.filter((w) => w.healthy && !w.draining).length ?? 0;
  const healthy = c && c.leaderId != null && schedulers === c.nodes.length && schedulers > 0 && c.workers.length > 0 && c.workers.every((w) => w.healthy);
  const label = !c ? "Cluster unavailable" : stale ? "Cluster data stale" : !healthy ? "Cluster degraded" : c.paused ? "Queue paused" : "Cluster healthy";
  return <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-rule px-4 py-2 text-xs" data-testid="system-status">
    <span className="font-semibold" style={{ color: !c ? "var(--bad)" : stale || !healthy || c.paused ? "var(--warn)" : "var(--good)" }}>{label}</span>
    {c && <>
      <span>{schedulers}/{c.nodes.length} schedulers reachable</span>
      <span>{available}/{c.workers.length} workers available</span>
      <span title={new Date(c.atMs).toLocaleString()}>Snapshot: {Number.isFinite(age) ? `${age} s ago` : "time unknown"}</span>
      <span>{c.strategy !== "predictive" ? "Predictions inactive · reactive strategy" : c.modelVersions ? "Predictions enabled · model reported" : "Predictions enabled · awaiting model response"}</span>
    </>}
    {!c && <span className="text-muted">{overview?.clusterError || "Waiting for a cluster snapshot"}</span>}
    <span className="text-muted">Stream connection is independent of cluster health.</span>
  </div>;
}
