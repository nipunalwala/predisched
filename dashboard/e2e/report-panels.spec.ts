import { expect, test } from "@playwright/test";

test("benchmark CDF renders recorded tasks and changes scenario", async ({ page }) => {
  await page.goto("/benchmarks");
  await expect(page.getByTestId("latency-cdf")).toBeVisible({ timeout: 30_000 });
  const suite = await page.getByLabel("suite", { exact: true }).inputValue();
  const response = await page.request.get(`/api/benchmarks/${suite}/latency-cdf`);
  expect(response.ok()).toBeTruthy();
  const cdf = await response.json();
  expect(cdf.scenarios.length).toBeGreaterThan(1);
  await expect(page.getByTestId("latency-cdf")).toBeVisible();
  const selector = page.getByLabel("CDF scenario");
  const selected = cdf.scenarios.find((s: { scenario: string }) => s.scenario === cdf.scenarios[1].scenario);
  await selector.selectOption(selected.scenario);
  for (const series of selected.strategies) {
    expect(series.points.at(-1).cumulativePct).toBe(100);
    await expect(page.getByTestId("cdf-samples")).toContainText(`${series.tasks} tasks · ${series.runs} runs`);
  }
  await expect(page.getByTestId("latency-cdf").locator(".recharts-line-curve")).toHaveCount(selected.strategies.length);
  await page.getByTestId("latency-cdf").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/report-cdf-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("latency-cdf")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/report-cdf-mobile.png", fullPage: true });
});

test("feature importance renders live-version numeric weights with interactive inspection", async ({ page }) => {
  await page.goto("/predictions");
  const report = await (await page.request.get("/api/models/m1/feature-importance")).json();
  expect(report.source).toBe("live-registry");
  expect(report.features.length).toBeGreaterThan(15);
  const chart = page.getByTestId("feature-importance-chart");
  const panel = page.locator("section").filter({ has: chart });
  await expect(chart).toBeVisible();
  await expect(panel.locator("img")).toHaveCount(0);
  await expect(page.getByText(/Live registry · M1/)).toContainText(`v${report.version}`);
  await expect(chart.locator(".recharts-bar-rectangle")).toHaveCount(15);
  const strongest = [...report.features].sort((a, b) => b.importance - a.importance)[0];
  await chart.locator(".recharts-bar-rectangle").first().hover();
  await expect(chart.locator(".recharts-tooltip-wrapper")).toContainText(strongest.feature);
  await page.getByLabel("Feature count").selectOption("all");
  await expect(chart.locator(".recharts-bar-rectangle")).toHaveCount(report.features.length);
  await page.getByText("View exact weights").click();
  await expect(page.getByTestId("feature-weights").locator("tbody tr")).toHaveCount(report.features.length);
  await expect(page.getByTestId("feature-weights").locator("tbody tr").first()).toContainText(String(strongest.importance));
  await page.getByLabel("Feature count").selectOption("15");
  await page.getByText("View exact weights").click();
  await panel.screenshot({ path: "test-results/report-importance-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(chart).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await panel.screenshot({ path: "test-results/report-importance-mobile.png" });
});
