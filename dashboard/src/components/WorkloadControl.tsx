import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { postJson } from "../api/client";
import { Button } from "./ui/primitives";

export function WorkloadControl({ ready, idle }: { ready: boolean; idle: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState(20);
  const [profile, setProfile] = useState("mixed");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const client = useQueryClient();
  const submit = async (count: number, workload: string) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await postJson<{ ok: boolean; message?: string }>("/api/chaos/burst", { tasks: count, profile: workload }, true);
      if (!result.ok) throw new Error(result.message || "Submission refused");
      setMessage(`${count} tasks submitted. Follow their progress in Tasks.`);
      client.invalidateQueries({ queryKey: ["overview"] });
      client.invalidateQueries({ queryKey: ["tasks"] });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <div className="mb-4 space-y-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-medium">{!ready ? "Workload submission unavailable" : idle ? "Cluster healthy and idle" : "Submit work to the cluster"}</p>
        <p className="text-muted">{!ready ? "Needs a primary, an available worker and a running queue." : idle ? "Run a small workload to see placement decisions and queue activity." : "Submit a workload, then inspect its tasks and scheduling decisions."}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {ready && idle && <Button variant="outline" disabled={busy} onClick={() => submit(20, "mixed")}>Run 20-task sample</Button>}
        <Button disabled={!ready || busy} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{busy ? "Submitting…" : "Submit workload"}</Button>
      </div>
    </div>
    {expanded && <form className="flex flex-wrap items-end gap-3 rounded border border-rule bg-surface p-3" onSubmit={(e) => { e.preventDefault(); if (ready && !busy) submit(tasks, profile); }}>
      <label>Tasks (1–500)<input aria-label="Number of tasks" type="number" required min={1} max={500} value={tasks} onChange={(e) => setTasks(Number(e.target.value))} className="mt-1 block h-9 w-32 rounded border border-rule bg-panel px-2" /></label>
      <label>Workload profile<select value={profile} onChange={(e) => setProfile(e.target.value)} className="mt-1 block h-9 rounded border border-rule bg-panel px-2"><option value="mixed">Mixed</option><option value="bursty">Bursty</option></select></label>
      <Button type="submit" disabled={!ready || busy}>{busy ? "Submitting…" : "Run workload"}</Button>
      <p className="w-full text-xs text-muted">Submits real tasks to this cluster using your configured admin key.</p>
    </form>}
    {message && <p role="status" className="text-muted">{message}</p>}
    {error && <p role="alert" style={{ color: "var(--bad)" }}>Could not submit workload: {error}</p>}
  </div>;
}
