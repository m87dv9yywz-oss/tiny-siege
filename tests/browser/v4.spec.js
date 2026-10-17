import { test, expect } from "@playwright/test";
async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function hero(page) {
  await page.locator("#new-profile").tap();
  await page.locator("#nickname").fill("Adventure Knight");
  await page.locator("#profile-form button").tap();
}
async function world(page, x, y) {
  const b = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(
    b.x + (b.width * x) / 960,
    b.y + (b.height * y) / 640,
  );
}
async function fit(page) {
  const b = await page.locator("canvas").boundingBox();
  expect(Math.abs(b.width / b.height - 1.5)).toBeLessThan(0.01);
  expect(b.y).toBeGreaterThanOrEqual(8);
  expect(b.y + b.height).toBeLessThan((await page.viewportSize()).height);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight + 2 &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("one tap opens upgrades and actual portrait-landscape-portrait resize preserves complete canvas, coordinates and controls", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.locator("#play").tap();
  await page.locator('[data-tower="archer"]').tap();
  await world(page, 145, 105);
  await page.locator("#close-panel").tap();
  await world(page, 145, 60);
  await expect(page.locator("#selection-panel")).toBeVisible();
  await expect(page.locator("#tower-inspector")).toBeHidden();
  await expect(page.locator("#selection-panel")).toContainText(
    "Siege Ballista",
  );
  for (const [width, height] of [
    [844, 390],
    [390, 760],
    [375, 812],
    [812, 375],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() =>
      window.dispatchEvent(new Event("orientationchange")),
    );
    await page.waitForTimeout(180);
    await fit(page);
    await page.locator("#close-panel").tap();
    await world(page, 145, 60);
    await expect(page.locator("#selection-panel")).toContainText("Archer");
    if (!(await page.locator("#start-wave").isDisabled()))
      await page.locator("#start-wave").tap();
    await expect(page.locator("#selection-panel")).toBeVisible();
    await page.locator("#pause").tap();
    await page.locator("#pause").tap();
    await page.screenshot({ path: `test-results/v4-rotation-${width}.png` });
  }
  expect(errors).toEqual([]);
});
for (const [width, height] of [
  [375, 812],
  [844, 390],
  [768, 1024],
  [1024, 768],
  [1280, 720],
])
  test(`v4 kingdom, fixed difficulties, heroes, relics and all new tower trees fit ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await ready(page);
    await hero(page);
    await expect(page.locator("[data-map]")).toHaveCount(12);
    await page.locator("#heroes").tap();
    await expect(page.locator("[data-hero]")).toHaveCount(3);
    await page.locator('[data-hero="tiger"]').tap();
    await expect(page.locator('[data-hero="tiger"]')).toContainText("Equipped");
    expect(
      await page
        .locator(".hero-card")
        .evaluate((e) => e.scrollHeight <= e.clientHeight + 2),
    ).toBe(true);
    await page.locator("#back").tap();
    await page.locator("#relics").tap();
    await expect(page.locator("[data-relic]")).toHaveCount(6);
    expect(
      await page
        .locator(".relic-card")
        .evaluate((e) => e.scrollHeight <= e.clientHeight + 2),
    ).toBe(true);
    await page.locator("#back").tap();
    await page.locator("#collection").tap();
    for (const type of ["wind", "rune"]) {
      await page.locator(`[data-collection="${type}"]`).tap();
      await page.locator(`[data-collection-tree="${type}"]`).tap();
      for (let p = 0; p < 3; p++) {
        await page.locator(`[data-guide-path="${p}"]`).tap();
        await expect(page.locator(".guide-tier")).toHaveCount(3);
        expect(await page.locator(".guide-tier dl dd").count()).toBeGreaterThan(
          0,
        );
        expect(
          await page
            .locator(".tree-card")
            .evaluate((e) => e.scrollHeight <= e.clientHeight + 2),
        ).toBe(true);
      }
      await page.locator("#close-guide").tap();
    }
    await page.locator("#back").tap();
    await page.locator('[data-map="crystal"]').tap();
    for (const [mode, count] of [
      ["easy", 20],
      ["medium", 40],
      ["hard", 100],
    ]) {
      await page.locator(`[data-difficulty="${mode}"]`).tap();
      await expect(page.locator("#begin-adventure")).toContainText(
        `${count} waves`,
      );
    }
    await page.locator('[data-difficulty="easy"]').tap();
    await page.locator("#begin-adventure").tap();
    await expect(page.locator(".wave-counter em")).toHaveText(" / 20");
    await expect(page.locator("#hero-move")).toContainText("Stripe");
    await fit(page);
    await page.screenshot({ path: `test-results/v4-crystal-${width}.png` });
  });
test("real guest combat saves a checkpoint, resumes after reload, preserves gold and hero state and avoids duplicate XP", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await hero(page);
  await page.locator('[data-map="emerald"]').tap();
  await page.locator("#begin-adventure").tap();
  await page.locator("#hero-move").tap();
  await world(page, 340, 100);
  await page.waitForTimeout(2200);
  await page.locator('[data-tower="archer"]').tap();
  await world(page, 190, 80);
  await page.locator("#close-panel").tap();
  await page.locator("#speed").tap();
  await page.locator("#start-wave").tap();
  await expect(page.locator("#start-wave")).toContainText("START WAVE 2", {
    timeout: 30000,
  });
  const state = await page.evaluate(() => ({
    gold: window.__tinySiege.model.gold,
    wave: window.__tinySiege.model.wave,
    xp: window.__tinySiege.profiles.current.towerXP.archer.earned,
  }));
  expect(state.xp).toBeGreaterThan(0);
  await page.locator("#leave-run").tap();
  await page.locator("#confirm-leave").tap();
  await expect(page.locator("#continue-battle")).toBeVisible();
  await page.reload();
  await page.locator("#continue-battle").tap();
  await expect(page.locator("#pause")).toContainText("Resume");
  expect(await page.evaluate(() => window.__tinySiege.model.gold)).toBe(
    state.gold,
  );
  expect(await page.evaluate(() => window.__tinySiege.model.wave)).toBe(1);
  await page.locator("#pause").tap();
  await page.locator("#hero-move").tap();
  await world(page, 340, 100);
  await page.waitForTimeout(1500);
  expect(
    await page.evaluate(() => window.__tinySiege.model.hero.x),
  ).toBeGreaterThan(100);
  await page.locator("#leave-run").tap();
  await page.locator("#abandon-battle").tap();
  await expect(page.locator("#continue-battle")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => window.__tinySiege.profiles.current.towerXP.archer.earned,
    ),
  ).toBe(state.xp);
});
