import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  declaredMuzzle,
  towerDisplaySize,
  towerMuzzle,
} from "../../src/data/towers.js";

// Fire per-state muzzles (structure-first redo, 2026-10-21): fire
// was the type whose single type muzzle [0, -56] sat inside the
// tower body — worst on the Magma Forge trio, which fires from its
// crucible bowl, not its chimney (0-0-3 [0, -45], 0-1-3 [-1, -51],
// 1-0-3 [0, -47]), and ~15px under the new spire crowns. Every
// state now declares its own muzzle in STATE_MUZZLES, grounded on
// its own artwork; seven states also carry new structure-first art
// (3-0-0 / 3-0-1 / 3-1-0 spires, 0-3-0 / 0-3-1 crown bowls, 1-3-0,
// 1-2-0). Fire draws no pointing weapon, so nothing mirrors — the
// renderer's visual muzzle IS towerMuzzle. This spec pins the
// table to the Phase 1 measurements, then proves in-game that
// shots (and the Inferno Spire's beam jet) leave from the declared
// per-state muzzle. QA stills land in ~/workspace/ts-proof-art/qa/.
const QA = `${process.env.HOME}/workspace/ts-proof-art/qa`;
mkdirSync(QA, { recursive: true });

// Phase 1 grounded values (measurements.json), [dx, dy] at the
// 80px reference render. The ascended entry is grounded separately
// on the CURRENT ascended art (sun-heart in its arch) — the staged
// replacement art is held out, so its value is pinned too.
const EXPECTED = {
  "0-0-0": [0, -59], "0-0-1": [0, -55], "0-0-2": [0, -62],
  "0-0-3": [0, -45], "0-1-0": [0, -58], "0-1-1": [-1, -56],
  "0-1-2": [0, -58], "0-1-3": [-1, -51], "0-2-0": [0, -59],
  "0-2-1": [0, -56], "0-3-0": [0, -67], "0-3-1": [1, -68],
  "1-0-0": [0, -54], "1-0-1": [0, -58], "1-0-2": [0, -57],
  "1-0-3": [0, -47], "1-1-0": [0, -63], "1-2-0": [0, -70],
  "1-3-0": [0, -73], "2-0-0": [-1, -56], "2-0-1": [0, -50],
  "2-1-0": [0, -54], "3-0-0": [0, -74], "3-0-1": [0, -71],
  "3-1-0": [0, -72], ascended: [0, -28],
};
// States sampled in-game: all three paths tier by tier, the forge
// trio, and every redo state. Upgrade sequences build the primary
// path first, then the secondary (the cannon spec's proven order).
const SAMPLES = {
  "0-0-0": [],
  "1-0-0": [0],
  "2-0-0": [0, 0],
  "3-0-0": [0, 0, 0], // beam — proved via its jet effect
  "3-0-1": [0, 0, 0, 2],
  "3-1-0": [0, 0, 0, 1],
  "0-1-0": [1],
  "0-2-0": [1, 1],
  "0-3-0": [1, 1, 1],
  "0-3-1": [1, 1, 1, 2],
  "1-2-0": [1, 1, 0],
  "1-3-0": [1, 1, 1, 0],
  "0-0-1": [2],
  "0-0-2": [2, 2],
  "0-0-3": [2, 2, 2],
  "0-1-3": [2, 2, 2, 1],
  "1-0-3": [2, 2, 2, 0],
};
// Corrections large enough that the shot must land measurably off
// the OLD type muzzle [0, -56]: the forge trio + all redo states.
const BIG = new Set([
  "0-0-3", "0-1-3", "1-0-3",
  "3-0-0", "3-0-1", "3-1-0", "0-3-0", "0-3-1", "1-3-0", "1-2-0",
]);
// The whole Inferno Tier-3 family fires the focus BEAM (tier stat
// beam: true rides along with both secondaries), so 3-0-1 and
// 3-1-0 make no projectile either — they are proved through the
// scene's jet effect, whose start point is towerVisualMuzzle.
const BEAM = new Set(["3-0-0", "3-0-1", "3-1-0"]);

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function createProfile(page) {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill("Forge Knight");
  await page.locator("#profile-form button").click();
}
async function enterFreePlay(page) {
  await page.locator("#play").click();
  await page.locator('[data-freeplay="classic"]').click();
}
// Shared setup: attack wrapper capturing each projectile's draw
// start synchronously at fire time (draw races to the logical
// position within frames), one immortal enemy parked off-trail,
// and an in-page builder that sells the previous proof tower,
// places a fresh Fire tower and upgrades it to the wanted state.
async function setup(page) {
  await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    g.reset();
    g.gold = 1000000;
    window.__proof = { shots: [], jets: [], towerId: null };
    const orig = g.attack.bind(g);
    g.attack = (t, targets, stats) => {
      const before = g.projectiles.length;
      orig(t, targets, stats);
      for (const p of g.projectiles.slice(before))
        window.__proof.shots.push({
          towerId: t.id,
          x: p.draw.x,
          y: p.draw.y,
        });
    };
    // Beam origins, captured with exact provenance: the model's
    // "jet" emit runs the scene handler synchronously (main.js
    // wires onEvent -> ui.event), so the instant origEmit returns,
    // the scene has already pushed this beam's effect — the newest
    // jet in its list. Scanning scene.effects by type alone is NOT
    // safe: the dragon hero's breath is also a "jet" effect (via
    // "heroAttack" events) and in CI it fired first, 242px off.
    // Hero breath never passes through this emit, so the tower id
    // recorded here is unambiguous.
    const origEmit = g.emit.bind(g);
    g.emit = (type, payload = {}) => {
      origEmit(type, payload);
      if (type === "jet" && payload.tower) {
        const fx = window.__tinySiege.ui.scene.effects;
        for (let i = fx.length - 1; i >= 0; i--) {
          if (fx[i].type !== "jet") continue;
          window.__proof.jets.push({
            towerId: payload.tower.id,
            x: fx[i].points[0].x,
            y: fx[i].points[0].y,
          });
          break;
        }
      }
    };
    const e = g.spawn("basic");
    e.speed = 0;
    e.health = 1e12;
    e.armor = 0;
    window.__proof.enemyId = e.id;
    g.startWave();
    g.queue = [];
    window.__proof.build = (paths, upgrades, x, y, minD = 55) => {
      if (window.__proof.towerId != null) g.sell(window.__proof.towerId);
      const t = g.place("fire", x, y);
      if (!t) throw new Error(`fire placement rejected at ${x},${y}`);
      for (const p of upgrades) g.upgrade(t.id, p);
      if (t.paths.join("-") !== paths)
        throw new Error(`fire ended at ${t.paths}, wanted ${paths}`);
      window.__proof.towerId = t.id;
      const trail = g.trails[0];
      const range = g.effectiveStats(t).range;
      let at = null,
        park = null;
      for (let p = 40; p < 2400 && (at === null || park === null); p += 5) {
        const pos = trail.onPath(p);
        if (!pos || !Number.isFinite(pos.x)) continue;
        const d = Math.hypot(pos.x - t.x, pos.y - t.y);
        if (at === null && d >= minD && d <= range - 10) at = p;
        if (park === null && d > range + 40) park = p;
      }
      if (at === null || park === null)
        throw new Error(`trail scan missed for ${paths}: at=${at} park=${park}`);
      const enemy = g.enemies.find((e) => e.id === window.__proof.enemyId);
      enemy.progress = park;
      Object.assign(enemy, trail.onPath(park));
      return { id: t.id, x: t.x, y: t.y, at, park };
    };
    window.__proof.moveEnemy = (p) => {
      const enemy = g.enemies.find((e) => e.id === window.__proof.enemyId);
      enemy.progress = p;
      Object.assign(enemy, g.trails[0].onPath(p));
    };
  });
}

test("fire table matches the grounded measurements", () => {
  for (const [state, want] of Object.entries(EXPECTED)) {
    const paths =
      state === "ascended" ? [3, 3, 3] : state.split("-").map(Number);
    expect(
      declaredMuzzle({ type: "fire", paths }),
      `fire ${state}`,
    ).toEqual(want);
  }
});

test("fire shots leave from each state's own muzzle", async ({ page }) => {
  test.setTimeout(300000);
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await enterFreePlay(page);
  await setup(page);

  for (const [state, upgrades] of Object.entries(SAMPLES)) {
    const paths = state.split("-").map(Number);
    const built = await page.evaluate(
      ({ paths, upgrades }) =>
        window.__proof.build(paths, upgrades, 342, 263),
      { paths: state, upgrades },
    );
    const want = towerMuzzle({ type: "fire", x: built.x, y: built.y, paths });
    let origin;
    if (BEAM.has(state)) {
      // Beam tower: no projectile — its origin is the scene jet
      // effect's start point, captured by tower id in setup's emit
      // wrapper (hero breath and other towers cannot pollute it).
      await page.evaluate(
        ({ id, at }) => {
          window.__proof.jets = window.__proof.jets.filter(
            (j) => j.towerId !== id,
          );
          window.__proof.moveEnemy(at);
        },
        { id: built.id, at: built.at },
      );
      await page.waitForFunction(
        (id) => window.__proof.jets.some((j) => j.towerId === id),
        built.id,
        { timeout: 20000 },
      );
      origin = await page.evaluate(
        (id) => window.__proof.jets.find((j) => j.towerId === id),
        built.id,
      );
      expect(Math.abs(origin.x - want.x), `${state} jet x`).toBeLessThan(1.5);
      expect(Math.abs(origin.y - want.y), `${state} jet y`).toBeLessThan(1.5);
    } else {
      await page.evaluate(
        ({ id, at }) => {
          window.__proof.shots = window.__proof.shots.filter(
            (s) => s.towerId !== id,
          );
          window.__proof.moveEnemy(at);
        },
        { id: built.id, at: built.at },
      );
      await page.waitForFunction(
        (id) => window.__proof.shots.some((s) => s.towerId === id),
        built.id,
        { timeout: 20000 },
      );
      origin = await page.evaluate(
        (id) => window.__proof.shots.find((s) => s.towerId === id),
        built.id,
      );
      expect(Math.abs(origin.x - want.x), `${state} draw x`).toBeLessThan(1.5);
      expect(Math.abs(origin.y - want.y), `${state} draw y`).toBeLessThan(1.5);
    }
    if (BIG.has(state)) {
      // The correction must be real: the origin sits measurably
      // off the old type muzzle [0, -56] at this state's scale.
      const scale = towerDisplaySize({ type: "fire", paths }) / 80;
      const old = { x: built.x, y: built.y - 56 * scale };
      expect(
        Math.hypot(origin.x - old.x, origin.y - old.y),
        `${state} off old muzzle`,
      ).toBeGreaterThan(5);
    }
    await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  }
  expect(errors).toEqual([]);
});

test("fire redo stills — spires, crown bowl and forge firing", async ({
  page,
}) => {
  test.setTimeout(300000);
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await enterFreePlay(page);
  await setup(page);

  const scenes = [
    { state: "3-0-0", upgrades: [0, 0, 0], at: [342, 263], beam: true },
    // NOT (145, 105): that corner's in-range trail points all sit
    // where the (large) enemy sprite + treeline hide the wide
    // crown-bowl tower. The open bottom-right grass reads honestly.
    { state: "0-3-0", upgrades: [1, 1, 1], at: [743, 396], beam: false },
    { state: "0-0-3", upgrades: [2, 2, 2], at: [743, 396], beam: false },
    { state: "1-3-0", upgrades: [1, 1, 1, 0], at: [342, 263], beam: false },
  ];
  for (const scene of scenes) {
    const built = await page.evaluate(
      ({ paths, upgrades, x, y, minD }) =>
        window.__proof.build(paths, upgrades, x, y, minD),
      {
        paths: scene.state,
        upgrades: scene.upgrades,
        x: scene.at[0],
        y: scene.at[1],
        minD: scene.minD ?? 55,
      },
    );
    await page.evaluate((p) => window.__proof.moveEnemy(p), built.at);
    // Screenshot on a frame where the tower is visibly firing.
    // Beam: wait for the emit wrapper to record a jet FROM THIS
    // TOWER (its effect was created that same tick and lives
    // 0.28s), then shoot immediately. Projectile towers: wait for
    // the attack wrapper to record a FRESH shot, then shoot
    // immediately — the projectile is within a frame or two of
    // the muzzle it left from. (An earlier proximity poll — draw
    // within 45px of the muzzle — raced the draw's convergence
    // and missed whole volleys.)
    if (scene.beam) {
      await page.evaluate((id) => {
        window.__proof.jets = window.__proof.jets.filter(
          (j) => j.towerId !== id,
        );
      }, built.id);
      await page.waitForFunction(
        (id) => window.__proof.jets.some((j) => j.towerId === id),
        built.id,
        { timeout: 20000 },
      );
      await page.screenshot({ path: `${QA}/fire-${scene.state}.png` });
    } else {
      await page.evaluate((id) => {
        window.__proof.shots = window.__proof.shots.filter(
          (s) => s.towerId !== id,
        );
      }, built.id);
      await page.waitForFunction(
        (id) => window.__proof.shots.some((s) => s.towerId === id),
        built.id,
        { timeout: 20000 },
      );
      await page.screenshot({ path: `${QA}/fire-${scene.state}.png` });
    }
    await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  }
  expect(errors).toEqual([]);
});
