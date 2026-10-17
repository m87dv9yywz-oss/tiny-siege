import { test, expect } from "@playwright/test";
import { TOWERS } from "../../src/data/towers.js";

// Aura visibility: selecting a tower that empowers nearby towers (the
// Runesmith's Arcane Empowerer path) must expose which towers its aura
// covers, so the synergy is seen rather than memorized.
test("selecting a buffing Runesmith reports the towers its aura covers", async ({
  page,
}) => {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__tinySiege?.ui.inMenu === false);
  const placed = await page.evaluate(() => {
    const { model, ui } = window.__tinySiege;
    model.gold = 100000;
    const spot = (type, near) => {
      for (let x = 60; x < 930; x += 26)
        for (let y = 90; y < 610; y += 26) {
          if (near && Math.hypot(x - near.x, y - near.y) > 120) continue;
          if (!model.canPlace(type, x, y)) return { x, y };
        }
      return null;
    };
    const rp = spot("rune");
    const rune = rp && model.place("rune", rp.x, rp.y);
    if (!rune) return null;
    model.upgrade(rune.id, 0); // Arcane Empowerer tier 1: buffRange 130
    const ap = spot("archer", rp);
    const archer = ap && model.place("archer", ap.x, ap.y);
    if (!archer) return null;
    ui.selected = rune.id;
    return { rune: rune.id, archer: archer.id };
  });
  expect(placed).not.toBeNull();
  await page.waitForFunction(
    () => window.__tinySiege.game.scene.scenes[0].auraPreview?.covered?.length,
  );
  const preview = await page.evaluate(
    () => window.__tinySiege.game.scene.scenes[0].auraPreview,
  );
  expect(preview.source).toBe(placed.rune);
  expect(preview.range).toBe(130);
  expect(preview.covered).toContain(placed.archer);
  // Selecting a tower with no aura clears the preview.
  await page.evaluate((id) => (window.__tinySiege.ui.selected = id), placed.archer);
  await page.waitForFunction(
    () => window.__tinySiege.game.scene.scenes[0].auraPreview === null,
  );
});

// The same preview serves every local effect: moving the hero shows its
// family aura and washes only the towers it empowers.
test("moving the hero previews its family aura coverage", async ({ page }) => {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.evaluate(() => {
    const { profiles, kingdom } = window.__tinySiege;
    profiles.create("Herald");
    // Stripe (the tiger) empowers Archers, a starter tower — Ember's
    // Fire family is Crown-locked on a fresh profile.
    profiles.current.heroes.equipped = "tiger";
    kingdom.start("emerald");
  });
  await page.waitForFunction(() => window.__tinySiege?.ui.inMenu === false);
  const placed = await page.evaluate(() => {
    const { model, ui } = window.__tinySiege;
    model.gold = 100000;
    const hero = model.hero;
    const spot = (type, near, maxD, minD = 0) => {
      for (let x = 60; x < 930; x += 13)
        for (let y = 90; y < 610; y += 13) {
          const d = Math.hypot(x - near.x, y - near.y);
          if (d > maxD || d < minD) continue;
          if (!model.canPlace(type, x, y)) return { x, y };
        }
      return null;
    };
    const nearP = spot("archer", hero, 115);
    const near = nearP && model.place("archer", nearP.x, nearP.y);
    const wrongP = spot("cannon", hero, 115);
    const wrongFamily = wrongP && model.place("cannon", wrongP.x, wrongP.y);
    const farP = spot("archer", hero, 900, 230);
    const far = farP && model.place("archer", farP.x, farP.y);
    ui.heroMoving = true;
    return { near: near?.id, wrongFamily: wrongFamily?.id, far: far?.id };
  });
  expect(placed.near).toBeTruthy();
  await page.waitForFunction(
    () => window.__tinySiege.game.scene.scenes[0].heroAuraPreview,
  );
  const preview = await page.evaluate(
    () => window.__tinySiege.game.scene.scenes[0].heroAuraPreview,
  );
  expect(preview.range).toBe(145);
  expect(preview.covered).toContain(placed.near);
  expect(preview.covered).not.toContain(placed.wrongFamily);
  expect(preview.covered).not.toContain(placed.far);
});

// Enemy-affecting auras get ring parity: selecting a Frost tower with a
// chill aura records a chill ring alongside any buff ring.
test("selecting a Frost tower with a chill aura shows its aura ring", async ({
  page,
}) => {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__tinySiege?.ui.inMenu === false);
  const auraPath = TOWERS.frost.paths.findIndex((p) =>
    p.tiers.some((t) => t.stats.aura),
  );
  expect(auraPath).toBeGreaterThanOrEqual(0);
  const id = await page.evaluate((path) => {
    const { model, ui } = window.__tinySiege;
    model.gold = 100000;
    for (let x = 60; x < 930; x += 13)
      for (let y = 90; y < 610; y += 13)
        if (!model.canPlace("frost", x, y)) {
          const frost = model.place("frost", x, y);
          model.upgrade(frost.id, path);
          model.upgrade(frost.id, path);
          model.upgrade(frost.id, path);
          ui.selected = frost.id;
          return frost.id;
        }
    return null;
  }, auraPath);
  expect(id).toBeTruthy();
  await page.waitForFunction(() =>
    window.__tinySiege.game.scene.scenes[0].selectionRings?.some(
      (r) => r.kind === "chill",
    ),
  );
  const rings = await page.evaluate(
    () => window.__tinySiege.game.scene.scenes[0].selectionRings,
  );
  expect(rings.find((r) => r.kind === "chill").range).toBeGreaterThan(150);
});
