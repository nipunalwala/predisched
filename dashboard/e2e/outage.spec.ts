import { expect, test } from "@playwright/test";

test("scheduler outage keeps worker status unknown and hides raw errors until recovery", async ({ page }) => {
  const overview = await (await page.request.get("/api/overview")).json();
  const workers = await (await page.request.get("/api/workers")).json();
  expect(workers.workers.length).toBeGreaterThan(0);
  expect(overview.cluster).not.toBeNull();
  const error = "no primary among [scheduler-1:51051, scheduler-2:51052]";
  let recovered = false;
  await page.route("**/api/overview", (route) => route.fulfill({ json: recovered ? overview : {
    ...overview, cluster: null, clusterError: error,
  } }));
  await page.route("**/api/workers", (route) => route.fulfill({ json: recovered ? workers : {
    ...workers, clusterError: error, workers: workers.workers.map((worker: object) => ({ ...worker, live: null })),
  } }));

  await page.goto("/cluster");
  await expect(page.getByText("UNKNOWN", { exact: true })).toHaveCount(workers.workers.length);
  await expect(page.getByText("Last recorded metrics", { exact: true })).toHaveCount(workers.workers.length);
  await expect(page.getByText("DEAD", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/no primary among/)).toHaveCount(0);
  await expect(page.getByTestId("pause")).toBeDisabled();
  await page.screenshot({ path: "test-results/outage-cluster-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/outage-cluster-mobile.png", fullPage: true });

  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("main").getByText("Waiting for a scheduler connection.")).toBeVisible();
  await expect(page.getByText(/no primary among/)).toHaveCount(0);
  await page.getByRole("link", { name: "Cluster", exact: true }).click();
  recovered = true;
  await expect(page.getByText("UNKNOWN", { exact: true })).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByText("HEALTHY", { exact: true })).toHaveCount(workers.workers.length);
  await expect(page.getByText("Last recorded metrics", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("leader")).toHaveText(`S${overview.cluster.leaderId}`);
});
