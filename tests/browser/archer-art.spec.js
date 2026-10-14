import { test, expect } from "@playwright/test";
import { ARCHER_STATES } from "../../src/towerArtwork.js";
test("all 16 illustrated states, immediate paid upgrade changes, Tier3 fallbacks and touch selection at iPhone landscape size", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = [],
    failed = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/v5/") && r.status() !== 200)
      failed.push(r.url());
  });
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.locator("#play").click();
  for (const state of ARCHER_STATES) {
    await page.evaluate(() => {
      const { model: g, ui } = window.__tinySiege;
      g.reset();
      g.gold = 5000;
      ui.selectTower(g.place("archer", 145, 105));
    });
    const paths = state.split("-").map(Number);
    for (let p = 0; p < 3; p++)
      for (let n = 0; n < paths[p]; n++)
        await page.locator(`[data-upgrade="${p}"]`).click();
    await expect(page.locator(".tower-portrait")).toHaveAttribute(
      "src",
      new RegExp(`archer_${state}\\.png$`),
    );
    await page.waitForFunction((state) => {
      const { model, ui } = window.__tinySiege;
      return (
        ui.scene.towerSprites.get(model.towers[0].id)?.texture.key ===
        "v5-archer-" + state
      );
    }, state);
    const size = await page.evaluate(() => {
      const { model, ui } = window.__tinySiege;
      const s = ui.scene.towerSprites.get(model.towers[0].id);
      return {
        w: s.displayWidth,
        h: s.displayHeight,
        ox: s.originX,
        oy: s.originY,
      };
    });
    expect(size).toEqual({ w: 80, h: 80, ox: 0.5, oy: 0.96 });
    await page.locator("#close-panel").click();
    const r = await page.locator("canvas").boundingBox();
    await page.touchscreen.tap(
      r.x + (r.width * 145) / 960,
      r.y + (r.height * 65) / 640,
    );
    await expect(page.locator("#selection-panel")).toBeVisible();
    await page.screenshot({
      path: `docs/artwork/archer-prototype/after-${state}-landscape.png`,
    });
  }
  for (const p of [0, 1, 2])
    for (const secondary of [-1, ...[0, 1, 2].filter((n) => n !== p)]) {
      await page.evaluate(() => {
        const { model: g, ui } = window.__tinySiege;
        g.reset();
        g.gold = 5000;
        ui.selectTower(g.place("archer", 145, 105));
      });
      for (let n = 0; n < 3; n++)
        await page.locator(`[data-upgrade="${p}"]`).click();
      if (secondary >= 0)
        await page.locator(`[data-upgrade="${secondary}"]`).click();
      const expected = [0, 0, 0];
      expected[p] = 2;
      if (secondary >= 0) expected[secondary] = 1;
      await expect(page.locator(".tower-portrait")).toHaveAttribute(
        "src",
        new RegExp(`archer_${expected.join("-")}\\.png$`),
      );
      expect(
        await page.evaluate(() =>
          window.__tinySiege.model.towers[0].paths.includes(3),
        ),
      ).toBe(true);
    }
  const recoil = await page.evaluate(async () => {
    const { model, ui } = window.__tinySiege;
    const tower = model.towers[0];
    const sprite = ui.scene.towerSprites.get(tower.id);
    ui.scene.effect({ type: "attack", tower });
    const widths = [];
    for (let i = 0; i < 20; i++) {
      await new Promise(requestAnimationFrame);
      widths.push(sprite.displayWidth);
    }
    return { maximum: Math.max(...widths), end: sprite.displayWidth };
  });
  expect(recoil.maximum).toBeLessThanOrEqual(88.1);
  expect(recoil.end).toBeCloseTo(80, 1);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
