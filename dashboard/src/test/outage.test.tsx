import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import type { Overview, WorkersResponse } from "../api/types";
import { TopBar } from "../components/TopBar";
import { ClusterPage } from "../pages/Cluster";
import { OverviewPage } from "../pages/Overview";

const error = "no primary among [scheduler-1:51051, scheduler-2:51052]";
const state = vi.hoisted(() => ({ workers: { workers: [], clusterError: null } as WorkersResponse }));
vi.mock("../api/hooks", () => ({
  useWorkers: () => ({ data: state.workers, isLoading: false, error: null }),
  useTasks: () => ({ data: { tasks: [] }, isLoading: false, error: null }),
  useClocks: () => ({ data: { nodes: [] }, isLoading: false, error: null }),
  useReplication: () => ({ data: { replicas: [] }, isLoading: false, error: null }),
  useOverview: () => ({ data: { cluster: null, clusterError: "no primary among [scheduler-1:51051]",
    kpis: { tasksPerSecond: 0 } }, isLoading: false, error: null }),
  useQueueForecast: () => ({ data: { actual: [], predicted: [] }, isLoading: false, error: null }),
}));
afterEach(cleanup);

it("keeps workers unknown through an election and restores healthy status on recovery", () => {
  const stored = { worker_id: "worker-1", cpu_pct: 67, mem_pct: 5 };
  state.workers = { workers: [{ ...stored, live: null }], clusterError: error };
  const view = render(<ClusterPage />);
  expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  expect(screen.getByText(/Worker status is temporarily unavailable/)).toBeInTheDocument();
  expect(screen.queryByText("DEAD")).not.toBeInTheDocument();
  expect(screen.queryByText(error)).not.toBeInTheDocument();

  state.workers = { workers: [{ ...stored, live: { workerId: "worker-1", host: "worker-1", port: 51061,
    healthy: true, draining: false, poolSize: 2, activeThreads: 0, queueLen: 0 } }], clusterError: null };
  view.rerender(<ClusterPage />);
  expect(screen.getByText("HEALTHY")).toBeInTheDocument();
  expect(screen.queryByText("UNKNOWN")).not.toBeInTheDocument();
  expect(screen.queryByText(/Worker status is temporarily unavailable/)).not.toBeInTheDocument();
});

it("does not expose scheduler errors in the header", () => {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>
    <TopBar overview={{ cluster: null, clusterError: error } as Overview} onDemo={() => {}} />
  </MemoryRouter></QueryClientProvider>);
  expect(screen.queryByText(/no primary among/)).not.toBeInTheDocument();
  expect(screen.getByText("Waiting for a scheduler connection.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /PAUSE QUEUE/ })).toBeDisabled();
});

it("shows a waiting state instead of a raw error on Overview during an election", () => {
  render(<OverviewPage />);
  expect(screen.queryByText(/no primary among/)).not.toBeInTheDocument();
  expect(screen.getByText("Waiting for a scheduler connection.")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
