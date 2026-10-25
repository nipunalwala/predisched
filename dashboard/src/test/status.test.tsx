import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SystemStatus } from "../components/SystemStatus";
import type { Overview } from "../api/types";
afterEach(cleanup);
const snapshot = { generatedAt: new Date().toISOString(), cluster: { atMs: Date.now(), leaderId: 5, paused: false, strategy: "least_loaded", modelVersions: "", nodes: [{ reachable: true }, { reachable: false }], workers: [{ healthy: true, draining: false }, { healthy: true, draining: true }] } } as Overview;
it("separates partial health, available workers and inactive prediction", () => {
  render(<SystemStatus overview={snapshot} />);
  expect(screen.getByText("Cluster degraded")).toBeInTheDocument();
  expect(screen.getByText("1/2 schedulers reachable")).toBeInTheDocument();
  expect(screen.getByText("1/2 workers available")).toBeInTheDocument();
  expect(screen.getByText(/Predictions inactive/)).toBeInTheDocument();
});
it("does not present stale snapshots as healthy", () => {
  render(<SystemStatus overview={{ ...snapshot, cluster: { ...snapshot.cluster!, atMs: Date.now() - 60_000 } }} />);
  expect(screen.getByText("Cluster data stale")).toBeInTheDocument();
});
it("reports unavailable cluster data without zero healthy claims", () => {
  render(<SystemStatus />);
  expect(screen.getByText("Cluster unavailable")).toBeInTheDocument();
  expect(screen.queryByText(/schedulers reachable/)).not.toBeInTheDocument();
});
it("uses a calm status instead of exposing the raw cluster error", () => {
  const error = "no primary among [scheduler-1:51051, scheduler-2:51052]";
  render(<SystemStatus overview={{ ...snapshot, cluster: null, clusterError: error }} />);
  expect(screen.getByText("Waiting for a scheduler connection.")).toBeInTheDocument();
  expect(screen.queryByText(error)).not.toBeInTheDocument();
  expect(screen.getByText("Cluster unavailable")).toHaveStyle({ color: "var(--warn)" });
});
it("shows degraded when all healthy workers are draining", () => {
  render(<SystemStatus overview={{ ...snapshot, cluster: { ...snapshot.cluster!, nodes: [{ id: 5, address: "scheduler-5", leader: true, reachable: true }], workers: snapshot.cluster!.workers.map((w) => ({ ...w, draining: true })) } }} />);
  expect(screen.getByText("Cluster degraded")).toBeInTheDocument();
  expect(screen.getByText("0/2 workers available")).toBeInTheDocument();
});
