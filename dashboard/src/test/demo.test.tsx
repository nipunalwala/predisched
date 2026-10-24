import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { DemoMode } from "../components/DemoMode";
import { getJson, postJson } from "../api/client";
vi.mock("../api/client", () => ({ getJson: vi.fn(), postJson: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetAllMocks(); });
const cluster = (leaderId = 5) => ({ leaderId, paused: false, atMs: Date.now(), queueDepth: 0, running: 0,
  tasksCompleted: 100, tasksFailed: 0, tasksTotal: 100,
  nodes: [{ id: 1, reachable: true }, { id: 5, reachable: true }],
  workers: [{ workerId: "worker-1", healthy: true, draining: false }] });
async function show() {
  render(<MemoryRouter><DemoMode open onClose={() => {}} firstWorker="worker-1" /></MemoryRouter>);
  await act(() => vi.advanceTimersByTimeAsync(0));
}
it("requires readiness and explicit start before any fault or workload", async () => {
  vi.useFakeTimers(); vi.mocked(getJson).mockResolvedValue({ cluster: cluster() });
  await show();
  expect(screen.getByRole("button", { name: "Start demo" })).toBeEnabled();
  expect(postJson).not.toHaveBeenCalled();
});
it("blocks a demo with no primary and provides host recovery instructions", async () => {
  vi.useFakeTimers(); vi.mocked(getJson).mockResolvedValue({ cluster: null });
  await show();
  expect(screen.getByRole("button", { name: "Start demo" })).toBeDisabled();
  expect(screen.getByText(/docker compose/)).toBeInTheDocument();
  expect(postJson).not.toHaveBeenCalled();
});
it("waits for a different primary before continuing and shows recovery progress", async () => {
  vi.useFakeTimers(); let killed = false; let recovered = false;
  vi.mocked(postJson).mockImplementation(async (path) => { if (path.endsWith("kill-primary")) killed = true; return { ok: true }; });
  vi.mocked(getJson).mockImplementation(async () => ({ cluster: killed && !recovered ? null : cluster(recovered ? 1 : 5) }));
  await show();
  fireEvent.click(screen.getByRole("button", { name: "Start demo" }));
  await act(() => vi.advanceTimersByTimeAsync(40_000));
  expect(postJson).not.toHaveBeenCalledWith("/api/chaos/cpu", expect.anything(), true);
  expect(screen.getByTestId("demo-caption")).toHaveTextContent("Waiting for");
  recovered = true;
  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(postJson).toHaveBeenCalledWith("/api/chaos/cpu", { node: "worker-1", seconds: 20 }, true);
  await act(() => vi.advanceTimersByTimeAsync(40_000));
  expect(screen.getByTestId("demo-caption")).toHaveTextContent("Demo finished.");
  expect(screen.getByTestId("demo-caption")).toHaveTextContent("350 tasks submitted");
  expect(screen.getByTestId("demo-caption")).toHaveTextContent("Cluster-wide change");
});
it("stops on a failed step and preserves the error", async () => {
  vi.useFakeTimers(); vi.mocked(getJson).mockResolvedValue({ cluster: cluster() });
  vi.mocked(postJson).mockRejectedValue(new Error("burst failed"));
  await show(); fireEvent.click(screen.getByRole("button", { name: "Start demo" }));
  await act(() => vi.advanceTimersByTimeAsync(120_000));
  expect(postJson).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("demo-caption")).toHaveTextContent("burst failed");
  expect(screen.getByTestId("demo-caption")).not.toHaveTextContent("Demo finished.");
});
