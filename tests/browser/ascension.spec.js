import { test, expect } from "@playwright/test";

// Ascensions (owner design, 2026-10-18): in Free Play, three Tier-3
// towers of one kind — one evolved per path — fuse into a single
// Ascended tower. Also covers the same day's battle-UI polish: the
// translucent blurred tower panel, the faded map label, and the
// pass-through placing chip.
async function enterFreePlay(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.locator("#new-profile").tap();
  await page.locator("#nickname").fill("Ascender");
  await page.locator("#profile-form button").tap();
  await expect(page.locator("#play")).toHaveText("Free Play");
  await page.locator("#play").tap();
  await page.locator('[data-freeplay="emerald"]').tap();
  await page.waitForFunction(() => window.__tinySiege?.ui.inMenu === false);
  await expect(page.locator(".map-label")).toContainText("Free Play");
}

test("three evolutions fuse into an ascended tower in free play", async ({
  page,
}) => {
  await enterFreePlay(page);
  const fused = await page.evaluate(() => {
    const { model } = window.__tinySiege;
    model.gold = 100000;
    const spots = [];
    for (let y = 70; y <= 600 && spots.length < 3; y += 26)
      for (let x = 40; x <= 920 && spots.length < 3; x += 26)
        if (
          model.canPlace("archer", x, y) === null &&
          spots.every((s) => Math.hypot(s.x - x, s.y - y) >= 60)
        )
          spots.push({ x, y });
    const towers = spots.map((s, i) => {
      const t = model.place("archer", s.x, s.y);
      t.paths = [0, 0, 0];
      t.paths[i] = 3;
      t.paths[(i + 1) % 3] = 1;
      return t;
    });
    return {
      can: model.canAscend(towers[0]),
      id: towers[0].id,
      countBefore: model.towers.length,
    };
  });
  expect(fused.can).toBe(true);
  expect(fused.countBefore).toBe(3);
  // Select the first evolution: the ASCEND button offers the fusion.
  await page.evaluate((id) => {
    window.__tinySiege.ui.selected = id;
    window.__tinySiege.ui.upgradeOpen = true;
    window.__tinySiege.ui.refresh(true);
  }, fused.id);
  await expect(page.locator("#ascend")).toBeVisible();
  await page.locator("#ascend").tap();
  await page.locator("#confirm-ascend").tap();
  const after = await page.evaluate(() => {
    const { model } = window.__tinySiege;
    const t = model.towers[0];
    return {
      count: model.towers.length,
      paths: t.paths,
      name: document.querySelector("#selection-panel .panel-title b")
        ?.textContent,
      banner: document.querySelector(".ascended-banner")?.textContent || "",
    };
  });
  expect(after.count).toBe(1);
  expect(after.paths).toEqual([3, 3, 3]);
  expect(after.name).toContain("Stormpiercer");
  expect(after.banner).toContain("ASCENDED");
});

test("battle chrome stays out of the player's way", async ({ page }) => {
  await enterFreePlay(page);
  // The map label is a watermark now: translucent green, taps pass through.
  const labelBg = await page
    .locator(".map-label")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  const alpha = Number(labelBg.match(/[\d.]+\)$/)?.[0].slice(0, -1) ?? 1);
  expect(alpha).toBeLessThan(0.6);
  // The tower panel is translucent with a backdrop blur.
  await page.evaluate(() => {
    const { model } = window.__tinySiege;
    model.gold = 5000;
    const t = model.place("archer", 190, 80);
    window.__tinySiege.ui.selected = t.id;
    window.__tinySiege.ui.upgradeOpen = true;
    window.__tinySiege.ui.refresh(true);
  });
  const panelStyle = await page
    .locator("#selection-panel")
    .evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bf: cs.backdropFilter };
    });
  expect(panelStyle.bf).toContain("blur");
  // The placing chip lets taps pass through except on its button.
  await page.evaluate(() => {
    const ui = window.__tinySiege.ui;
    ui.selected = null;
    ui.upgradeOpen = false;
    ui.placing = "cannon";
    ui.refresh(true);
  });
  const chip = await page.locator("#selection-panel.placing").evaluate((el) => {
    const cs = getComputedStyle(el);
    const cancel = el.querySelector(".cancel-button");
    return {
      pointerEvents: cs.pointerEvents,
      cancelPointerEvents: getComputedStyle(cancel).pointerEvents,
    };
  });
  expect(chip.pointerEvents).toBe("none");
  expect(chip.cancelPointerEvents).toBe("auto");
});
