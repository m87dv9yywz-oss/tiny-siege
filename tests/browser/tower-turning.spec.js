import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { layeredMuzzle } from "../../src/data/towers.js";
import { towerLayer } from "../../src/towerArtwork.js";

// Tower-turning proof (2026-10-19): layered states render a separate
// TOP sprite that rotates to aim at the tower's current target, and a
// fired projectile's draw start rides the rotated emitter. QA stills
// land in ~/workspace/ts-proof-art/qa/ for the owner's eyes.
const QA = `${process.env.HOME}/workspace/ts-proof-art/qa`;
mkdirSync(QA, { recursive: true });

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function createProfile(page) {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill("Turning Knight");
  await page.locator("#profile-form button").click();
}
async function enterFreePlay(page) {
  await page.locator("#play").click();
  await page.locator('[data-freeplay="classic"]').click();
}
const wrappedDiff = (a, b) => {
  let d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
};
// Live convergence probe: the scene's own target for the cannon vs the
// top sprite's actual rotation, measured off the sprite's position
// (the pivot, modulo a ≤3px recoil offset).
async function aimSample(page) {
  return page.evaluate(() => {
    const { model: g, ui } = window.__tinySiege;
    const t = g.towers.find((t) => t.id === window.__proof.cannonId);
    const top = ui.scene.towerTops.get(t.id);
    if (!top) return null;
    const target = g.targets(t, g.effectiveStats(t))[0];
    if (!target) return { rotation: top.rotation, expected: null };
    return {
      rotation: top.rotation,
      expected:
        Math.atan2(target.y - top.y, target.x - top.x) + Math.PI / 2,
    };
  });
}

test("layered cannon aims its top at the current target; unlayered towers render as before", async ({
  page,
}) => {
  test.setTimeout(120000);
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
    const cannon = g.place("cannon", 342, 263);
    const archer = g.place("archer", 145, 105);
    const wind = g.place("wind", 743, 396);
    if (!cannon || !archer || !wind)
      throw new Error("proof placements were rejected");
    // Capture every shot's draw start together with the aim that
    // produced it, synchronously at fire time (the draw point races
    // toward the logical position within a few frames, so polling
    // would miss the muzzle).
    window.__proof = {
      cannonId: cannon.id,
      archerId: archer.id,
      windId: wind.id,
      shots: [],
    };
    const orig = g.attack.bind(g);
    g.attack = (t, targets, stats) => {
      const before = g.projectiles.length;
      orig(t, targets, stats);
      for (const p of g.projectiles.slice(before))
        window.__proof.shots.push({
          towerId: t.id,
          x: p.draw.x,
          y: p.draw.y,
          aim: t._aimAngle,
        });
    };
    // A pinned, effectively immortal enemy: speed 0 keeps it exactly
    // where its trail progress puts it. Find two trail positions in
    // cannon range whose bearings are far apart (aim left, aim down).
    const trail = g.trails[0],
      pivot = { x: cannon.x - 0.2, y: cannon.y - 38 };
    const find = (lo, hi) => {
      for (let p = 40; p < 2000; p += 5) {
        const pos = trail.onPath(p);
        const d = Math.hypot(pos.x - cannon.x, pos.y - cannon.y);
        if (d < 85 || d > 140) continue;
        const rot =
          Math.atan2(pos.y - pivot.y, pos.x - pivot.x) + Math.PI / 2;
        if (rot >= lo && rot <= hi) return p;
      }
      return null;
    };
    const pLeft = find(-1.5, -1.2),
      pDown = find(2.58, 2.66);
    if (pLeft === null || pDown === null)
      throw new Error("no trail positions for the two bearings");
    window.__proof.pLeft = pLeft;
    window.__proof.pDown = pDown;
    // Park the enemy mid-trail, out of every tower's range, so the
    // top starts genuinely at rest; it teleports into range below.
    const e = g.spawn("basic");
    e.progress = 1380;
    e.speed = 0;
    e.health = 1e12;
    e.armor = 0;
    Object.assign(e, trail.onPath(1380));
    if (g.targets(cannon, g.effectiveStats(cannon)).length)
      throw new Error("parked enemy is already in cannon range");
    window.__proof.enemyId = e.id;
    g.startWave();
    g.queue = [];
  });

  // The cannon's top layer loads on demand; at rest it points up.
  await page.waitForFunction(() => {
    const { model: g, ui } = window.__tinySiege;
    const top = ui.scene.towerTops.get(window.__proof.cannonId);
    return top?.texture.key === "v5-cannon-0-0-0-top";
  });
  const rest = await aimSample(page);
  expect(rest.expected).toBeNull();
  expect(Math.abs(rest.rotation)).toBeLessThan(0.35);
  await page.screenshot({ path: `${QA}/aim-up.png` });

  // Teleport the enemy into range on the left bearing.
  await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    const e = g.enemies.find((e) => e.id === window.__proof.enemyId);
    e.progress = window.__proof.pLeft;
    Object.assign(e, g.trails[0].onPath(e.progress));
  });

  // Convergence, sampled over ~1s: every sample within 0.35 rad of
  // the live bearing to the sim's current target.
  await page.waitForFunction(
    () => {
      const { model: g, ui } = window.__tinySiege;
      const t = g.towers.find((t) => t.id === window.__proof.cannonId);
      const top = ui.scene.towerTops.get(t.id);
      const target = g.targets(t, g.effectiveStats(t))[0];
      if (!top || !target) return false;
      const expected =
        Math.atan2(target.y - top.y, target.x - top.x) + Math.PI / 2;
      let d = Math.abs(expected - top.rotation) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d < 0.1;
    },
    null,
    { timeout: 10000 },
  );
  let bearing1 = 0;
  for (let i = 0; i < 5; i++) {
    const s = await aimSample(page);
    expect(s.expected).not.toBeNull();
    expect(wrappedDiff(s.rotation, s.expected)).toBeLessThan(0.35);
    bearing1 = s.rotation;
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: `${QA}/aim-left.png` });

  // A fired shell's draw start is the rotated emitter point.
  await page.waitForFunction(
    () => window.__proof.shots.some((s) => s.towerId === window.__proof.cannonId),
    null,
    { timeout: 10000 },
  );
  const shot = await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    const t = g.towers.find((t) => t.id === window.__proof.cannonId);
    const s = window.__proof.shots.find(
      (s) => s.towerId === window.__proof.cannonId,
    );
    return { shot: s, x: t.x, y: t.y, paths: t.paths };
  });
  const layer = towerLayer({ type: "cannon", paths: shot.paths });
  const emitter = layeredMuzzle(
    { type: "cannon", x: shot.x, y: shot.y, paths: shot.paths, _aimAngle: shot.shot.aim },
    layer,
    shot.shot.aim,
  );
  expect(
    Math.hypot(shot.shot.x - emitter.x, shot.shot.y - emitter.y),
  ).toBeLessThan(14);

  // Swing to the second bearing and converge again.
  await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    const e = g.enemies.find((e) => e.id === window.__proof.enemyId);
    e.progress = window.__proof.pDown;
    Object.assign(e, g.trails[0].onPath(e.progress));
  });
  await page.waitForFunction(
    (previous) => {
      const { model: g, ui } = window.__tinySiege;
      const t = g.towers.find((t) => t.id === window.__proof.cannonId);
      const top = ui.scene.towerTops.get(t.id);
      const target = g.targets(t, g.effectiveStats(t))[0];
      if (!top || !target) return false;
      const expected =
        Math.atan2(target.y - top.y, target.x - top.x) + Math.PI / 2;
      let d = Math.abs(expected - top.rotation) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d < 0.1 && Math.abs(top.rotation - previous) > 1.2;
    },
    bearing1,
    { timeout: 10000 },
  );
  await page.screenshot({ path: `${QA}/aim-down.png` });

  // The archer never grows a top layer and renders exactly as before.
  const archer = await page.evaluate(() => {
    const { model: g, ui } = window.__tinySiege;
    const t = g.towers.find((t) => t.id === window.__proof.archerId);
    return {
      top: ui.scene.towerTops.has(t.id),
      glow: ui.scene.towerGlows.has(t.id),
      key: ui.scene.towerSprites.get(t.id)?.texture.key,
    };
  });
  expect(archer.top).toBe(false);
  expect(archer.glow).toBe(false);
  expect(archer.key).toBe("v5-archer-0-0-0");

  // Upgrading swaps the layers to the new state (cannon 3-0-0 is
  // layered too)...
  await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    const t = g.towers.find((t) => t.id === window.__proof.cannonId);
    for (let i = 0; i < 3; i++) g.upgrade(t.id, 0);
  });
  await page.waitForFunction(() => {
    const { ui } = window.__tinySiege;
    return (
      ui.scene.towerTops.get(window.__proof.cannonId)?.texture.key ===
      "v5-cannon-3-0-0-top"
    );
  });
  // ...and upgrading OUT of a layered state removes them (wind
  // 1-0-0 has no layers).
  await page.waitForFunction(() =>
    Boolean(
      window.__tinySiege.ui.scene.towerTops.get(window.__proof.windId),
    ),
  );
  await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    const t = g.towers.find((t) => t.id === window.__proof.windId);
    g.upgrade(t.id, 0);
  });
  await page.waitForFunction(() => {
    const { ui } = window.__tinySiege;
    return (
      !ui.scene.towerTops.has(window.__proof.windId) &&
      ui.scene.towerSprites.get(window.__proof.windId)?.texture.key ===
        "v5-wind-1-0-0"
    );
  });
  expect(errors).toEqual([]);
});
