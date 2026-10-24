import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { DemoMode } from "../components/DemoMode";
import { getJson, postJson } from "../api/client";

vi.mock("../api/client", () => ({ getJson: vi.fn(), postJson: vi.fn() }));

afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetAllMocks(); });

it("waits for primary recovery before continuing after a crash", async () => {
  vi.useFakeTimers();
  let ready = false;
  vi.mocked(postJson).mockResolvedValue({ ok: true });
  vi.mocked(getJson).mockImplementation(async () => ({
    cluster: ready ? { leaderId: 3, workers: [{ healthy: true }] } : null,
  }));
  render(<MemoryRouter><DemoMode open onClose={() => {}} firstWorker="worker-1" /></MemoryRouter>);
  await act(() => vi.advanceTimersByTimeAsync(40_000));
  expect(postJson).toHaveBeenCalledWith("/api/chaos/kill-primary", {}, true);
  expect(postJson).not.toHaveBeenCalledWith("/api/chaos/cpu", expect.anything(), true);
  expect(screen.getByTestId("demo-caption")).toHaveTextContent("Waiting for");
  ready = true;
  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(postJson).toHaveBeenCalledWith("/api/chaos/cpu", { node: "worker-1", seconds: 20 }, true);
});

it("stops on a failed step and preserves the error", async () => {
  vi.useFakeTimers();
  vi.mocked(postJson).mockRejectedValue(new Error("burst failed"));
  render(<MemoryRouter><DemoMode open onClose={() => {}} firstWorker="worker-1" /></MemoryRouter>);
  await act(() => vi.advanceTimersByTimeAsync(120_000));
  expect(postJson).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("demo-caption")).toHaveTextContent("burst failed");
  expect(screen.getByTestId("demo-caption")).not.toHaveTextContent("Demo finished.");
});
