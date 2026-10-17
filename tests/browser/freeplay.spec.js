import { test, expect } from "@playwright/test";

// Free Play (replaces the old Classic button): any map, everything
// unlocked, no difficulty choice, 200 waves, no Crowns/XP — the only
// record is the furthest wave per map, and runs autosave between
// waves like adventures.
async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.locator("#new-profile").tap();
  await page.locator("#nickname").fill("Free Knight");
  await page.locator("#profile-form button").tap();
  await expect(page.locator("#play")).toHaveText("Free Play");
}

test("picker lists every map with best-wave chips; a run unlocks all towers and pays nothing", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#play").tap();
  await expect(page.locator("#modal-title")).toHaveText("Free Play");
  expect(await page.locator("[data-freeplay]").count()).toBe(13);
  await expect(page.locator('[data-freeplay="emerald"]')).toContainText(
    "NOT TRIED",
  );
  await page.locator('[data-freeplay="emerald"]').tap();
  await page.waitForFunction(() => window.__tinySiege?.ui.inMenu === false);
  const state = await page.evaluate(() => {
    const { model, kingdom } = window.__tinySiege;
    return {
      mode: model.campaign.mode,
      total: model.totalWaves,
      crowns: kingdom.store.current.crowns,
      lightning: model.available("lightning"),
      tier3: model.pathAvailable("lightning", 0, 3),
      hero: model.hero?.type,
    };
  });
  expect(state).toMatchObject({
    mode: "freeplay",
    total: 200,
    crowns: 0,
    lightning: true,
    tier3: true,
    hero: "dragon",
  });
  await expect(page.locator(".wave-counter")).toContainText("/ 200");
  // A locked-in-adventures tower can be bought in Free Play.
  await page.evaluate(() => {
    const { model, ui } = window.__tinySiege;
    model.gold = 100000;
    const t = model.place("lightning", 190, 80);
    if (!t) throw Error("lightning placement refused in free play");
    ui.cancel();
  });
  // Force the run to end in defeat on wave 7 and read the end card.
  const end = await page.evaluate(() => {
    const { model, kingdom } = window.__tinySiege;
    model.wave = 7;
    kingdom.checkpoint();
    model.lives = 0;
    model.finish("defeat");
    return {
      best: kingdom.store.current.freePlayBest.emerald,
      crowns: kingdom.store.current.crowns,
      xp: kingdom.store.current.towerXP.lightning.earned,
    };
  });
  expect(end).toEqual({ best: 7, crowns: 0, xp: 0 });
  await expect(page.locator("#modal")).toContainText("Best on this map: wave 7");
  await page.locator("#main-menu").tap();
  await expect(page.locator("#play")).toBeVisible();
  await page.locator("#play").tap();
  await expect(page.locator('[data-freeplay="emerald"]')).toContainText(
    "BEST · WAVE 7",
  );
});

test("a free play run autosaves between waves and resumes across a reload", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#play").tap();
  await page.locator('[data-freeplay="coast"]').tap();
  await page.waitForFunction(() => window.__tinySiege?.ui.inMenu === false);
  await page.evaluate(() => {
    const { model, kingdom } = window.__tinySiege;
    model.wave = 12;
    kingdom.checkpoint();
    kingdom.saveBattle();
  });
  const saved = await page.evaluate(() => {
    const entry =
      window.__tinySiege.kingdom.store.data.profiles[
        window.__tinySiege.kingdom.store.data.selected
      ];
    return {
      difficulty: entry.battle?.difficulty,
      wave: entry.battle?.wave,
      best: entry.profile.freePlayBest.coast,
    };
  });
  expect(saved).toEqual({ difficulty: "freeplay", wave: 12, best: 12 });
  await page.reload();
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await expect(page.locator("#continue-battle")).toBeVisible();
  await page.locator("#continue-battle").tap();
  await page.waitForFunction(() => window.__tinySiege?.ui.inMenu === false);
  const resumed = await page.evaluate(() => {
    const { model } = window.__tinySiege;
    return { mode: model.campaign.mode, wave: model.wave, total: model.totalWaves };
  });
  expect(resumed).toEqual({ mode: "freeplay", wave: 12, total: 200 });
});
