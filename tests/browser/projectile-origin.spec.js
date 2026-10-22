import { test, expect } from "@playwright/test";
import {
  layeredMuzzle,
  mirrorFlipFor,
  poseForBearing,
  towerDisplaySize,
  towerVisualMuzzle,
} from "../../src/data/towers.js";
import { towerLayer } from "../../src/towerArtwork.js";

// PROJECTILE-ORIGIN REGRESSION (2026-10-21 fix).
// The per-type *-muzzles specs sample `draw` INSIDE the attack call,
// where it always equals the declared muzzle by construction — they
// structurally cannot catch the bug the owner saw on his phone:
// Game.step dragged `draw` toward the logical position in the same
// substep that spawned it (at 4x, three substeps run before the
// first render), so no rendered frame ever showed a shot at its
// weapon. This spec samples the RENDERED state instead: a wrapper
// on model.update records every projectile's draw/logical position
// after each update — exactly what the next render displays — over
// frames f0..fn at 1x and 4x, with tower-id provenance.
// Assertions per case:
//  - f0 (the first rendered frame) draw is within 2px of the muzzle
//    the tower SHOULD have used — computed independently from the
//    target's side (fresh-engagement facing / pose), so a stale
//    facing from last frame (the GameScene update-order bug) fails
//    here even though the shot matches its own stale muzzle.
//  - the sampled facing flags equal that expected facing on f0.
//  - draw converges onto the logical path: the draw-logical gap is
//    non-increasing after f0 and reaches <=2.5px within ~75px of
//    logical travel, without overshoot (the gap never grows).
//  - point-blank: the projectile impacts (record ends) and its last
//    rendered frame already sits on the logical position — no pop.

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function createProfile(page) {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill("Origin Regression");
  await page.locator("#profile-form button").click();
}
async function enterFreePlay(page) {
  await page.locator("#play").click();
  await page.locator('[data-freeplay="classic"]').click();
}

// Model-side setup (audit-spec lineage): one immortal enemy parked
// off-trail; builders place a fresh tower where the trail scan
// offers both-side spots; the scan classifies in-range parking
// spots by side plus the closest in-range spot (point-blank).
async function setup(page) {
  await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    g.reset();
    g.gold = 1000000;
    const e = g.spawn("basic");
    e.speed = 0;
    e.health = 1e12;
    e.armor = 0;
    window.__proof = { enemyId: e.id, towerId: null };
    g.startWave();
    g.queue = [];
    const scan = (t) => {
      const trail = g.trails[0];
      const range = g.effectiveStats(t).range;
      const out = { park: null, left: null, right: null, above: null, below: null, level: null, any: null, close: null, closeD: Infinity, raised: null };
      for (let p = 40; p < 2400; p += 5) {
        const pos = trail.onPath(p);
        if (!pos || !Number.isFinite(pos.x)) continue;
        const d = Math.hypot(pos.x - t.x, pos.y - t.y);
        if (d > range + 40) { if (out.park === null) out.park = p; continue; }
        if (d < 55 || d > range - 10) continue;
        if (out.any === null) out.any = p;
        if (d < out.closeD) { out.closeD = d; out.close = p; }
        if (pos.x < t.x - 30 && out.left === null) out.left = p;
        if (pos.x > t.x + 30 && out.right === null) out.right = p;
        if (pos.y < t.y - 45 && out.above === null) out.above = p;
        // Genuinely raised bearing for a poses tower: the pivot
        // sits ~37px above the anchor (cannon 0-0-0), so the enemy
        // must be well above the ANCHOR and not too far sideways
        // for the bearing to clear the +11.5deg pose band.
        if (t.y - pos.y >= 90 && Math.abs(pos.x - t.x) <= 140 && out.raised === null) out.raised = p;
        if (pos.y > t.y + 45 && out.below === null) out.below = p;
        if (Math.abs(pos.y - t.y) <= 18 && Math.abs(pos.x - t.x) > 30 && out.level === null) out.level = p;
      }
      // No throw here: build() calls scan on candidate placements
      // that may have no in-range trail at all; the final pick is
      // validated in build() instead.
      if (out.park !== null) {
        const enemy = g.enemies.find((e) => e.id === window.__proof.enemyId);
        enemy.progress = out.park;
        Object.assign(enemy, trail.onPath(out.park));
      }
      return out;
    };
    window.__proof.scan = scan;
    window.__proof.build = (type, paths, upgrades, mustHave = ["left", "right"]) => {
      if (window.__proof.towerId != null) {
        g.sell(window.__proof.towerId);
        window.__proof.towerId = null;
      }
      let best = null;
      for (let y = 150; y <= 570 && !best; y += 12)
        for (let x = 70; x <= 1010 && !best; x += 12) {
          const t = g.place(type, x, y);
          if (!t) continue;
          const s = scan(t);
          if (mustHave.every((k) => s[k] !== null)) best = { t, s };
          else g.sell(t.id);
        }
      if (!best) {
        for (let y = 150; y <= 570 && !best; y += 12)
          for (let x = 70; x <= 1010 && !best; x += 12) {
            const t = g.place(type, x, y);
            if (t) best = { t, s: scan(t) };
          }
      }
      if (!best) throw new Error(`no placement found for ${type}`);
      const t = best.t;
      for (const p of upgrades) g.upgrade(t.id, p);
      if (t.paths.join("-") !== paths)
        throw new Error(`${type} ended at ${t.paths}, wanted ${paths}`);
      window.__proof.towerId = t.id;
      const s = scan(t);
      if (s.park === null || s.any === null)
        throw new Error(`trail scan missed for placed ${type}: ${JSON.stringify(s)}`);
      return { id: t.id, x: t.x, y: t.y, spots: s };
    };
    window.__proof.moveEnemy = (p) => {
      const enemy = g.enemies.find((e) => e.id === window.__proof.enemyId);
      enemy.progress = p;
      Object.assign(enemy, g.trails[0].onPath(p));
      return { x: enemy.x, y: enemy.y };
    };
    window.__proof.enemyPos = () => {
      const enemy = g.enemies.find((e) => e.id === window.__proof.enemyId);
      return { x: enemy.x, y: enemy.y };
    };
  });
}

// Post-update sampler: wraps model.update (the scene's only sim
// entry point) and records, after every update, each projectile of
// the watched tower exactly as the next render will draw it.
async function installSampler(page) {
  await page.evaluate(() => {
    const g = window.__tinySiege.model;
    const S = (window.__origin = { watchId: null, records: [], alive: new Set() });
    const orig = g.update.bind(g);
    g.update = (dt) => {
      orig(dt);
      if (S.watchId == null) return;
      const t = g.towers.find((tw) => tw.id === S.watchId);
      const now = new Set();
      for (const p of g.projectiles.filter((p) => p.towerId === S.watchId)) {
        now.add(p.id);
        let rec = S.records.find((r) => r.projId === p.id);
        if (!rec) {
          rec = { projId: p.id, frames: [], gone: false };
          S.records.push(rec);
        }
        rec.frames.push({
          draw: { x: p.draw?.x ?? p.x, y: p.draw?.y ?? p.y },
          x: p.x,
          y: p.y,
          tower: t
            ? { x: t.x, y: t.y, flip: !!t._mirrorFlip, pose: t._aimPose ?? null, aimFlip: !!t._aimFlip }
            : null,
        });
      }
      for (const id of S.alive)
        if (!now.has(id)) {
          const rec = S.records.find((r) => r.projId === id);
          if (rec) rec.gone = true;
        }
      S.alive = now;
    };
  });
}

// Fire one shot: build the tower, aim the parked enemy at the
// wanted spot, record the FIRST projectile until it has enough
// frames or impacts, then park the enemy again.
async function capture(page, opts) {
  const { type, state, upgrades = [], speed, side, mustHave } = opts;
  const built = await page.evaluate(
    ({ type, state, upgrades, speed, side, mustHave }) => {
      const g = window.__tinySiege.model;
      g.speed = speed;
      const b = window.__proof.build(type, state, upgrades, mustHave);
      window.__origin.records = [];
      window.__origin.alive = new Set();
      window.__origin.watchId = b.id;
      const prog = b.spots[side] ?? b.spots.any;
      const enemy = window.__proof.moveEnemy(prog);
      return { ...b, prog, enemy };
    },
    { type, state, upgrades, speed, side, mustHave },
  );
  await page.waitForFunction(
    () => {
      const r = window.__origin.records[0];
      return r && (r.gone || r.frames.length >= 16);
    },
    null,
    { timeout: 45000 },
  );
  const rec = await page.evaluate((park) => {
    window.__proof.moveEnemy(park);
    window.__origin.watchId = null;
    return window.__origin.records[0];
  }, built.spots.park);
  return { rec, built };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// The muzzle the tower SHOULD fire from on f0: facing/pose derived
// from the target's side for a fresh engagement (the tower had no
// target while the enemy was parked), independent of whatever flags
// the tower happened to carry into the frame.
function expectedMuzzle(type, paths, towerXY, enemy) {
  const fake = { type, paths, x: towerXY.x, y: towerXY.y, _mirrorFlip: false };
  const layer = towerLayer(fake);
  if (layer?.mode === "poses") {
    const display = towerDisplaySize(fake);
    const pivot = {
      x: towerXY.x + (layer.pivot[0] - 0.5) * display,
      y: towerXY.y + (layer.pivot[1] - 0.96) * display,
    };
    const aim = poseForBearing(enemy.x - pivot.x, enemy.y - pivot.y, "level");
    return {
      muzzle: layeredMuzzle({ ...fake, _aimPose: aim.pose, _aimFlip: aim.flip }, layer, aim.pose, aim.flip),
      pose: aim.pose,
      aimFlip: aim.flip,
    };
  }
  const flip = mirrorFlipFor(fake, enemy.x, false);
  return { muzzle: towerVisualMuzzle({ ...fake, _mirrorFlip: flip }), flip };
}

function analyze(rec, label) {
  const frames = rec.frames;
  const gaps = frames.map((f) => dist(f.draw, f));
  // Cumulative logical travel from the classic spawn point.
  let traveled = 0;
  let prev = null;
  const traveledAt = frames.map((f) => {
    if (prev) traveled += dist(f, prev);
    else traveled += dist(f, { x: f.tower.x, y: f.tower.y - 15 });
    prev = f;
    return traveled;
  });
  let mergeTraveled = null;
  for (let i = 0; i < frames.length; i++)
    if (gaps[i] <= 2.5) {
      mergeTraveled = traveledAt[i];
      break;
    }
  return { frames, gaps, traveledAt, mergeTraveled, label };
}

function assertConverges(rec, label) {
  const { frames, gaps, mergeTraveled } = analyze(rec, label);
  expect(frames.length, `${label}: frames recorded`).toBeGreaterThanOrEqual(4);
  // No overshoot: after f0 the draw-logical gap never grows.
  for (let i = 1; i < gaps.length; i++)
    expect(
      gaps[i],
      `${label}: gap grows at f${i} (${gaps[i - 1].toFixed(1)} -> ${gaps[i].toFixed(1)})`,
    ).toBeLessThanOrEqual(gaps[i - 1] + 0.75);
  expect(mergeTraveled, `${label}: draw never merged onto the logical path`).not.toBeNull();
  // ~60px of travel at 1x; at 4x one rendered frame is ~27px of
  // travel (the pinned birth frame included), so the same merge
  // lands a frame quantum later in travel terms.
  expect(
    mergeTraveled,
    `${label}: merged after ${mergeTraveled?.toFixed(1)}px of travel`,
  ).toBeLessThanOrEqual(80);
  return { frames, gaps, mergeTraveled };
}

async function boot(page) {
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await enterFreePlay(page);
  await setup(page);
  await installSampler(page);
  return errors;
}

test("archer shots render at the bow on f0 and merge smoothly — 1x, 4x, mirrored, point-blank", async ({ page }) => {
  test.setTimeout(300000);
  const errors = await boot(page);
  const paths = [0, 0, 0];

  for (const { side, speed } of [
    { side: "right", speed: 1 },
    { side: "right", speed: 4 },
    { side: "left", speed: 1 },
  ]) {
    const label = `archer 0-0-0 ${side} ${speed}x`;
    const { rec, built } = await capture(page, { type: "archer", state: "0-0-0", speed, side });
    const exp = expectedMuzzle("archer", paths, built, built.enemy);
    const f0 = rec.frames[0];
    // FIX 2: the facing the sim used on the firing frame is the
    // fresh-engagement facing for the target's side.
    expect(f0.tower.flip, `${label}: f0 facing`).toBe(exp.flip);
    // FIX 1: the first rendered frame shows the shot AT the muzzle.
    expect(dist(f0.draw, exp.muzzle), `${label}: f0 draw-to-muzzle`).toBeLessThanOrEqual(2);
    assertConverges(rec, label);
  }

  // Point-blank: shortest legal flight. The blend must still
  // complete before impact — the last rendered frame sits on the
  // logical position, so the shot never pops at the enemy.
  const label = "archer 0-0-0 point-blank 1x";
  const { rec, built } = await capture(page, {
    type: "archer",
    state: "0-0-0",
    speed: 1,
    side: "close",
  });
  const exp = expectedMuzzle("archer", paths, built, built.enemy);
  const f0 = rec.frames[0];
  expect(dist(f0.draw, exp.muzzle), `${label}: f0 draw-to-muzzle`).toBeLessThanOrEqual(2);
  expect(rec.gone, `${label}: projectile impacted`).toBe(true);
  expect(rec.frames.length, `${label}: frames`).toBeGreaterThanOrEqual(3);
  const { gaps } = assertConverges(rec, label);
  expect(
    gaps.at(-1),
    `${label}: last rendered frame off the logical position by ${gaps.at(-1).toFixed(1)}px`,
  ).toBeLessThanOrEqual(2.5);
  expect(errors).toEqual([]);
});

test("frost 0-0-3 (centered muzzle) renders at the crystal on f0 — 1x and 4x", async ({ page }) => {
  test.setTimeout(240000);
  const errors = await boot(page);
  const paths = [0, 0, 3];
  for (const speed of [1, 4]) {
    const label = `frost 0-0-3 right ${speed}x`;
    const { rec, built } = await capture(page, {
      type: "frost",
      state: "0-0-3",
      upgrades: [2, 2, 2],
      speed,
      side: "right",
    });
    const exp = expectedMuzzle("frost", paths, built, built.enemy);
    const f0 = rec.frames[0];
    expect(dist(f0.draw, exp.muzzle), `${label}: f0 draw-to-muzzle`).toBeLessThanOrEqual(2);
    assertConverges(rec, label);
  }
  expect(errors).toEqual([]);
});

test("cannon raised pose: the f0 shot leaves from the raised barrel, not last frame's pose", async ({ page }) => {
  test.setTimeout(240000);
  const errors = await boot(page);
  const paths = [0, 0, 0];
  const label = "cannon 0-0-0 raised 1x";
  const { rec, built } = await capture(page, {
    type: "cannon",
    state: "0-0-0",
    speed: 1,
    side: "raised",
    mustHave: ["left", "right", "raised"],
  });
  const exp = expectedMuzzle("cannon", paths, built, built.enemy);
  expect(exp.pose, `${label}: scenario sanity — expected pose`).toBe("raised");
  const f0 = rec.frames[0];
  // FIX 2: the pose primed for the firing frame is the raised pose
  // for this target, even though the tower idled at level.
  expect(f0.tower.pose, `${label}: f0 pose`).toBe("raised");
  expect(f0.tower.aimFlip, `${label}: f0 aim flip`).toBe(exp.aimFlip);
  expect(dist(f0.draw, exp.muzzle), `${label}: f0 draw-to-muzzle`).toBeLessThanOrEqual(2);
  assertConverges(rec, label);
  expect(errors).toEqual([]);
});
