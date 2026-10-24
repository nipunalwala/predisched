import { expect, test } from "@playwright/test";
import { PAGES } from "./pages";

for (const [path, name] of PAGES) {
  test(`${name} tab loads without API or rendering errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/api/") && !response.ok()) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto(path);
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await page.waitForTimeout(6000);
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(errors).toEqual([]);
    if (name === "predictions") {
      await expect(page.getByTestId("registry")).toBeVisible();
      await expect(page.getByTestId("registry").getByRole("row")).toHaveCount(4);
    }
    if (name === "tasks") {
      await page.getByTestId("task-table").getByRole("button").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog").getByText("Execution time (ms)", { exact: true })).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
      expect(errors).toEqual([]);
      await page.getByRole("button", { name: "Close", exact: true }).click();
    }
    if (name === "benchmarks") {
      await expect(page.getByTestId("strategy-bars")).toBeVisible();
      await expect(page.getByTestId("run-history")).toBeVisible();
      await page.getByRole("button", { name: "Simulate at 10×" }).click();
      await expect(page.getByTestId("sim-result")).toBeVisible({ timeout: 30_000 });
      await page.getByLabel("Strategy").selectOption("predictive");
      const prediction = page.waitForResponse((response) => response.url().endsWith("/api/simulate")
        && response.request().method() === "POST");
      await page.getByRole("button", { name: "Simulate at 10×" }).click();
      const result = await (await prediction).json();
      expect(result.error).toBeUndefined();
      expect(result.metrics.meanLatencyMs).toBeGreaterThan(0);
      await expect(page.getByRole("button", { name: "Simulate at 10×" })).toBeEnabled();
      expect(errors).toEqual([]);
    }
    await page.screenshot({ path: `test-results/tab-${name}.png`, fullPage: true });
  });
}
