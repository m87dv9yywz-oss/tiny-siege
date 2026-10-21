import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  declaredMuzzle,
  towerDisplaySize,
  towerMuzzle,
} from "../../src/data/towers.js";

// Lightning per-state muzzles (structure-first redo, 2026-10-21):
// lightning was the type whose single type muzzle [0, -54] sat
// inside the tower body — worst on the effect-dominated states,
// whose bolts left from mid-cloud (1-3-0's old art grounded at
// [0, -44]). Every state now declares its own muzzle in
// STATE_MUZZLES, grounded on its own artwork; sixteen states also
// carry new structure-first art (conductor prongs / coil masts /
// crystal crowns replacing arc fountains, cloud stacks and vortex
// wraps). Lightning draws no pointing weapon, so nothing mirrors
// — the renderer's visual muzzle IS towerMuzzle. This spec pins
// the table to the Phase 1 measurements, then proves in-game
// that bolts leave from the declared per-state muzzle: the model
// emits "bolt" with the tower in the payload and the scene
// prepends towerVisualMuzzle(tower) to the effect's points, so
// the capture below attributes each bolt by tower id, never by
// screen position. QA stills land in ~/workspace/ts-proof-art/qa/.
const QA = `${process.env.HOME}/workspace/ts-proof-art/qa`;
mkdirSync(QA, { recursive: true });

// Phase 1 grounded values (measurements.json), [dx, dy] at the
// 80px reference render. The ascended entry is grounded on the
// CURRENT ascended art (crowned orb center) — the staged
// replacement art is held out, so its value is pinned too.
const EXPECTED = {
  "0-0-0": [-1, -68], "0-0-1": [-1, -69], "0-0-2": [0, -67],
  "0-0-3": [0, -64], "0-1-0": [-1, -69], "0-1-1": [-1, -70],
  "0-1-2": [0, -68], "0-1-3": [0, -64], "0-2-0": [0, -68],
  "0-2-1": [1, -69], "0-3-0": [-1, -68], "0-3-1": [0, -68],
  "1-0-0": [0, -68], "1-0-1": [0, -69], "1-0-2": [0, -67],
  "1-0-3": [0, -60], "1-1-0": [0, -64], "1-2-0": [0, -69],
  "1-3-0": [0, -66], "2-0-0": [0, -72], "2-0-1": [0, -68],
  "2-1-0": [0, -73], "3-0-0": [0, -73], "3-0-1": [0, -66],
  "3-1-0": [0, -69], ascended: [0, -65],
};
// Every state is sampled in-game: all three paths tier by tier,
// the mixes, and every redo state. Upgrade sequences build the
// highest path first, then the secondary (the cannon/fire specs'
// proven order).
const SAMPLES = {
  "0-0-0": [],
  "1-0-0": [0],
  "2-0-0": [0, 0],
  "3-0-0": [0, 0, 0],
  "3-0-1": [0, 0, 0, 2],
  "3-1-0": [0, 0, 0, 1],
  "0-1-0": [1],
  "0-2-0": [1, 1],
  "0-3-0": [1, 1, 1],
  "0-3-1": [1, 1, 1, 2],
  "0-1-1": [1, 2],
  "0-2-1": [1, 1, 2],
  "1-2-0": [1, 1, 0],
  "1-3-0": [1, 1, 1, 0],
  "1-1-0": [0, 1],
  "0-0-1": [2],
  "0-0-2": [2, 2],
  "0-0-3": [2, 2, 2],
  "0-1-2": [2, 2, 1],
  "0-1-3": [2, 2, 2, 1],
  "1-0-1": [0, 2],
  "1-0-2": [2, 2, 0],
  "1-0-3": [2, 2, 2, 0],
  "2-0-1": [0, 0, 2],
  "2-1-0": [0, 0, 1],
};
// Every state's correction is large enough that the bolt must
// land measurably off the OLD type muzzle [0, -54]: the smallest
// vertical correction in the table is 6 units (1-0-3), worth
// ~7px at that state's display scale.
const BIG = new Set(Object.keys(SAMPLES));

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function createProfile(page) {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill("Storm Herald");
  await page.locator("#profile-form button").click();
}
async function enterFreePlay(page) {
  await page.locator("#play").click();
  await page.locator('[data-freeplay="classic"]').click();
}
// Shared setup: emit wrapper capturing each bolt effect's start
// point synchronously at fire time, attributed by the tower id
// in the emit payload (the scene handler runs synchronously —
// main.js wires onEvent -> ui.event — so the instant origEmit
// returns, the scene has already pushed this tower's bolt effect
// with the visual muzzle as points[0]). Scanning scene.effects
// by type alone is NOT safe in general; the payload's tower is
// what makes the attribution unambiguous. One immortal enemy is
// parked off-trail, and an in-page builder sells the previous
// proof tower, places a fresh Lightning tower and upgrades it
// to the wanted state.
async function setup(page) {
  await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    g.reset();
    g.gold = 1000000;
    window.__proof = { bolts: [], towerId: null };
    const origEmit = g.emit.bind(g);
    g.emit = (type, payload = {}) => {
      origEmit(type, payload);
      if (type === "bolt" && payload.tower) {
        const fx = window.__tinySiege.ui.scene.effects;
        for (let i = fx.length - 1; i >= 0; i--) {
          if (fx[i].type !== "bolt") continue;
          window.__proof.bolts.push({
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
      const t = g.place("lightning", x, y);
      if (!t) throw new Error(`lightning placement rejected at ${x},${y}`);
      for (const p of upgrades) g.upgrade(t.id, p);
      if (t.paths.join("-") !== paths)
        throw new Error(`lightning ended at ${t.paths}, wanted ${paths}`);
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

test("lightning table matches the grounded measurements", () => {
  for (const [state, want] of Object.entries(EXPECTED)) {
    const paths =
      state === "ascended" ? [3, 3, 3] : state.split("-").map(Number);
    expect(
      declaredMuzzle({ type: "lightning", paths }),
      `lightning ${state}`,
    ).toEqual(want);
  }
});

test("lightning bolts leave from each state's own muzzle", async ({
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

  for (const [state, upgrades] of Object.entries(SAMPLES)) {
    const paths = state.split("-").map(Number);
    const built = await page.evaluate(
      ({ paths, upgrades }) =>
        window.__proof.build(paths, upgrades, 342, 263),
      { paths: state, upgrades },
    );
    const want = towerMuzzle({
      type: "lightning",
      x: built.x,
      y: built.y,
      paths,
    });
    await page.evaluate(
      ({ id, at }) => {
        window.__proof.bolts = window.__proof.bolts.filter(
          (b) => b.towerId !== id,
        );
        window.__proof.moveEnemy(at);
      },
      { id: built.id, at: built.at },
    );
    await page.waitForFunction(
      (id) => window.__proof.bolts.some((b) => b.towerId === id),
      built.id,
      { timeout: 20000 },
    );
    const origin = await page.evaluate(
      (id) => window.__proof.bolts.find((b) => b.towerId === id),
      built.id,
    );
    expect(Math.abs(origin.x - want.x), `${state} bolt x`).toBeLessThan(1.5);
    expect(Math.abs(origin.y - want.y), `${state} bolt y`).toBeLessThan(1.5);
    if (BIG.has(state)) {
      // The correction must be real: the origin sits measurably
      // off the old type muzzle [0, -54] at this state's scale.
      const scale = towerDisplaySize({ type: "lightning", paths }) / 80;
      const old = { x: built.x, y: built.y - 54 * scale };
      expect(
        Math.hypot(origin.x - old.x, origin.y - old.y),
        `${state} off old muzzle`,
      ).toBeGreaterThan(5);
    }
    await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  }
  expect(errors).toEqual([]);
});

test("lightning redo stills — crown, orb, stormcaller and thunderlord firing", async ({
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
    { state: "3-0-0", upgrades: [0, 0, 0], at: [342, 263] },
    { state: "1-3-0", upgrades: [1, 1, 1, 0], at: [342, 263] },
    { state: "0-0-3", upgrades: [2, 2, 2], at: [743, 396] },
    { state: "0-3-0", upgrades: [1, 1, 1], at: [743, 396] },
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
    // Screenshot on a frame where the tower is visibly firing:
    // wait for the emit wrapper to record a FRESH bolt FROM THIS
    // TOWER (its effect was created that same tick and lives
    // 0.18s), then shoot immediately — the bolt's first segment
    // still starts at the muzzle it left from.
    await page.evaluate(
      ({ id, at }) => {
        window.__proof.bolts = window.__proof.bolts.filter(
          (b) => b.towerId !== id,
        );
        window.__proof.moveEnemy(at);
      },
      { id: built.id, at: built.at },
    );
    await page.waitForFunction(
      (id) => window.__proof.bolts.some((b) => b.towerId === id),
      built.id,
      { timeout: 20000 },
    );
    await page.screenshot({ path: `${QA}/lightning-${scene.state}.png` });
    await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  }
  expect(errors).toEqual([]);
});
