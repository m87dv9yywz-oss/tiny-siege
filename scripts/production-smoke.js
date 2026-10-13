// Exercise the shipped app through its visible UI, with no development hooks.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const url = process.argv[2] || "http://127.0.0.1:4173/tiny-siege/";
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_USE_BUNDLED
    ? {}
    : { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] },
);
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const target = new URL(url);
  target.searchParams.set("verify", process.env.GITHUB_SHA || "local-v2");
  const response = await page.goto(target.href);
  assert.equal(response.status(), 200);
  await page.waitForFunction(
    () => document.querySelector("canvas") && document.querySelector("#play"),
  );
  assert.equal(
    await page.evaluate(() => typeof window.__tinySiege),
    "undefined",
  );
  await page.locator("#play").tap();
  assert.equal(await page.locator("#gold").textContent(), "300");
  assert.equal(await page.locator("#lives").textContent(), "20");
  await page.locator('[data-tower="archer"]').tap();
  const b = await page.locator("canvas").boundingBox();
  assert.ok(Math.abs(b.width / b.height - 1.5) < 0.01);
  await page.touchscreen.tap(
    b.x + (b.width * 145) / 960,
    b.y + (b.height * 105) / 640,
  );
  await page.waitForFunction(
    () => document.querySelector("#gold").textContent === "225",
  );
  await page.locator('[data-upgrade="0"]').tap();
  await page.waitForFunction(
    () => document.querySelector("#gold").textContent === "125",
  );
  assert.equal(await page.locator("[data-upgrade]").count(), 3);
  await page.locator("#targeting").selectOption("WEAK");
  const art = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    return [...c.getContext("2d").getImageData(100, 100, 1, 1).data];
  });
  assert.ok(
    art[0] + art[1] + art[2] > 70,
    "Battlefield must draw, not be blank",
  );
  const icons = await page.evaluate(async () => {
    const m = await fetch(
      document.querySelector('link[rel="manifest"]').href,
    ).then((r) => r.json());
    const img = new Image();
    img.src = document.querySelector('link[rel="apple-touch-icon"]').href;
    await img.decode();
    return { display: m.display, scope: m.scope, size: img.naturalWidth };
  });
  assert.deepEqual(icons, {
    display: "standalone",
    scope: "/tiny-siege/",
    size: 180,
  });
  await page.locator("#close-panel").tap();
  await page.locator("#speed").tap();
  await page.locator("#start-wave").tap();
  await page.waitForFunction(
    () => Number(document.querySelector("#gold").textContent) > 125,
  );
  await page.locator("#pause").tap();
  assert.match(await page.locator("#pause").textContent(), /Resume/);
  await page.locator("#pause").tap();
  assert.deepEqual(errors, []);
  mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/production-smoke.png" });
  console.log(
    `Verified Tiny Siege v2 production assets, icons, touch placement, paid upgrade, targeting, combat, pause and speed at ${url}`,
  );
} finally {
  await browser.close();
}
