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
  target.searchParams.set("verify", process.env.GITHUB_SHA || "local-v3");
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
  await page.locator("#show-upgrades").tap();
  assert.equal(await page.locator("#selection-panel").isVisible(), true);
  await page.locator(".orientation-hint").tap();
  assert.equal(await page.locator("#selection-panel").isVisible(), false);
  const roof = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(
    roof.x + (roof.width * 145) / 960,
    roof.y + (roof.height * 60) / 640,
  );
  assert.equal(await page.locator("#selection-panel").isVisible(), true);
  await page.locator("#close-panel").tap();
  await page.locator("#speed").tap();
  await page.locator("#start-wave").tap();
  await page.waitForFunction(
    () => Number(document.querySelector("#gold").textContent) > 125,
  );
  await page.locator("#pause").tap();
  assert.match(await page.locator("#pause").textContent(), /Resume/);
  await page.locator("#pause").tap();
  // Guest progression is tested through the production DOM, never dev hooks.
  await page.locator("#leave-run").tap();
  await page.locator("#confirm-leave").tap();
  await page.locator("#new-profile").tap();
  await page.locator("#nickname").fill("Preview Knight");
  await page.locator("#profile-form button").tap();
  await page.locator('[data-map="emerald"]').tap();
  assert.equal(await page.locator('[data-tower="fire"]').isDisabled(), true);
  assert.equal(await page.locator(".wave-counter em").textContent(), " / 14");
  await page.locator('[data-tower="archer"]').tap();
  const beginner = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(
    beginner.x + (beginner.width * 145) / 960,
    beginner.y + (beginner.height * 105) / 640,
  );
  await page.locator("#close-panel").tap();
  await page.locator("#speed").tap();
  await page.locator("#start-wave").tap();
  await page.waitForFunction(() =>
    document.querySelector("#start-wave").textContent.includes("START WAVE 2"),
  );
  await page.locator("#leave-run").tap();
  await page.locator("#confirm-leave").tap();
  await page.reload();
  await page.waitForFunction(() =>
    document.querySelector(".profile-choice.chosen"),
  );
  assert.match(
    await page.locator(".profile-choice.chosen").textContent(),
    /Preview Knight/,
  );
  await page.locator("#collection").tap();
  const xp = await page
    .locator(".collection-grid section")
    .first()
    .textContent();
  assert.ok(
    Number(xp.match(/(\d+) XP available/)[1]) > 0,
    "Earned XP must survive reload",
  );
  await page.locator("#back").tap();
  await page.locator('[data-map="emerald"]').tap();
  assert.deepEqual(errors, []);
  mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/production-smoke.png" });
  console.log(
    `Verified Tiny Siege v3.1 production assets, icons, touch placement, paid upgrade, targeting, combat, pause and speed at ${url}`,
  );
} finally {
  await browser.close();
}
