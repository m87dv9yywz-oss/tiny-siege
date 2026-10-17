import { test, expect } from "@playwright/test";
async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function createProfile(page) {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill("Test Knight");
  await page.locator("#profile-form button").click();
}
async function enterFreePlay(page) {
  await page.locator("#play").click();
  await page.locator('[data-freeplay="classic"]').click();
}
async function place(page, type, x, y) {
  await page.getByRole("button", { name: new RegExp(`Buy ${type},`) }).click();
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.click(
    box.x + (x / 960) * box.width,
    box.y + (y / 640) * box.height,
  );
}
test("menu, placement, combat, upgrades, selling, pause, speed, and restart", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await expect(
    page.getByRole("button", { name: "Free Play" }),
  ).toBeVisible();
  await page.locator("#menu-help").click();
  await expect(page.getByText("Small towers.")).toBeVisible();
  await page.getByRole("button", { name: "GOT IT" }).click();
  await page.getByRole("button", { name: "Free Play" }).click();
  await page.locator('[data-freeplay="classic"]').click();
  await place(page, "Archer", 150, 170);
  await expect(page.locator("#gold")).toHaveText("300");
  await expect(page.locator("#toast")).toContainText("trail clear");
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.click(
    box.x + (145 / 960) * box.width,
    box.y + (105 / 640) * box.height,
  );
  await expect(page.locator("#gold")).toHaveText("225");
  await page
    .getByRole("button", { name: "Reinforced Arrows · 100 gold" })
    .click();
  await expect(page.locator("#gold")).toHaveText("125");
  await expect(page.locator("#selection-panel")).toContainText(
    "Armor-Piercing Bolts",
  );
  await page.locator("#battle-settings summary").click();
  await page.locator("#mute").click();
  await expect(page.locator("#mute")).toContainText("Sound on");
  await page.getByRole("button", { name: "START WAVE 1" }).click();
  await page.waitForFunction(() => window.__tinySiege.model.kills > 0);
  await page.locator("#pause").click();
  const snapshot = await page.evaluate(() =>
    JSON.stringify({
      time: window.__tinySiege.model.waveTime,
      enemies: window.__tinySiege.model.enemies,
    }),
  );
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        time: window.__tinySiege.model.waveTime,
        enemies: window.__tinySiege.model.enemies,
      }),
    ),
  ).toBe(snapshot);
  await page.locator("#pause").click();
  await page.locator("#speed").click();
  await expect(page.locator("#speed")).toContainText("2×");
  await page.waitForFunction(() => !window.__tinySiege.model.active);
  await expect(page.locator("#wave")).toHaveText("1");
  expect(await page.evaluate(() => window.__tinySiege.model.lives)).toBe(20);
  await page.locator("#battle-settings summary").click();
  await page.locator("#auto-wave").click();
  await expect(page.locator("#auto-wave")).toContainText("on");
  await page.locator("#battle-settings summary").click();
  await page.waitForFunction(() => window.__tinySiege.model.wave === 2);
  await page.locator("#battle-settings summary").click();
  await page.locator("#auto-wave").click();
  await expect(page.locator("#auto-wave")).toContainText("off");
  await page.locator("#battle-settings summary").click();
  await page.screenshot({
    path: "test-results/battlefield.png",
    fullPage: true,
  });
  await expect(page.locator("#selection-panel")).toBeVisible();
  await page.locator("#sell").click();
  await expect(page.locator("#cancel-sell")).toBeFocused();
  await page.locator("#cancel-sell").click();
  expect(
    await page.evaluate(() => window.__tinySiege.model.towers.length),
  ).toBe(1);
  await page.locator("#sell").click();
  await page.locator("#confirm-sell").click();
  expect(
    await page.evaluate(() => window.__tinySiege.model.towers.length),
  ).toBe(0);
  await page.locator("#leave-run").click();
  await page.locator("#restart").click();
  await page.locator("#confirm-restart").click();
  await expect(page.locator("#gold")).toHaveText("300");
  await expect(page.locator("#wave")).toHaveText("0");
  expect(
    await page.evaluate(() => window.__tinySiege.model.projectiles.length),
  ).toBe(0);
  expect(errors).toEqual([]);
});
test("all tower artwork, final boss, victory and defeat render without errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await enterFreePlay(page);
  await page.evaluate(() => {
    const g = window.__tinySiege.model;
    g.gold = 10000;
    [
      ["archer", 145, 105],
      ["cannon", 342, 263],
      ["frost", 473, 340],
      ["fire", 550, 240],
      ["lightning", 743, 396],
    ].forEach(([type, x, y]) => {
      const t = g.place(type, x, y);
      if (!t) throw Error(`Invalid test placement ${type}`);
      g.upgrade(t.id, 0);
      g.upgrade(t.id, 0);
      g.upgrade(t.id, 0);
    });
    g.wave = 199;
    g.startWave();
  });
  await page.evaluate(() => {
    const g = window.__tinySiege.model;
    g.update(8);
  });
  await page.waitForTimeout(300);
  await expect(page.locator("#boss-bar")).toBeVisible();
  await page.screenshot({ path: "test-results/combat.png", fullPage: true });
  await page.evaluate(() => {
    const g = window.__tinySiege.model;
    g.queue = [];
    for (const e of g.enemies) g.damage(e, 100000, true);
    g.update(0.1);
  });
  await expect(page.getByText("triumph.")).toBeVisible();
  await page.getByRole("button", { name: "PLAY AGAIN" }).click();
  await expect(page.locator("#gold")).toHaveText("300");
  await page.evaluate(() => {
    const g = window.__tinySiege.model;
    g.startWave();
    g.lives = 1;
    const e = g.spawn("basic");
    e.progress = 1e6;
    g.update(0.1);
  });
  await expect(page.getByText("defense.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "TRY AGAIN" }).click();
  await expect(page.locator("#lives")).toHaveText("20");
  expect(errors).toEqual([]);
});
test("responsive canvas and touch controls fit a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await createProfile(page);
  await page.locator("#play").tap();
  await page.locator('[data-freeplay="classic"]').tap();
  await page.getByRole("button", { name: "Buy Archer, 75 gold" }).tap();
  const box = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(
    box.x + (145 / 960) * box.width,
    box.y + (105 / 640) * box.height,
  );
  await expect(page.locator("#gold")).toHaveText("225");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
