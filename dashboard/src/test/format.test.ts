import { expect, it } from "vitest";
import { metricLabel, metricValue } from "../format";
it("gives simulator and database measurements the same labels and units", () => {
  expect(metricLabel("meanLatencyMs")).toBe("Mean latency (ms)");
  expect(metricLabel("mean_latency_ms")).toBe("Mean latency (ms)");
  expect(metricValue(null)).toBe("–");
  expect(metricValue(NaN)).toBe("–");
  expect(metricValue(0)).toBe("0");
});
