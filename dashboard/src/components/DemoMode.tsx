import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJson, postJson } from "../api/client";
import type { Overview } from "../api/types";
import { Button } from "./ui/primitives";

interface Step {
  caption: string;
  page: string;
  run: (ctx: { firstWorker: string }) => Promise<unknown>;
  waitMs: number;
}

const STEPS: Step[] = [
  { caption: "1/4 · Submitting a mixed workload: watch throughput and the queue rise.", page: "/dashboard",
    run: () => postJson("/api/chaos/burst", { tasks: 150, profile: "mixed" }, true), waitMs: 10_000 },
  { caption: "2/4 · Killing the primary scheduler: an election picks a new leader, a backup is promoted.",
    page: "/cluster", run: () => postJson("/api/chaos/kill-primary", {}, true), waitMs: 12_000 },
  { caption: "3/4 · Spiking the CPU on a worker so its overload risk climbs.", page: "/cluster",
    run: ({ firstWorker }) => postJson("/api/chaos/cpu", { node: firstWorker, seconds: 20 }, true), waitMs: 10_000 },
  { caption: "4/4 · A burst of 200 tasks: spike handling (and auto-scaling, when it is on).", page: "/dashboard",
    run: () => postJson("/api/chaos/burst", { tasks: 200, profile: "bursty" }, true), waitMs: 12_000 },
];

/**
 * Demo mode (spec §15.9): a scripted sequence driven by the real API, with on-screen captions.
 * Each step is a real admin call; the dashboard shows the effect as it happens.
 */
export function DemoMode({ open, onClose, firstWorker }: { open: boolean; onClose: () => void; firstWorker: string }) {
  const [step, setStep] = useState(-1);
  const [note, setNote] = useState("");
  const navigate = useNavigate();
  const cancelled = useRef(false);
  // useNavigate returns a new function on every route change, and the demo changes routes: read
  // both through refs so the sequence runs once per opening instead of restarting at each step.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const workerRef = useRef(firstWorker);
  workerRef.current = firstWorker;

  useEffect(() => {
    if (!open) return;
    cancelled.current = false;
    let stopped = false;
    const isStopped = () => stopped || cancelled.current;
    (async () => {
      setNote("");
      for (let i = 0; i < STEPS.length && !isStopped(); i++) {
        setStep(i);
        navigateRef.current(STEPS[i].page);
        try {
          const result = await STEPS[i].run({ firstWorker: workerRef.current });
          if (isStopped()) return;
          if (result && typeof result === "object" && "ok" in result && result.ok === false) {
            throw new Error("message" in result ? String(result.message) : "Action refused");
          }
          setNote("");
          await new Promise((r) => setTimeout(r, STEPS[i].waitMs));
          if (i === 1) {
            setNote("Waiting for the new primary to finish recovery…");
            const deadline = Date.now() + 120_000;
            let ready = false;
            while (!isStopped() && Date.now() < deadline) {
              try {
                const { cluster } = await getJson<Overview>("/api/overview");
                ready = cluster?.leaderId != null && cluster.workers.some((w) => w.healthy);
              } catch {
                // The API can briefly be unavailable during primary recovery.
              }
              if (ready) break;
              await new Promise((r) => setTimeout(r, 1000));
            }
            if (isStopped()) return;
            if (!ready) throw new Error("The new primary did not become ready within two minutes");
            setNote("");
          }
        } catch (e) {
          if (isStopped()) return;
          setNote(`(step failed: ${(e as Error).message})`);
          return;
        }
      }
      if (!isStopped()) {
        setStep(STEPS.length);
      }
    })();
    return () => {
      stopped = true;
      cancelled.current = true;
    };
  }, [open]);

  if (!open) return null;
  const caption = step < 0 ? "Starting…" : step >= STEPS.length ? "Demo finished." : STEPS[step].caption;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex w-[min(90vw,760px)] -translate-x-1/2 items-center gap-4 rounded-xl border border-rule bg-panel px-5 py-4 shadow-2xl"
      role="status" aria-live="polite" data-testid="demo-caption">
      <p className="flex-1 text-base font-medium">{caption} <span className="text-sm text-muted">{note}</span></p>
      <Button variant="outline" onClick={() => { cancelled.current = true; setStep(-1); onClose(); }}>
        {step >= STEPS.length ? "Close" : "Stop"}
      </Button>
    </div>
  );
}
