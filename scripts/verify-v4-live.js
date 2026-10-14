// Read-only live-site verification. Fixtures are isolated local guest saves;
// this script never signs in or writes production Firestore documents.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { freshProfile } from "../src/progression/profiles.js";

const url = process.argv[2] || "https://m87dv9yywz-oss.github.io/tiny-siege/";
const expectedHTML = readFileSync("dist/index.html", "utf8");
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_USE_BUNDLED
    ? {}
    : { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] },
);
const results = [];
mkdirSync("test-results", { recursive: true });
const legacy = freshProfile("Returning Knight");
legacy.schemaVersion = 2;
delete legacy.heroes;
delete legacy.relics;
delete legacy.mapProgress;
for (const type of ["wind", "rune"]) {
  delete legacy.towerXP[type];
  delete legacy.unlockedUpgrades[type];
}
legacy.crowns = 500;
legacy.unlockedTowers = [
  "archer",
  "cannon",
  "frost",
  "fire",
  "lightning",
  "grove",
];
legacy.towerXP.archer = { earned: 800, spent: 680 };
legacy.unlockedUpgrades.archer = [3, 1, 1];
legacy.completedMaps = ["emerald", "amber", "garden"];
legacy.mapStars = { emerald: 3, amber: 2, garden: 3 };
legacy.statistics.wins = 3;
legacy.statistics.ledger = "|legacy-live-clear|";
const storageKey = "tiny-siege-profiles-v3";
const fixture = {
  version: 1,
  selected: "legacy-live",
  cloud: {},
  profiles: { "legacy-live": { profile: legacy, pending: [], owner: null } },
};
const world = async (page, x, y) => {
  const b = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(
    b.x + (b.width * x) / 960,
    b.y + (b.height * y) / 640,
  );
};
async function fitted(page) {
  const b = await page.locator("canvas").boundingBox(),
    size = page.viewportSize();
  assert(Math.abs(b.width / b.height - 1.5) < 0.01);
  assert(b.y >= 0 && b.y + b.height <= size.height + 1);
  assert(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight + 2 &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
try {
  const probe = await browser.newPage();
  let published = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await probe.request.get(url + "?verify=" + Date.now());
    if (response.status() === 200 && (await response.text()) === expectedHTML) {
      published = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  assert(
    published,
    "Live HTML/module fingerprints must match the reviewed v4 production build",
  );
  await probe.close();
  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [844, 390],
    [768, 1024],
    [1024, 768],
    [1280, 720],
    [1440, 900],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: true,
    });
    await context.addInitScript(
      ({ key, data }) => {
        if (!localStorage.getItem(key))
          localStorage.setItem(key, JSON.stringify(data));
      },
      { key: storageKey, data: fixture },
    );
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url + "?v4verify=" + Date.now());
    await page.waitForSelector(".profile-choice.chosen");
    assert.equal(
      await page.evaluate(() => typeof window.__tinySiege),
      "undefined",
    );
    assert.equal(await page.locator("[data-map]").count(), 6);
    const migrated = await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key)).profiles["legacy-live"].profile,
      storageKey,
    );
    // The original disk save stays intact until a legitimate save operation.
    assert.equal(migrated.schemaVersion, 2);
    assert.equal(migrated.crowns, 500);
    assert.deepEqual(migrated.towerXP.archer, legacy.towerXP.archer);
    assert.deepEqual(migrated.mapStars, legacy.mapStars);
    assert.equal(migrated.statistics.ledger, legacy.statistics.ledger);
    await page.locator("#collection").tap();
    for (const type of ["wind", "rune"]) {
      await page.locator(`[data-collection="${type}"]`).tap();
      await page.locator(`[data-unlock-tower="${type}"]`).tap();
      await page.locator(`[data-collection-tree="${type}"]`).tap();
      for (let path = 0; path < 3; path++) {
        await page.locator(`[data-guide-path="${path}"]`).tap();
        assert.equal(await page.locator(".guide-tier").count(), 3);
        assert((await page.locator(".guide-tier dl dd").count()) > 0);
      }
      await page.locator("#close-guide").tap();
    }
    const persisted = await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key)).profiles["legacy-live"].profile,
      storageKey,
    );
    assert.equal(persisted.schemaVersion, 3);
    assert.equal(persisted.crowns, 290);
    assert.deepEqual(persisted.towerXP.archer, legacy.towerXP.archer);
    assert.deepEqual(persisted.mapStars, legacy.mapStars);
    assert(persisted.statistics.ledger.includes("|legacy-live-clear|"));
    await page.locator("#back").tap();
    await page.locator("#heroes").tap();
    assert.equal(await page.locator("[data-hero]").count(), 3);
    await page
      .locator(".hero-card img")
      .evaluateAll((images) =>
        Promise.all(images.map((image) => image.decode())),
      );
    await page.locator('[data-hero="dinosaur"]').tap();
    assert.match(
      await page.locator('[data-hero="dinosaur"]').textContent(),
      /Equipped/,
    );
    await page.locator("#back").tap();
    await page.locator("#relics").tap();
    assert.equal(await page.locator("[data-relic]").count(), 6);
    await page.locator('[data-relic="purse"]').tap();
    await page.locator('[data-relic="banner"]').tap();
    await page.locator("#back").tap();
    for (const map of ["crystal", "coast"]) {
      await page.locator(`[data-map="${map}"]`).tap();
      for (const [mode, waves] of [
        ["easy", 20],
        ["medium", 40],
        ["hard", 100],
      ]) {
        await page.locator(`[data-difficulty="${mode}"]`).tap();
        assert.match(
          await page.locator("#begin-adventure").textContent(),
          new RegExp(`${waves} waves`),
        );
      }
      await page.locator('[data-difficulty="easy"]').tap();
      await page.locator("#begin-adventure").tap();
      assert.match(await page.locator("#hero-move").textContent(), /Rex/);
      assert.equal(await page.locator("#gold").textContent(), "325");
      await fitted(page);
      await page.screenshot({
        path: `test-results/live-v4-${map}-${width}.png`,
      });
      await page.locator("#leave-run").tap();
      await page.locator("#abandon-battle").tap();
    }
    await page.locator('[data-map="crystal"]').tap();
    await page.locator("#begin-adventure").tap();
    await page.locator('[data-tower="wind"]').tap();
    await world(page, 600, 100);
    await page.locator("#close-panel").tap();
    await page.locator('[data-tower="rune"]').tap();
    await world(page, 680, 100);
    assert.equal(await page.locator("#gold").textContent(), "5");
    await page.locator("#close-panel").tap();
    await world(page, 600, 65);
    assert(await page.locator("#selection-panel").isVisible());
    await page.locator("#full-tree").tap();
    await page.locator("#close-guide").tap();
    await page.locator("#close-panel").tap();
    for (const [w, h] of [
      [844, 390],
      [390, 844],
      [width, height],
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await page.evaluate(() =>
        window.dispatchEvent(new Event("orientationchange")),
      );
      await page.waitForTimeout(250);
      await fitted(page);
    }
    await page.locator("#leave-run").tap();
    await page.locator("#confirm-leave").tap();
    await page.reload();
    await page.locator("#continue-battle").tap();
    assert.equal(await page.locator("#gold").textContent(), "5");
    assert.match(await page.locator("#pause").textContent(), /Resume/);
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).profiles["legacy-live"],
      storageKey,
    );
    assert.equal(saved.profile.crowns, 250);
    assert(
      saved.profile.unlockedTowers.includes("wind") &&
        saved.profile.unlockedTowers.includes("rune"),
    );
    assert.equal(saved.battle.towers.length, 2);
    assert.equal(saved.battle.hero.type, "dinosaur");
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      version: "4.0.0",
      legacyMigration: true,
      newTowerPurchases: true,
      heroes: true,
      relics: true,
      newMaps: true,
      fixedModes: true,
      rotation: true,
      resume: true,
    });
    console.log(`Live v4 checks passed at ${width}x${height}`);
    await context.close();
  }
  writeFileSync(
    "test-results/live-v4-results.json",
    JSON.stringify(
      {
        expectedCommit: process.env.EXPECTED_PRODUCTION_SHA,
        htmlFingerprintMatched: true,
        cloudWrites: false,
        physicalSafari: false,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    "Verified live Tiny Siege v4.0 across seven viewports, legacy migration, Crown unlocks, XP retention, new tower trees/maps/heroes/relics, actual resizing and resumed purchases. No production cloud writes.",
  );
} finally {
  await browser.close();
}
