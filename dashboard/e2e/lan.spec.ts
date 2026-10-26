import { expect, test } from "@playwright/test";

// A non-localhost hostname reproduces a LAN browser's Origin without needing another machine.
test("same-origin dashboard works through a non-localhost host and port", async ({ page, request }) => {
  const url = new URL(test.info().project.use.baseURL as string);
  if (url.hostname === "localhost") url.hostname = "127.0.0.1";
  const overview = await request.get(new URL("/api/overview", url).href, {
    headers: { Origin: url.origin },
  });
  expect(overview.status()).toBe(200);
  await page.goto(new URL("/dashboard", url).href);
  await expect(page.getByText("LIVE", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("system-status")).toContainText("schedulers reachable");
  await expect(page.getByTestId("system-status")).toContainText("3/3 workers available");
});

test("dashboard proxy still rejects an unrelated websocket origin", async ({ request }) => {
  const url = new URL(test.info().project.use.baseURL as string);
  const response = await request.get(new URL("/ws/stream", url).href, {
    headers: {
      Origin: "https://unrelated.example",
      Upgrade: "websocket",
      Connection: "Upgrade",
      "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
      "Sec-WebSocket-Version": "13",
    },
  });
  expect(response.status()).toBe(403);
});
