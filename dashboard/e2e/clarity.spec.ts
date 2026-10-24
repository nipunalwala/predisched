import { expect, test } from "@playwright/test";

test("overview submits a sample and distinguishes stream from health", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Live updates connected", { exact: true })).toBeVisible();
  await expect(page.getByTestId("system-status")).toContainText("schedulers reachable");
  await expect(page.getByTestId("system-status")).toContainText("workers available");
  await expect(page.getByTestId("system-status")).toContainText("Snapshot:");
  await page.getByRole("button", { name: "Submit workload", exact: true }).click();
  await page.getByLabel("Number of tasks").fill("20");
  await page.getByRole("button", { name: "Run workload", exact: true }).click();
  await expect(page.getByText("20 tasks submitted. Follow their progress in Tasks.")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: "test-results/clarity-overview-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/clarity-overview-mobile.png", fullPage: true });
});

test("benchmark comparison uses measurements from the selected scenario and baseline", async ({ page }) => {
  await page.goto("/benchmarks");
  await expect(page.getByTestId("benchmark-comparison")).toBeVisible();
  await expect(page.getByTestId("benchmark-comparison")).toContainText("Mean latency (ms)");
  await expect(page.getByTestId("benchmark-comparison")).toContainText("n=");
  await page.getByLabel("Comparison baseline").selectOption("round_robin");
  await expect(page.getByTestId("benchmark-comparison").getByRole("columnheader", { name: "Round robin", exact: true })).toBeVisible();
  const options = await page.getByLabel("Comparison scenario").locator("option").allTextContents();
  if (options.length > 1) await page.getByLabel("Comparison scenario").selectOption(options[1]);
  await expect(page.getByTestId("benchmark-comparison")).toBeVisible();
  const source = await (await page.request.get("/api/benchmarks?limit=2000")).json();
  const suite = await page.getByLabel("suite", { exact: true }).inputValue();
  const scenario = await page.getByLabel("Comparison scenario").inputValue();
  const values = source.runs.filter((r: { scenario: string; strategy: string }) => r.scenario === `benchmark:${suite}:${scenario}` && r.strategy === "predictive")
    .map((r: { metrics: string }) => JSON.parse(r.metrics).mean_latency_ms).filter((v: unknown): v is number => typeof v === "number" && Number.isFinite(v));
  expect(values.length).toBeGreaterThan(0);
  const measuredMean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
  await expect(page.getByTestId("benchmark-comparison").getByRole("row").filter({ hasText: "Mean latency (ms)" }).locator("td").first()).toContainText(measuredMean.toFixed(2));
  await page.screenshot({ path: "test-results/clarity-benchmarks-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/clarity-benchmarks-mobile.png", fullPage: true });
});

test("demo opens with readiness checks and restores instructions without starting faults", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Demo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start demo" })).toBeVisible();
  await page.getByText("Restore nodes before another run", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Copy restore command" })).toBeVisible();
  await page.screenshot({ path: "test-results/clarity-demo-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/clarity-demo-mobile.png", fullPage: true });
});
