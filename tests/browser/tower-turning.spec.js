import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  layeredMuzzle,
  turretAim,
  leanAim,
  TURRET_MAX_TILT,
  LEAN_MAX_TIP,
} from "../../src/data/towers.js";
import { towerLayer } from "../../src/towerArtwork.js";

// Tower-turning proof, aim model v2 (2026-10-19): front-view tops
// never spin in-plane (the v1 full spin read as the tower "tipped
// sideways"). Turret tops (cannon, side profile) flip to the target's
// side and pitch within ±0.5 rad; crown tops (wind) lean within
// ±0.45 rad. A fired projectile's draw start rides the transformed
// emitter. QA stills land in ~/workspace/ts-proof-art/qa/.
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
// Live aim state for one layered tower: the top sprite's rotation and
// flip, plus the bearing from the top (its pivot, modulo a ≤3px
// recoil offset) to the sim's current target for that tower.
async function aimState(page, towerId) {
  return page.evaluate((id) => {
    const { model: g, ui } = window.__tinySiege;
    const t = g.towers.find((t) => t.id === id);
    const top = ui.scene.towerTops.get(id);
    if (!t || !top) return null;
    const target = g.targets(t, g.effectiveStats(t))[0];
    return {
      rotation: top.rotation,
      flip: top.flipX,
      bearing: target
        ? Math.atan2(target.y - top.y, target.x - top.x)
        : null,
    };
  }, towerId);
}
async function moveEnemy(page, progress) {
  await page.evaluate((p) => {
    const { model: g } = window.__tinySiege;
    const e = g.enemies.find((e) => e.id === window.__proof.enemyId);
    e.progress = p;
    Object.assign(e, g.trails[0].onPath(e.progress));
  }, progress);
}
// Poll until the tower's aim matches the shared model's expectation
// for the live bearing, then sample a few frames of it holding.
async function expectAim(page, towerId, mode, samples = 5) {
  const expectedFor = (bearing) =>
    mode === "turret" ? turretAim(bearing) : { tilt: leanAim(bearing) };
  await page.waitForFunction(
    ({ id, mode }) => {
      const { model: g, ui } = window.__tinySiege;
      const t = g.towers.find((t) => t.id === id);
      const top = ui.scene.towerTops.get(id);
      const target = g.targets(t, g.effectiveStats(t))[0];
      if (!top || !target) return false;
      const bearing = Math.atan2(target.y - top.y, target.x - top.x);
      let expected, flip;
      if (mode === "turret") {
        flip = Math.cos(bearing) > 0;
        const facing = flip ? 0 : Math.PI;
        let d = bearing - facing;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        expected = Math.max(-0.5, Math.min(0.5, d));
      } else {
        expected = 0.45 * Math.cos(bearing);
      }
      return (
        Math.abs(top.rotation - expected) < 0.06 &&
        (mode !== "turret" || top.flipX === flip)
      );
    },
    { id: towerId, mode },
    { timeout: 10000 },
  );
  const cap = mode === "turret" ? TURRET_MAX_TILT : LEAN_MAX_TIP;
  let last = null;
  for (let i = 0; i < samples; i++) {
    const s = await aimState(page, towerId);
    expect(s.bearing).not.toBeNull();
    const expected = expectedFor(s.bearing);
    expect(Math.abs(s.rotation)).toBeLessThanOrEqual(cap + 1e-9);
    expect(Math.abs(s.rotation - expected.tilt)).toBeLessThan(0.12);
    if (mode === "turret") expect(s.flip).toBe(expected.flip);
    last = s;
    await page.waitForTimeout(200);
  }
  return last;
}
async function expectShot(page, towerId, type, wantFlip) {
  // Drop earlier shots from this tower so the wait below only sees a
  // fresh one fired under the current aim.
  await page.evaluate((id) => {
    window.__proof.shots = window.__proof.shots.filter(
      (s) => s.towerId !== id,
    );
  }, towerId);
  await page.waitForFunction(
    (id) => window.__proof.shots.some((s) => s.towerId === id),
    towerId,
    { timeout: 15000 },
  );
  const shot = await page.evaluate((id) => {
    const { model: g } = window.__tinySiege;
    const t = g.towers.find((t) => t.id === id);
    const s = window.__proof.shots.find((s) => s.towerId === id);
    return { shot: s, x: t.x, y: t.y, paths: t.paths };
  }, towerId);
  expect(shot.shot.flip).toBe(wantFlip);
  const layer = towerLayer({ type, paths: shot.paths });
  const emitter = layeredMuzzle(
    {
      type,
      x: shot.x,
      y: shot.y,
      paths: shot.paths,
      _aimAngle: shot.shot.aim,
      _aimFlip: shot.shot.flip,
    },
    layer,
    shot.shot.aim,
    shot.shot.flip,
  );
  expect(
    Math.hypot(shot.shot.x - emitter.x, shot.shot.y - emitter.y),
  ).toBeLessThan(14);
}

test("turret tops flip + tilt and crowns lean — never tipped sideways", async ({
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
    const cannon = g.place("cannon", 342, 263);
    const archer = g.place("archer", 145, 105);
    const wind = g.place("wind", 743, 396);
    if (!cannon || !archer || !wind)
      throw new Error("proof placements were rejected");
    // Capture every shot's draw start together with the aim (tilt +
    // flip) that produced it, synchronously at fire time (the draw
    // point races toward the logical position within a few frames,
    // so polling would miss the muzzle).
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
          flip: t._aimFlip,
        });
    };
    // A pinned, effectively immortal enemy: speed 0 keeps it exactly
    // where its trail progress puts it. Find trail positions in
    // cannon range for each aim phase by their bearing from the
    // cannon's pivot (cannon 0-0-0 pivot fractions, display 96).
    const trail = g.trails[0],
      pivot = {
        x: cannon.x + (0.499 - 0.5) * 96,
        y: cannon.y + (0.57 - 0.96) * 96,
      },
      windPivot = {
        x: wind.x + (0.493 - 0.5) * 129.6,
        y: wind.y + (0.532 - 0.96) * 129.6,
      };
    const wrap = (a) => {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    };
    const find = (ok) => {
      for (let p = 40; p < 2400; p += 5) {
        const pos = trail.onPath(p);
        if (!pos || !Number.isFinite(pos.x)) continue;
        const d = Math.hypot(pos.x - cannon.x, pos.y - cannon.y);
        const bearing = Math.atan2(pos.y - pivot.y, pos.x - pivot.x);
        if (ok(pos, d, bearing)) return p;
      }
      return null;
    };
    // LEFT: clearly on the left half, elevation unsaturated so the
    // tilt must track it exactly.
    const pLeft = find(
      (pos, d, b) =>
        d >= 85 && d <= 140 && Math.cos(b) < -0.5 &&
        Math.abs(wrap(b - Math.PI)) >= 0.08 &&
        Math.abs(wrap(b - Math.PI)) <= 0.42,
    );
    // RIGHT: the trail climbs the cannon's right side — up-right
    // bearings, flip side, elevation unsaturated.
    const pRight = find(
      (pos, d, b) => d >= 85 && d <= 140 && b >= -0.42 && b <= -0.2,
    );
    // DOWN: mostly below the pivot (the v1 spin put ~2.6 rad of
    // rotation here — the "tipped sideways" shot).
    const pDown = find(
      (pos, d, b) => d >= 85 && d <= 140 && b >= 0.9 && b <= 1.3,
    );
    // WIND LEAN: in wind range with a strongly horizontal bearing
    // from the crown's pivot.
    const pWind = (() => {
      for (let p = 40; p < 2400; p += 5) {
        const pos = trail.onPath(p);
        if (!pos || !Number.isFinite(pos.x)) continue;
        const d = Math.hypot(pos.x - wind.x, pos.y - wind.y);
        if (d < 60 || d > 140) continue;
        const b = Math.atan2(pos.y - windPivot.y, pos.x - windPivot.x);
        if (Math.abs(Math.cos(b)) >= 0.75) return p;
      }
      return null;
    })();
    if (pLeft === null || pRight === null || pDown === null || pWind === null)
      throw new Error(
        `trail scan missed a phase: left=${pLeft} right=${pRight} down=${pDown} wind=${pWind}`,
      );
    Object.assign(window.__proof, { pLeft, pRight, pDown, pWind });
    // Park the enemy mid-trail, out of every tower's range, so the
    // tops start genuinely at rest; it teleports into range below.
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
  const proof = await page.evaluate(() => window.__proof);

  // The cannon's top layer loads on demand; at rest it faces left
  // with no tilt (v1 spun to the bearing — v2 must not).
  await page.waitForFunction(() => {
    const { ui } = window.__tinySiege;
    const top = ui.scene.towerTops.get(window.__proof.cannonId);
    return top?.texture.key === "v5-cannon-0-0-0-top";
  });
  const rest = await aimState(page, proof.cannonId);
  expect(rest.bearing).toBeNull();
  expect(rest.flip).toBe(false);
  expect(Math.abs(rest.rotation)).toBeLessThan(0.35);

  // LEFT: no flip, tilt tracks the (unsaturated) elevation exactly.
  await moveEnemy(page, proof.pLeft);
  const left = await expectAim(page, proof.cannonId, "turret");
  expect(left.flip).toBe(false);
  await page.screenshot({ path: `${QA}/aim-left-v2.png` });
  await expectShot(page, proof.cannonId, "cannon", false);

  // RIGHT: flipped, tilt pitches up toward the up-right bearing,
  // tracked exactly, still inside the ±0.5 clamp.
  await moveEnemy(page, proof.pRight);
  const right = await expectAim(page, proof.cannonId, "turret");
  expect(right.flip).toBe(true);
  expect(right.rotation).toBeLessThan(-0.12);
  await page.screenshot({ path: `${QA}/aim-right-v2.png` });
  await expectShot(page, proof.cannonId, "cannon", true);

  // DOWN: the bearing is mostly below the pivot; the top pitches to
  // its clamp and NO further (v1 reached ~2.6 rad here).
  await moveEnemy(page, proof.pDown);
  const down = await expectAim(page, proof.cannonId, "turret");
  expect(Math.abs(down.rotation)).toBeLessThanOrEqual(TURRET_MAX_TILT + 1e-9);
  await page.screenshot({ path: `${QA}/aim-down-v2.png` });

  // WIND: the crown leans toward the enemy's side — sign follows the
  // bearing's horizontal component, magnitude within ±0.45.
  await page.waitForFunction(() =>
    Boolean(window.__tinySiege.ui.scene.towerTops.get(window.__proof.windId)),
  );
  await moveEnemy(page, proof.pWind);
  const lean = await expectAim(page, proof.windId, "lean");
  expect(Math.sign(lean.rotation)).toBe(Math.sign(Math.cos(lean.bearing)));
  expect(Math.abs(lean.rotation)).toBeGreaterThan(0.2);

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

  // Upgrading swaps the layers to the new state (cannon 3-0-0 is a
  // turret too)...
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
