import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useFeatureImportance } from "../api/hooks";
import { cdfRows } from "../components/LatencyCdf";
import { FeatureImportance } from "../components/FeatureImportance";

vi.mock("../api/hooks", () => ({ useFeatureImportance: vi.fn() }));
afterEach(cleanup);

it("aligns empirical CDF steps without smoothing or mixing strategies", () => {
  const series = [
    { strategy: "predictive", runs: 1, tasks: 2, points: [{ latencyMs: 10, cumulativePct: 50 }, { latencyMs: 20, cumulativePct: 100 }] },
    { strategy: "random", runs: 1, tasks: 1, points: [{ latencyMs: 15, cumulativePct: 100 }] },
  ];
  expect(cdfRows(series)).toEqual([
    { latencyMs: 0, predictive: 0, random: 0 },
    { latencyMs: 10, predictive: 50, random: 0 },
    { latencyMs: 15, predictive: 50, random: 100 },
    { latencyMs: 20, predictive: 100, random: 100 },
  ]);
});

it("handles zero latency and missing series without inventing points", () => {
  expect(cdfRows([])).toEqual([]);
  expect(cdfRows([{ strategy: "predictive", runs: 1, tasks: 1, points: [{ latencyMs: 0, cumulativePct: 100 }] }]))
    .toEqual([{ latencyMs: 0, predictive: 100 }]);
});

it("renders actual model weights with live version and exact-value inspection", () => {
  vi.mocked(useFeatureImportance).mockReturnValue({ data: {
    available: true, source: "live-registry", model: "m1", version: 2, candidate: "linear(alpha=0.1)",
    method: "absolute_standardized_coefficient", features: [{ feature: "log_size", importance: 3.75123456789012 }],
  }, isLoading: false, error: null } as ReturnType<typeof useFeatureImportance>);
  render(<FeatureImportance />);
  expect(screen.getByText(/Live registry · M1 v2/)).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByTestId("feature-importance-chart")).toBeInTheDocument();
  fireEvent.click(screen.getByText("View exact weights"));
  expect(screen.getByText("log_size")).toBeInTheDocument();
  expect(screen.getByText("3.75123456789012")).toBeInTheDocument();
  expect(screen.getByLabelText("Feature count")).toBeInTheDocument();
});

it("explains absent importance evidence without displaying a fabricated figure", () => {
  vi.mocked(useFeatureImportance).mockReturnValue({ data: { available: false, source: "live-registry", model: "m1", features: [], message: "This model has no feature weights." },
    isLoading: false, error: null } as unknown as ReturnType<typeof useFeatureImportance>);
  render(<FeatureImportance />);
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText("This model has no feature weights.")).toBeInTheDocument();
});
