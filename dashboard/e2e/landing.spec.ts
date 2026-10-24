import { expect, test } from "@playwright/test";

for (const [name, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]] as const) {
  test(`landing page introduces PrediSched on ${name} and opens the dashboard`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const apiRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/")) apiRequests.push(request.url());
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every task.");
    const open = page.getByRole("link", { name: "Open dashboard", exact: true }).first();
    await expect(open).toHaveAttribute("href", "/dashboard");
    await page.waitForTimeout(500);
    expect(apiRequests).toEqual([]);
    await page.screenshot({ path: `test-results/landing-${name}.png`, fullPage: true });
    await open.click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId("connection")).toContainText("LIVE", { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Cluster topology", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("connection")).toContainText("LIVE", { timeout: 15_000 });
    await page.getByRole("link", { name: "PrediSched home" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every task.");
  });
}
