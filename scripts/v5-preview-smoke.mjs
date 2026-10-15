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
  mkdirSync("test-results", { recursive: true });
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
    () => document.querySelector("#game")?.getAttribute("aria-busy") === "false" && document.querySelector("#play"),
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
    scope: "/",
    size: 180,
  });
  await page.locator("#close-panel").tap();
  const reopen = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(
    reopen.x + (reopen.width * 145) / 960,
    reopen.y + (reopen.height * 60) / 640,
  );
  assert.equal(await page.locator("#selection-panel").isVisible(), true);
  const empty = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(
    empty.x + (empty.width * 60) / 960,
    empty.y + (empty.height * 80) / 640,
  );
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
  await page.locator("#begin-adventure").tap();
  assert.equal(await page.locator('[data-tower="fire"]').isDisabled(), true);
  assert.equal(await page.locator(".wave-counter em").textContent(), " / 20");
  await page.locator("#hero-move").tap();
  const heroBoard = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(
    heroBoard.x + (heroBoard.width * 340) / 960,
    heroBoard.y + (heroBoard.height * 100) / 640,
  );
  await page.waitForTimeout(2000);
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
  await page.locator("#continue-battle").tap();
  assert.equal(await page.locator("#wave").textContent(), "1");
  assert.deepEqual(errors, []);
  mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/production-smoke.png" });
  // Verify the released V5 interactions against the actual shipped app.
  for (const [width, height] of [[844,390],[390,844],[1024,768],[768,1024],[1440,900]]) {
    const live = await browser.newPage({ viewport: { width, height }, hasTouch: true });
    live.on("pageerror", e => errors.push(e.message));
    await live.goto(target.href);
    await live.waitForFunction(() => document.querySelector("#game")?.getAttribute("aria-busy") === "false");
    await live.locator("#play").tap();
    const world = async (x, y) => {
      const board = await live.locator("canvas").boundingBox();
      await live.touchscreen.tap(board.x + board.width * x / 960, board.y + board.height * y / 640);
    };
    const board = await live.locator("canvas").boundingBox();
    assert.ok(Math.abs(board.width / board.height - 1.5) < 0.01);
    if (width === 844) assert.ok(board.width >= 530, "V5 enlarged battlefield must be live");
    await live.locator('[data-tower="archer"]').tap();
    await world(145,105);
    await live.waitForFunction(() => document.querySelector("#selection-panel").dataset.side === "right");
    await live.locator('[data-upgrade="0"]').tap();
    assert.equal(await live.locator("#gold").textContent(), "125");
    assert.match(await live.locator("#selection-panel img").first().getAttribute("src"), /archer_1-0-0\.png/);
    await live.locator("#close-panel").tap();
    await live.locator('[data-tower="archer"]').tap();
    await world(820,110);
    await live.waitForFunction(() => document.querySelector("#selection-panel").dataset.side === "left");
    await live.locator("#start-wave").tap();
    assert.equal(await live.locator("#selection-panel").isVisible(), true);
    await live.locator("#pause").tap();
    await live.locator("#speed").tap();
    assert.match(await live.locator("#speed").textContent(), /2×/);
    assert.equal(await live.locator("#restart").count(), 0);
    const snapshot = async () => JSON.stringify(await live.locator("#gold, #lives, #wave, #remaining, #speed").allTextContents());
    const frozen = await snapshot();
    await live.locator("#leave-run").tap();
    await live.locator("#restart").tap();
    assert.match(await live.locator("#modal").textContent(), /Restart this battle\? Your current battle progress will be lost\./);
    await live.waitForFunction(() => document.activeElement?.id === "cancel-restart");
    assert.equal(await snapshot(), frozen);
    await live.screenshot({ path: `test-results/production-restart-${width}x${height}.png` });
    await live.locator("#cancel-restart").tap();
    assert.equal(await snapshot(), frozen);
    assert.equal(await live.locator("#selection-panel").isVisible(), true);
    await live.screenshot({ path: `test-results/production-v5-${width}x${height}.png` });
    await live.locator("#leave-run").tap();
    await live.locator("#restart").tap();
    await live.locator("#confirm-restart").tap();
    assert.equal(await live.locator("#gold").textContent(), "300");
    assert.equal(await live.locator("#wave").textContent(), "0");
    assert.equal(await live.locator("#lives").textContent(), "20");
    assert.equal(await live.locator("#restart").count(), 0);
    await live.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    `Verified V5 artwork, enlarged battlefield, adaptive panels, confirmed Menu restart and Cancel at five viewports; production icons, touch placement, paid upgrades, targeting, hero, combat, saved XP and resume at ${url}`,
  );
} catch (error) {
  const last = browser.contexts().flatMap(context => context.pages()).at(-1);
  if (last) await last.screenshot({ path: "test-results/production-failure.png" }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
