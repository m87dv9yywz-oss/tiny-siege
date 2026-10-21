import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { towerMuzzle, towerVisualMuzzle } from "../../src/data/towers.js";

// Mirror-facing weapons (owner, 2026-10-20): flat-art towers whose
// drawn weapon points to one side flip horizontally so the weapon
// faces the current target, and the shot's draw start rides the
// mirrored muzzle. The logical spawn never moves. Proof tower:
// wind 0-2-1 — a radial blade fan (never flips on its own) plus a
// brass gust horn drawn pointing RIGHT (the owner's example).
// Archer 0-0-0's bow points right too. QA stills land in
// ~/workspace/ts-proof-art/qa/.
const QA = `${process.env.HOME}/workspace/ts-proof-art/qa`;
mkdirSync(QA, { recursive: true });

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function createProfile(page) {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill("Mirror Knight");
  await page.locator("#profile-form button").click();
}
async function enterFreePlay(page) {
  await page.locator("#play").click();
  await page.locator('[data-freeplay="classic"]').click();
}
async function moveEnemy(page, progress) {
  await page.evaluate((p) => {
    const { model: g } = window.__tinySiege;
    const e = g.enemies.find((e) => e.id === window.__proof.enemyId);
    e.progress = p;
    Object.assign(e, g.trails[0].onPath(e.progress));
  }, progress);
}
// Poll until the tower's base sprite shows the wanted flip with
// rotation exactly 0, then sample it holding.
async function expectFlip(page, towerId, flip, samples = 3) {
  await page.waitForFunction(
    ({ id, flip }) => {
      const s = window.__tinySiege.ui.scene.towerSprites.get(id);
      return s && s.flipX === flip && s.rotation === 0;
    },
    { id: towerId, flip },
    { timeout: 10000 },
  );
  for (let i = 0; i < samples; i++) {
    const s = await page.evaluate((id) => {
      const s = window.__tinySiege.ui.scene.towerSprites.get(id);
      return { flip: s.flipX, rotation: s.rotation };
    }, towerId);
    expect(s.flip).toBe(flip);
    expect(s.rotation).toBe(0);
    await page.waitForTimeout(150);
  }
}
// Re-pin the enemy (wind gusts knock it back along the trail), drop
// earlier shots from this tower, then wait for a fresh one fired
// under the current facing and check its draw start against the
// shipped muzzle math.
async function expectMirrorShot(page, towerId, type, paths, flip, progress) {
  await moveEnemy(page, progress);
  await page.evaluate((id) => {
    window.__proof.shots = window.__proof.shots.filter(
      (s) => s.towerId !== id,
    );
  }, towerId);
  await page.waitForFunction(
    (id) => window.__proof.shots.some((s) => s.towerId === id),
    towerId,
    { timeout: 20000 },
  );
  const got = await page.evaluate((id) => {
    const { model: g } = window.__tinySiege;
    const t = g.towers.find((t) => t.id === id);
    const s = window.__proof.shots.find((s) => s.towerId === id);
    return { shot: s, x: t.x, y: t.y };
  }, towerId);
  expect(got.shot.flip).toBe(flip);
  const probe = { type, x: got.x, y: got.y, paths, _mirrorFlip: flip };
  const want = towerVisualMuzzle(probe);
  expect(Math.abs(got.shot.x - want.x)).toBeLessThan(1.5);
  expect(Math.abs(got.shot.y - want.y)).toBeLessThan(1.5);
  // When the two muzzles are distinguishable at all, the shot must
  // sit on the wanted one, not its mirror twin. (Wind 0-2-1's
  // muzzle is its rotor hub at dx +1 — only ~3px separates the
  // pair; the horn is the visual, the hub is the emitter.)
  const canonical = towerMuzzle({ type, x: got.x, y: got.y, paths });
  if (Math.abs(want.x - canonical.x) > 3)
    expect(Math.abs(got.shot.x - want.x)).toBeLessThan(
      Math.abs(got.shot.x - canonical.x),
    );
}

test("wind horn and archer bow mirror to the target's side", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await enterFreePlay(page);

  await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    g.reset();
    g.gold = 100000;
    const wind = g.place("wind", 342, 263);
    const archer = g.place("archer", 145, 105);
    if (!wind || !archer) throw new Error("mirror placements were rejected");
    g.upgrade(wind.id, 1);
    g.upgrade(wind.id, 1);
    g.upgrade(wind.id, 2);
    if (wind.paths.join("-") !== "0-2-1")
      throw new Error(`wind ended at ${wind.paths}, wanted 0-2-1`);
    window.__proof = { windId: wind.id, archerId: archer.id, shots: [] };
    // Capture each shot's draw start and the flip that produced
    // it, synchronously at fire time (draw races to the logical
    // position within frames, so polling would miss the muzzle).
    const orig = g.attack.bind(g);
    g.attack = (t, targets, stats) => {
      const before = g.projectiles.length;
      orig(t, targets, stats);
      for (const p of g.projectiles.slice(before))
        window.__proof.shots.push({
          towerId: t.id,
          x: p.draw.x,
          y: p.draw.y,
          flip: t._mirrorFlip ?? false,
        });
    };
    // Trail positions clearly on each side of each tower, inside
    // its range and well past the 16px facing deadband.
    const trail = g.trails[0];
    const find = (t, ok) => {
      const range = g.effectiveStats(t).range;
      for (let p = 40; p < 2400; p += 5) {
        const pos = trail.onPath(p);
        if (!pos || !Number.isFinite(pos.x)) continue;
        const dx = pos.x - t.x,
          d = Math.hypot(pos.x - t.x, pos.y - t.y);
        if (d >= 55 && d <= range - 10 && ok(dx)) return p;
      }
      return null;
    };
    const phases = {
      windLeft: find(wind, (dx) => dx <= -40),
      windRight: find(wind, (dx) => dx >= 40),
      archerLeft: find(archer, (dx) => dx <= -40),
    };
    let park = null;
    for (let p = 40; p < 2400 && park === null; p += 5) {
      const pos = trail.onPath(p);
      if (!pos || !Number.isFinite(pos.x)) continue;
      const clear = [wind, archer].every(
        (t) =>
          Math.hypot(pos.x - t.x, pos.y - t.y) >
          g.effectiveStats(t).range + 30,
      );
      if (clear) park = p;
    }
    if (Object.values(phases).some((v) => v === null) || park === null)
      throw new Error(`trail scan missed a phase: ${JSON.stringify({ ...phases, park })}`);
    Object.assign(window.__proof, phases);
    const e = g.spawn("basic");
    e.progress = park;
    e.speed = 0;
    e.health = 1e12;
    e.armor = 0;
    Object.assign(e, trail.onPath(park));
    window.__proof.enemyId = e.id;
    g.startWave();
    g.queue = [];
  });
  const proof = await page.evaluate(() => window.__proof);

  // At rest (enemy parked out of range) both towers stand as-drawn.
  await page.waitForFunction(() => {
    const { ui } = window.__tinySiege;
    return (
      ui.scene.towerSprites.has(window.__proof.windId) &&
      ui.scene.towerSprites.has(window.__proof.archerId)
    );
  });
  const rest = await page.evaluate(() => {
    const { ui } = window.__tinySiege;
    return {
      wind: ui.scene.towerSprites.get(window.__proof.windId)?.flipX,
      archer: ui.scene.towerSprites.get(window.__proof.archerId)?.flipX,
    };
  });
  expect(rest.wind).toBe(false);
  expect(rest.archer).toBe(false);

  // LEFT of the wind tower: the sprite mirrors — horn points left —
  // and gusts leave from the mirrored horn-side muzzle.
  await moveEnemy(page, proof.windLeft);
  await expectFlip(page, proof.windId, true);
  await expectMirrorShot(page, proof.windId, "wind", [0, 2, 1], true, proof.windLeft);
  await page.screenshot({ path: `${QA}/mirror-wind-left.png` });

  // RIGHT of the wind tower: back to as-drawn, gusts from the
  // canonical muzzle.
  await moveEnemy(page, proof.windRight);
  await expectFlip(page, proof.windId, false);
  await expectMirrorShot(page, proof.windId, "wind", [0, 2, 1], false, proof.windRight);
  await page.screenshot({ path: `${QA}/mirror-wind-right.png` });

  // LEFT of the archer: its bow mirrors too.
  await moveEnemy(page, proof.archerLeft);
  await expectFlip(page, proof.archerId, true);
  await expectMirrorShot(page, proof.archerId, "archer", [0, 0, 0], true, proof.archerLeft);
  await page.screenshot({ path: `${QA}/mirror-archer-left.png` });

  expect(errors).toEqual([]);
});
