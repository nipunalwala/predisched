import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJson, postJson } from "../api/client";
import type { ClusterSnapshot, Overview } from "../api/types";
import { Button } from "./ui/primitives";

const RESTORE = "docker compose -f docker/docker-compose.yml up -d --no-deps scheduler-1 scheduler-2 scheduler-3 scheduler-4 scheduler-5 worker-1 worker-2 worker-3";
const STEPS = [
  { caption: "1/4 · Submitting a mixed workload: watch throughput and the queue rise.", page: "/dashboard", action: "burst", body: { tasks: 150, profile: "mixed" }, wait: 10_000 },
  { caption: "2/4 · Killing the primary scheduler: waiting for a new leader and recovery.", page: "/cluster", action: "kill-primary", body: {}, wait: 12_000 },
  { caption: "3/4 · Spiking worker CPU for 20 seconds.", page: "/cluster", action: "cpu", body: {}, wait: 10_000 },
  { caption: "4/4 · Submitting 200 bursty tasks: watch spike handling.", page: "/dashboard", action: "burst", body: { tasks: 200, profile: "bursty" }, wait: 12_000 },
];
function readiness(c?: ClusterSnapshot | null): string[] {
  if (!c) return ["Cluster snapshot unavailable"];
  const checks: string[] = [];
  if (c.leaderId == null) checks.push("No primary scheduler");
  if (c.nodes.length < 2 || c.nodes.some((n) => !n.reachable)) checks.push("Restore all schedulers before another failover demo");
  if (!c.workers.length || c.workers.some((w) => !w.healthy || w.draining)) checks.push("Restore healthy, non-draining workers");
  if (c.paused) checks.push("Resume the queue before starting");
  if (c.queueDepth || c.running) checks.push("Wait for the cluster to become idle");
  if (Date.now() - c.atMs > 10_000) checks.push("Cluster snapshot is stale");
  return checks;
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function DemoMode({ open, onClose, firstWorker }: { open: boolean; onClose: () => void; firstWorker: string }) {
  const [phase, setPhase] = useState<"checking" | "ready" | "running" | "done" | "failed">("checking");
  const [step, setStep] = useState(-1);
  const [note, setNote] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [snapshot, setSnapshot] = useState<ClusterSnapshot | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate); navigateRef.current = navigate;
  const generation = useRef(0);
  const cancel = () => { generation.current++; };
  const check = async () => {
    const token = ++generation.current;
    setPhase("checking"); setNote(""); setCopied(false);
    try {
      const { cluster } = await getJson<Overview>("/api/overview");
      if (token !== generation.current) return;
      setSnapshot(cluster); setIssues(readiness(cluster)); setPhase("ready");
    } catch (e) { if (token === generation.current) { setSnapshot(null); setIssues([(e as Error).message]); setPhase("ready"); } }
  };
  useEffect(() => {
    if (open) { setStep(-1); setResults([]); setSummary(""); void check(); }
    return cancel;
  }, [open]);

  const run = async () => {
    if (phase !== "ready" || issues.length) return;
    const token = ++generation.current;
    const stopped = () => token !== generation.current;
    setPhase("running"); setResults([]); setSummary(""); setNote("Checking readiness again…");
    let submitted = 0;
    try {
      const before = (await getJson<Overview>("/api/overview")).cluster;
      if (stopped()) return;
      const problems = readiness(before);
      if (problems.length) { setIssues(problems); setPhase("ready"); setNote(""); return; }
      const oldLeader = before!.leaderId;
      const worker = before!.workers.find((w) => w.healthy && !w.draining)?.workerId ?? firstWorker;
      for (let i = 0; i < STEPS.length; i++) {
        if (stopped()) return;
        const s = STEPS[i]; setStep(i); setNote(""); navigateRef.current(s.page);
        const result = await postJson<{ ok: boolean; message?: string }>(`/api/chaos/${s.action}`, i === 2 ? { node: worker, seconds: 20 } : s.body, true);
        if (stopped()) return;
        if (!result.ok) throw new Error(result.message || "Action refused");
        submitted += i === 0 ? 150 : i === 3 ? 200 : 0;
        setResults((r) => [...r, `${i + 1}/4 · ${i === 0 ? "150 mixed tasks submitted" : i === 1 ? "Primary crash accepted" : i === 2 ? `CPU spike accepted on ${worker}` : "200 bursty tasks submitted"}`]);
        await sleep(s.wait);
        if (stopped()) return;
        if (i === 1 || i === 3) {
          const started = Date.now(); let ready = false;
          while (!stopped() && Date.now() - started < 120_000) {
            setNote(`Waiting for ${i === 1 ? "new primary recovery" : "queue to drain"}… ${Math.floor((Date.now() - started) / 1000)} / 120 s`);
            try {
              const c = (await getJson<Overview>("/api/overview")).cluster;
              ready = !!c && c.leaderId != null && !c.paused && c.workers.some((w) => w.healthy && !w.draining)
                && (i === 1 ? c.leaderId !== oldLeader : c.queueDepth === 0 && c.running === 0);
            } catch { /* transient during failover */ }
            if (ready) break;
            await sleep(1000);
          }
          if (stopped()) return;
          if (!ready) throw new Error(i === 1 ? "Primary recovery timed out" : "Tasks still running after two minutes");
          if (i === 1) setResults((r) => [...r, "New primary ready; workload can continue"]);
        }
      }
      const after = (await getJson<Overview>("/api/overview")).cluster;
      if (stopped()) return;
      const delta = (key: "tasksCompleted" | "tasksFailed") => after && before && after[key] >= before[key] ? String(after[key] - before[key]) : "unavailable";
      setSummary(`${submitted} tasks submitted. Cluster-wide change during demo: ${delta("tasksCompleted")} completed, ${delta("tasksFailed")} failed. Includes any concurrent work; counters may reset during failover.`);
      setSnapshot(after); setNote(""); setPhase("done"); setStep(STEPS.length);
    } catch (e) {
      if (stopped()) return;
      setNote(`Step failed: ${(e as Error).message}`); setSummary(`${submitted} tasks submitted before the failure. Restore nodes and recheck readiness before retrying.`); setPhase("failed");
    }
  };
  if (!open) return null;
  return <section className="fixed bottom-4 left-1/2 z-50 max-h-[75vh] w-[min(94vw,800px)] -translate-x-1/2 overflow-auto rounded-xl border border-rule bg-panel p-4 text-ink shadow-2xl" aria-label="Demo mode" data-testid="demo-caption">
    <div className="flex items-start justify-between gap-4"><h2 className="font-semibold">{phase === "done" ? "Demo finished." : phase === "running" && step >= 0 ? STEPS[step]?.caption : "Demo readiness"}</h2>
      <Button variant="outline" size="sm" onClick={() => { generation.current++; onClose(); }}>{phase === "running" ? "Stop" : "Close"}</Button></div>
    <p className="mt-2 text-sm" role="status">{phase === "checking" ? "Checking primary, workers, queue and scheduler availability…" : note || (phase === "ready" ? issues.length ? "Not ready to run" : "Cluster ready for the demo" : "")}</p>
    {phase === "ready" && <><p className="mt-2 text-sm text-muted">Runs 350 real tasks, crashes the primary and spikes worker CPU. Stopping prevents the next action; accepted tasks and faults continue.</p><ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--warn)" }}>{issues.map((s) => <li key={s}>{s}</li>)}</ul>
      {snapshot && <p className="mt-2 text-xs text-muted">Primary S{snapshot.leaderId ?? "?"} · {snapshot.nodes.filter((n) => n.reachable).length}/{snapshot.nodes.length} schedulers reachable · {snapshot.workers.filter((w) => w.healthy && !w.draining).length}/{snapshot.workers.length} workers available</p>}
      <Button className="mt-3" disabled={issues.length > 0} onClick={run}>Start demo</Button></>}
    {!!results.length && <ol className="mt-3 space-y-1 text-xs text-muted">{results.map((r) => <li key={r}>{r}</li>)}</ol>}
    {summary && <p className="mt-3 text-sm">{summary}</p>}
    {phase !== "running" && <details className="mt-3 border-t border-rule pt-3 text-xs" open={phase === "done" || phase === "failed" || issues.length > 0}>
      <summary className="cursor-pointer font-medium">Restore nodes before another run</summary>
      <p className="mt-2 text-muted">Run from the repository folder on the Docker host. This starts stopped nodes; wait for recovery, then recheck. For a drained worker, restart that worker container separately. CPU injection expires after 20 seconds.</p>
      <code className="mt-2 block break-all rounded bg-surface p-2">{RESTORE}</code>
      <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(RESTORE); setCopied(true); } catch { setNote("Select and copy the command above."); } }}>{copied ? "Command copied" : "Copy restore command"}</Button>
        <Button size="sm" variant="outline" disabled={phase === "checking"} onClick={check}>Recheck readiness</Button></div>
    </details>}
  </section>;
}
