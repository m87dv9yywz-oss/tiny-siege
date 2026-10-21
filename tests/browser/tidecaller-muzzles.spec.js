import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  declaredMuzzle,
  towerDisplaySize,
  towerMuzzle,
  towerVisualMuzzle,
} from "../../src/data/towers.js";

// Tidecaller per-state muzzles (2026-10-21): tidecaller was the
// last type with NO per-state table at all — every state,
// ascended included, fired from the type fallback [-26, -30], a
// point measured on the BASE ship's prow harpoon. Every state
// now declares its own muzzle in STATE_MUZZLES, grounded on its
// own weapon: prow harpoon / deck cannon tips for the ship
// states, the ring-mounted portal center for the two pure
// maelstrom ships (0-0-3 [-7, -58], 0-1-3 [-7, -64] — the
// fallback sat ~30 units off their emitter), and 1-0-3 on its
// prow harpoon, matching its MIRRORED_WEAPONS listing. No art
// changed this pass (25 KEEP / 0 REDO) and no display sizes
// moved. Tidecaller's weapons are drawn pointing LEFT and
// mirror (PR #43): the table entries are the drawn emitters,
// and the renderer's visual muzzle mirrors them across the
// tower's axis while the sprite is flipped — so the capture
// records each shot's flip at fire time and checks against
// towerVisualMuzzle with that flip (provenance by tower id,
// the PR #46 lesson). Tidecaller sails only on water, so the
// proof runs on Twin Ponds. QA stills land in
// ~/workspace/ts-proof-art/qa/.
const QA = `${process.env.HOME}/workspace/ts-proof-art/qa`;
mkdirSync(QA, { recursive: true });

// Phase 1 grounded values (measurements.json), [dx, dy] at the
// 80px reference render. The ascended entry is grounded on the
// CURRENT ascended art (the crown burst, [0, -71]) — the staged
// replacement art is held out pending the owner's call, so its
// value ([-3, -65]) is deliberately NOT pinned here.
const EXPECTED = {
  "0-0-0": [-24, -38], "0-0-1": [-30, -39], "0-0-2": [-29, -38],
  "0-0-3": [-7, -58], "0-1-0": [-31, -41], "0-1-1": [-30, -49],
  "0-1-2": [-29, -41], "0-1-3": [-7, -64], "0-2-0": [-21, -38],
  "0-2-1": [-25, -41], "0-3-0": [-30, -32], "0-3-1": [-33, -37],
  "1-0-0": [-32, -37], "1-0-1": [-32, -34], "1-0-2": [-32, -36],
  "1-0-3": [-32, -34], "1-1-0": [-30, -40], "1-2-0": [-35, -46],
  "1-3-0": [-30, -38], "2-0-0": [-25, -39], "2-0-1": [-27, -40],
  "2-1-0": [-21, -36], "3-0-0": [-14, -30], "3-0-1": [-16, -26],
  "3-1-0": [-18, -30], ascended: [0, -71],
};
const OLD_FALLBACK = [-26, -30];
// Every state is sampled in-game: all three paths tier by tier
// and the mixes. Upgrade sequences build the highest path first,
// then the secondary (the cannon/fire/frost specs' proven order).
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
// States whose correction is large enough that the shot must
// land measurably off the OLD type fallback [-26, -30] at that
// state's own display scale (>5px, canonical — un-mirrored —
// geometry): computed from the table itself so the set cannot
// drift from the measurements. Nearly every state qualifies:
// the fallback was the base ship's point, up to ~19 units low
// and ~9 off the bow, and ~30 off the portal ships' emitter.
const BIG = new Set(
  Object.entries(EXPECTED)
    .filter(([state, [dx, dy]]) => {
      if (state === "ascended") return false;
      const paths = state.split("-").map(Number);
      const scale = towerDisplaySize({ type: "tidecaller", paths }) / 80;
      return (
        Math.hypot((dx - OLD_FALLBACK[0]) * scale, (dy - OLD_FALLBACK[1]) * scale) > 5
      );
    })
    .map(([state]) => state),
);
// Twin Ponds: the only waters where the Tidecaller sails.
const POND_A = { x: 285, y: 235 };
const POND_B = { x: 665, y: 415 };

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function createProfile(page) {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill("Tide Herald");
  await page.locator("#profile-form button").click();
}
async function enterFreePlay(page) {
  await page.locator("#play").click();
  await page.locator('[data-freeplay="twinponds"]').click();
}
// Shared setup: attack wrapper capturing each projectile's draw
// start AND the mirror flip that produced it, synchronously at
// fire time, attributed by the firing tower's id. One immortal
// enemy is parked off-trail, and in-page builders sell the
// previous proof tower, place a fresh Tidecaller in a pond and
// upgrade it to the wanted state.
async function setup(page) {
  await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    g.reset();
    g.gold = 1000000;
    window.__proof = { shots: [], towerId: null };
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
    const e = g.spawn("basic");
    e.speed = 0;
    e.health = 1e12;
    e.armor = 0;
    window.__proof.enemyId = e.id;
    g.startWave();
    g.queue = [];
    // Trail scan: an in-range parking spot and an out-of-range
    // one, relative to a tower at (tx, ty) with the given range.
    const scan = (t, minD = 55) => {
      const trail = g.trails[0];
      const range = g.effectiveStats(t).range;
      let at = null,
        park = null;
      for (let p = 40; p < 4000 && (at === null || park === null); p += 5) {
        const pos = trail.onPath(p);
        if (!pos || !Number.isFinite(pos.x)) continue;
        const d = Math.hypot(pos.x - t.x, pos.y - t.y);
        if (at === null && d >= minD && d <= range - 10) at = p;
        if (park === null && d > range + 40) park = p;
      }
      if (at === null || park === null)
        throw new Error(`trail scan missed: at=${at} park=${park}`);
      const enemy = g.enemies.find((e) => e.id === window.__proof.enemyId);
      enemy.progress = park;
      Object.assign(enemy, trail.onPath(park));
      return { at, park };
    };
    window.__proof.build = (paths, upgrades, x, y) => {
      if (window.__proof.towerId != null) g.sell(window.__proof.towerId);
      const t = g.place("tidecaller", x, y);
      if (!t) throw new Error(`tidecaller placement rejected at ${x},${y}`);
      for (const p of upgrades) g.upgrade(t.id, p);
      if (t.paths.join("-") !== paths)
        throw new Error(`tidecaller ended at ${t.paths}, wanted ${paths}`);
      window.__proof.towerId = t.id;
      const { at, park } = scan(t);
      return { id: t.id, x: t.x, y: t.y, at, park };
    };
    // Ascension builder: three boats in the ponds, one Tier-3
    // evolution per path (set directly, the ascension spec's
    // proven route), fused with g.ascend. The surviving tower
    // keeps the first boat's anchorage.
    window.__proof.buildAscended = () => {
      if (window.__proof.towerId != null) {
        g.sell(window.__proof.towerId);
        window.__proof.towerId = null;
      }
      const spots = [];
      for (let y = 150; y <= 560 && spots.length < 3; y += 13)
        for (let x = 150; x <= 950 && spots.length < 3; x += 13)
          if (
            g.canPlace("tidecaller", x, y) === null &&
            spots.every((s) => Math.hypot(s.x - x, s.y - y) >= 60)
          )
            spots.push({ x, y });
      if (spots.length < 3) throw new Error("ascension spots not found");
      const towers = spots.map((s, i) => {
        const t = g.place("tidecaller", s.x, s.y);
        if (!t) throw new Error(`ascension placement rejected at ${s.x},${s.y}`);
        t.paths = [0, 0, 0];
        t.paths[i] = 3;
        t.paths[(i + 1) % 3] = 1;
        return t;
      });
      if (!g.canAscend(towers[0])) throw new Error("canAscend refused");
      if (!g.ascend(towers[0].id)) throw new Error("ascend refused");
      const t = towers[0];
      if (t.paths.join("-") !== "3-3-3")
        throw new Error(`ascended ended at ${t.paths}`);
      window.__proof.towerId = t.id;
      const { at, park } = scan(t);
      return { id: t.id, x: t.x, y: t.y, at, park };
    };
    window.__proof.moveEnemy = (p) => {
      const enemy = g.enemies.find((e) => e.id === window.__proof.enemyId);
      enemy.progress = p;
      Object.assign(enemy, g.trails[0].onPath(p));
    };
    // Family-shot builder: one Tidecaller per wanted state at
    // the first pond spots the game accepts (canPlace is the
    // authority — water, spacing and path distance are the
    // game's own rules), then upgrade each to its state.
    window.__proof.family = (wanted) => {
      const placed = [];
      for (const { paths, upgrades } of wanted) {
        let t = null;
        for (let y = 165; y <= 560 && !t; y += 13)
          for (let x = 150; x <= 950 && !t; x += 13) {
            if (g.canPlace("tidecaller", x, y) !== null) continue;
            if (
              placed.some(
                (p) => Math.hypot(p.x - x, p.y - y) < 56,
              )
            )
              continue;
            t = g.place("tidecaller", x, y);
          }
        if (!t) throw new Error(`family placement failed for ${paths}`);
        for (const p of upgrades) g.upgrade(t.id, p);
        if (t.paths.join("-") !== paths)
          throw new Error(`family tidecaller ended at ${t.paths}, wanted ${paths}`);
        placed.push({ id: t.id, x: t.x, y: t.y, paths });
      }
      return placed;
    };
  });
}
// Fire one fresh shot from the wanted tower at the parked enemy
// position and return the recorded origin.
async function fireAndCapture(page, built) {
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
  return page.evaluate(
    (id) => window.__proof.shots.find((s) => s.towerId === id),
    built.id,
  );
}

test("tidecaller table matches the grounded measurements", () => {
  for (const [state, want] of Object.entries(EXPECTED)) {
    const paths =
      state === "ascended" ? [3, 3, 3] : state.split("-").map(Number);
    expect(
      declaredMuzzle({ type: "tidecaller", paths }),
      `tidecaller ${state}`,
    ).toEqual(want);
  }
});

test("tidecaller shots leave from each state's own muzzle", async ({
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
      ({ paths, upgrades, x, y }) =>
        window.__proof.build(paths, upgrades, x, y),
      { paths: state, upgrades, x: POND_A.x, y: POND_A.y },
    );
    const origin = await fireAndCapture(page, built);
    // The shot must leave from the declared muzzle as the
    // renderer shows it: mirrored across the tower's axis when
    // the sprite was flipped to face the target.
    const want = towerVisualMuzzle({
      type: "tidecaller",
      x: built.x,
      y: built.y,
      paths,
      _mirrorFlip: origin.flip,
    });
    expect(Math.abs(origin.x - want.x), `${state} shot x`).toBeLessThan(1.5);
    expect(Math.abs(origin.y - want.y), `${state} shot y`).toBeLessThan(1.5);
    if (BIG.has(state)) {
      // The correction must be real: un-mirror the origin back
      // to canonical geometry and check it sits measurably off
      // the old type fallback [-26, -30] at this state's scale.
      const scale = towerDisplaySize({ type: "tidecaller", paths }) / 80;
      const canonicalX = origin.flip ? 2 * built.x - origin.x : origin.x;
      const old = {
        x: built.x + OLD_FALLBACK[0] * scale,
        y: built.y + OLD_FALLBACK[1] * scale,
      };
      expect(
        Math.hypot(canonicalX - old.x, origin.y - old.y),
        `${state} off old muzzle`,
      ).toBeGreaterThan(5);
    }
    await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  }
  expect(errors).toEqual([]);
});

test("ascended tidecaller fires from the crown burst of its current art", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await enterFreePlay(page);
  await setup(page);

  const built = await page.evaluate(() => window.__proof.buildAscended());
  const origin = await fireAndCapture(page, built);
  // The ascended carries no pointing weapon, so it never
  // mirrors: the visual muzzle IS the canonical one, grounded
  // on the current art's crown burst ([0, -71]).
  const want = towerMuzzle({
    type: "tidecaller",
    x: built.x,
    y: built.y,
    paths: [3, 3, 3],
  });
  expect(origin.flip).toBe(false);
  expect(Math.abs(origin.x - want.x), "ascended shot x").toBeLessThan(1.5);
  expect(Math.abs(origin.y - want.y), "ascended shot y").toBeLessThan(1.5);
  // And it is nowhere near the old fallback the ascended used
  // to share with the base ship (~89px away at ascended scale).
  const scale = towerDisplaySize({ type: "tidecaller", paths: [3, 3, 3] }) / 80;
  const old = {
    x: built.x + OLD_FALLBACK[0] * scale,
    y: built.y + OLD_FALLBACK[1] * scale,
  };
  expect(Math.hypot(origin.x - old.x, origin.y - old.y)).toBeGreaterThan(40);
  await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  expect(errors).toEqual([]);
});

test("tidecaller stills — portal ship and harpoon warship firing, plus the family", async ({
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
    // The maelstrom ship: the shot leaves from the portal disc
    // in its mast ring, ~30 units from where the fallback sat.
    { state: "0-0-3", upgrades: [2, 2, 2], at: POND_A },
    // The A-path warship in the far pond: deck-cannon muzzle.
    { state: "3-0-0", upgrades: [0, 0, 0], at: POND_B },
  ];
  for (const scene of scenes) {
    const built = await page.evaluate(
      ({ paths, upgrades, x, y }) =>
        window.__proof.build(paths, upgrades, x, y),
      {
        paths: scene.state,
        upgrades: scene.upgrades,
        x: scene.at.x,
        y: scene.at.y,
      },
    );
    // Screenshot on a frame where the tower is visibly firing:
    // wait for the attack wrapper to record a FRESH shot FROM
    // THIS TOWER (recorded synchronously at fire time), then
    // shoot immediately — the projectile still sits at the
    // muzzle it left from.
    await fireAndCapture(page, built);
    await page.screenshot({ path: `${QA}/tidecaller-${scene.state}.png` });
    await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  }

  // Family shot: six states across both ponds, mid-fight.
  const family = await page.evaluate(() =>
    window.__proof.family([
      { paths: "0-0-0", upgrades: [] },
      { paths: "3-0-0", upgrades: [0, 0, 0] },
      { paths: "0-3-0", upgrades: [1, 1, 1] },
      { paths: "0-0-3", upgrades: [2, 2, 2] },
      { paths: "0-1-3", upgrades: [2, 2, 2, 1] },
      { paths: "1-2-0", upgrades: [1, 1, 0] },
    ]),
  );
  const anchor = await page.evaluate((first) => {
    const g = window.__tinySiege.model;
    const trail = g.trails[0];
    const t = g.towers.find((tw) => tw.id === first.id);
    const range = g.effectiveStats(t).range;
    for (let p = 40; p < 4000; p += 5) {
      const pos = trail.onPath(p);
      if (!pos || !Number.isFinite(pos.x)) continue;
      const d = Math.hypot(pos.x - t.x, pos.y - t.y);
      if (d >= 55 && d <= range - 10) return p;
    }
    throw new Error("family trail scan missed");
  }, family[0]);
  await page.evaluate((p) => window.__proof.moveEnemy(p), anchor);
  // The grid scan's rejected attempts raise the game's spacing
  // hint toast; let it fade, then shoot on a FRESH shot so a
  // projectile is actually in flight in the still.
  await page.waitForTimeout(4500);
  // Re-pin the enemy before clearing: the maelstrom ships drag
  // it backward along the trail while it sits in range (the
  // mirror spec's re-pin lesson), and 4.5s of drag can pull it
  // out of every pond tower's reach.
  await page.evaluate((p) => window.__proof.moveEnemy(p), anchor);
  await page.evaluate(
    (ids) => {
      window.__proof.shots = window.__proof.shots.filter(
        (s) => !ids.includes(s.towerId),
      );
    },
    family.map((f) => f.id),
  );
  await page.waitForFunction(
    (ids) => window.__proof.shots.some((s) => ids.includes(s.towerId)),
    family.map((f) => f.id),
    { timeout: 20000 },
  );
  await page.screenshot({ path: `${QA}/tidecaller-family.png` });
  expect(errors).toEqual([]);
});
