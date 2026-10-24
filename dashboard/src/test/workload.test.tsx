import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkloadControl } from "../components/WorkloadControl";
import { postJson } from "../api/client";
vi.mock("../api/client", () => ({ postJson: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function show(ready = true, idle = true) {
  render(<QueryClientProvider client={new QueryClient()}><WorkloadControl ready={ready} idle={idle} /></QueryClientProvider>);
}
it("offers an idle cluster a small workload and shows accepted submission", async () => {
  vi.mocked(postJson).mockResolvedValue({ ok: true });
  show();
  expect(screen.getByText("Cluster healthy and idle")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Run 20-task sample" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("20 tasks submitted"));
  expect(postJson).toHaveBeenCalledWith("/api/chaos/burst", { tasks: 20, profile: "mixed" }, true);
});
it("blocks submission without a ready cluster", () => {
  show(false);
  expect(screen.getByRole("button", { name: "Submit workload" })).toBeDisabled();
  expect(screen.queryByText("Cluster healthy and idle")).not.toBeInTheDocument();
});
it("reports a refused workload without claiming it was submitted", async () => {
  vi.mocked(postJson).mockResolvedValue({ ok: false, message: "queue paused" });
  show();
  fireEvent.click(screen.getByRole("button", { name: "Run 20-task sample" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("queue paused"));
  expect(screen.queryByText(/20 tasks submitted/)).not.toBeInTheDocument();
});
