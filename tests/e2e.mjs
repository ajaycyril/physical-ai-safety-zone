import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = new URL("../outputs/", import.meta.url);
const screenshotPath = fileURLToPath(new URL("verification-home.png", outputDir));

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
const consoleErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(message.text());
  }
});

try {
  const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
  assert.equal(response?.ok(), true, `home route returned ${response?.status()}`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const bodyText = await page.locator("body").innerText();
  assert.match(bodyText, /Physical AI Safety Zone/);
  assert.match(bodyText, /Real-Time Webcam Safety Zone/);
  assert.match(bodyText, /Supervision/);

  assert.equal(await page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay").count(), 0);

  await page.getByRole("button", { name: "Clear zone" }).click();
  await expectText(page, "Click 3+ points");
  await page.getByRole("button", { name: "Use sample zone" }).click();
  await expectText(page, "Zone locked");

  const health = await page.evaluate(async () => {
    const result = await fetch("/api/health");
    return { status: result.status, json: await result.json() };
  });
  assert.equal(health.status, 200);
  assert.equal(health.json.ok, true);

  const eventResult = await page.evaluate(async () => {
    const posted = await fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "e2e-edge-event",
        alert: true,
        zoneCount: 1,
        maxDwellSeconds: 2.4,
        source: "e2e",
        fps: 29.7,
        trackedIds: [42],
      }),
    });
    const fetched = await fetch("/api/events", { cache: "no-store" });
    return {
      postStatus: posted.status,
      getStatus: fetched.status,
      events: (await fetched.json()).events,
    };
  });
  assert.equal(eventResult.postStatus, 201);
  assert.equal(eventResult.getStatus, 200);
  assert.equal(eventResult.events[0].id, "e2e-edge-event");

  const navTiming = await page.evaluate(() => {
    const [entry] = performance.getEntriesByType("navigation");
    return entry
      ? {
          domContentLoaded: Math.round(entry.domContentLoadedEventEnd),
          load: Math.round(entry.loadEventEnd),
          transferSize: entry.transferSize,
        }
      : null;
  });

  assert.ok(navTiming, "navigation timing was captured");
  assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join("\n")}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        screenshot: screenshotPath,
        navTiming,
        consoleErrors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

async function expectText(page, text) {
  await page.waitForFunction((expected) => document.body.innerText.includes(expected), text, {
    timeout: 3000,
  });
}
