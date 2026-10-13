import { test, expect } from "@playwright/test";
async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
const sizes = [
  [375, 812],
  [390, 844],
  [844, 390],
  [768, 1024],
  [1024, 768],
  [1280, 720],
  [1440, 900],
];
for (const [width, height] of sizes)
  test(`polished menu, upgrades and full tree fit ${width}×${height} without scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await ready(page);
    await page.locator("#new-profile").tap();
    await page.locator("#nickname").fill("Sunny Knight");
    await page.locator("#profile-form button").tap();
    await expect(page.locator(".map-choice")).toHaveCount(4);
    await expect(page.locator(".level-state.new")).toHaveCount(4);
    expect(
      await page
        .locator(".home-card")
        .evaluate((e) => e.scrollHeight - e.clientHeight),
    ).toBeLessThanOrEqual(2);
    await page.screenshot({ path: `test-results/polish-home-${width}.png` });
    await page.locator("#play").tap();
    await page.evaluate(() => {
      const { model, ui } = window.__tinySiege;
      const t = model.place("archer", 145, 105);
      ui.selectTower(t);
      ui.openUpgrades();
    });
    const top = await page.locator(".hud").boundingBox();
    expect(top.y).toBeGreaterThanOrEqual(8);
    expect(
      await page
        .locator("#selection-panel")
        .evaluate((e) => e.scrollHeight - e.clientHeight),
    ).toBeLessThanOrEqual(2);
    const boxes = await page
      .locator("#selection-panel .path")
      .evaluateAll((nodes) =>
        nodes.map((e) => {
          const r = e.getBoundingClientRect();
          const b = e.querySelector("[data-upgrade]").getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, buttonBottom: b.bottom };
        }),
      );
    for (let i = 0; i < 3; i++) {
      expect(boxes[i].buttonBottom).toBeLessThanOrEqual(boxes[i].bottom + 1);
      if (i) expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom);
    }
    await page.locator("#start-wave").tap();
    await expect(page.locator("#selection-panel")).toBeVisible();
    await page.locator("#pause").tap();
    await expect(page.locator("#selection-panel")).toBeVisible();
    await page.locator("#pause").tap();
    await page.locator("#full-tree").tap();
    await expect(page.locator(".guide-tier")).toHaveCount(3);
    await expect(page.locator(".guide-tiers")).toContainText("65%");
    expect(
      await page
        .locator(".tree-card")
        .evaluate((e) => e.scrollHeight - e.clientHeight),
    ).toBeLessThanOrEqual(2);
    await page.locator('[data-guide-path="1"]').tap();
    await expect(page.locator(".guide-tiers")).toContainText(
      "Rapid five-arrow",
    );
    await page.screenshot({ path: `test-results/polish-tree-${width}.png` });
    await page.locator("#close-guide").tap();
    await expect(page.locator("#selection-panel")).toBeVisible();
    await page.locator("#leave-run").tap();
    await page.locator("#keep-playing").tap();
    await expect(page.locator("#selection-panel")).toBeVisible();
    await page.locator("#leave-run").tap();
    await page.locator("#confirm-leave").tap();
    await expect(page.locator(".home-card")).toBeVisible();
    expect(
      await page.evaluate(() => window.__tinySiege.model.towers.length),
    ).toBe(0);
    await page.locator("#collection").tap();
    await page.locator('[data-collection="grove"]').tap();
    await expect(page.locator('[data-unlock-tower="grove"]')).toBeDisabled();
    expect(
      await page
        .locator(".collection-card")
        .evaluate((e) => e.scrollHeight - e.clientHeight),
    ).toBeLessThanOrEqual(2);
    await page.locator('[data-collection-tree="grove"]').tap();
    await expect(page.locator(".guide-tiers")).toContainText("Thorn Sentinel");
    await page.locator('[data-guide-path="2"]').tap();
    await expect(page.locator(".guide-tiers")).toContainText("root patches");
    expect(
      await page
        .locator(".tree-card")
        .evaluate((e) => e.scrollHeight - e.clientHeight),
    ).toBeLessThanOrEqual(2);
  });
test("enemy card previews armor before spawning; preparation, ready and next-wave controls preserve the selected tower", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#play").tap();
  await page.evaluate(() => {
    const { model, ui } = window.__tinySiege;
    const t = model.place("archer", 145, 105);
    ui.selectTower(t);
    ui.openUpgrades();
    model.wave = 6;
    ui.refresh(true);
  });
  await page.locator("#start-wave").tap();
  await expect(page.locator(".enemy-introductions")).toContainText("Ironbound");
  expect(await page.evaluate(() => window.__tinySiege.model.active)).toBe(
    false,
  );
  await page.locator("#intro-back").tap();
  await expect(page.locator("#selection-panel")).toBeVisible();
  await page.locator("#start-wave").tap();
  await page.locator("#intro-ready").tap();
  await expect(page.locator("#wave")).toHaveText("7");
  await expect(page.locator("#selection-panel")).toBeVisible();
  await page.evaluate(() => {
    const { model, ui } = window.__tinySiege;
    model.active = false;
    model.queue = [];
    model.enemies = [];
    ui.refresh(true);
  });
  await page.locator("#start-wave").tap();
  await expect(page.locator(".intro-card")).toBeHidden();
  expect(await page.evaluate(() => window.__tinySiege.ui.helpOpen)).toBe(false);
  await expect(page.locator("#wave")).toHaveText("8");
});
for (const [width, height] of [
  [375, 812],
  [844, 390],
])
  test(`every future tree fits ${width}×${height}; Escape resumes the original pause state`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await ready(page);
    await page.locator("#play").click();
    for (const type of [
      "archer",
      "cannon",
      "frost",
      "fire",
      "lightning",
      "grove",
    ])
      for (let path = 0; path < 3; path++) {
        await page.evaluate(
          ({ type, path }) =>
            window.__tinySiege.ui.showTree({ type, paths: [0, 0, 0] }, path),
          { type, path },
        );
        await expect(page.locator(".guide-tier")).toHaveCount(3);
        expect(
          await page
            .locator(".tree-card")
            .evaluate((e) => e.scrollHeight - e.clientHeight),
          `${type} path ${path}`,
        ).toBeLessThanOrEqual(2);
        if (type === "grove" && path === 2)
          await page.screenshot({
            path: `test-results/grove-blueprint-${width}.png`,
          });
        await page.keyboard.press("Escape");
        await expect(page.locator("#modal")).toBeHidden();
        expect(await page.evaluate(() => window.__tinySiege.model.paused)).toBe(
          false,
        );
      }
  });
