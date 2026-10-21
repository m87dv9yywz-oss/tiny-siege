import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  declaredMuzzle,
  towerDisplaySize,
  towerMuzzle,
} from "../../src/data/towers.js";

// Frost per-state muzzles (structure-first redo, 2026-10-21):
// frost was the last type with NO per-state table at all — every
// state fired from the type fallback [0, -62], a few units off
// each state's own crystal. Every state now declares its own
// muzzle in STATE_MUZZLES, grounded on its own artwork; six
// states also carry new structure-first art (0-3-0's vortex ring
// became a crystal-burst crown, the Chilling Aura line's glowing
// rune rings/discs became carved stone parapets, 0-1-3's halo
// disc became a stone ring platform on pillars, and 0-0-3 Winter
// Guardian's feather wings + aura ring became shield battlements
// and crystal fins). Frost draws no pointing weapon, so nothing
// mirrors — the renderer's visual muzzle IS towerMuzzle. This
// spec pins the table to the Phase 1 measurements, then proves
// in-game that shots leave from the declared per-state muzzle:
// the capture wraps g.attack and records each new projectile's
// draw start against the FIRING tower's id (the PR #46 lesson —
// provenance by tower id, never by screen position). QA stills
// land in ~/workspace/ts-proof-art/qa/.
const QA = `${process.env.HOME}/workspace/ts-proof-art/qa`;
mkdirSync(QA, { recursive: true });

// Phase 1 grounded values (measurements.json), [dx, dy] at the
// 80px reference render. The ascended entry is grounded on the
// CURRENT ascended art (the floating heart crystal, [0, -64]) —
// the staged replacement art is held out pending the owner's
// call, so its value ([-4, -26]) is deliberately NOT pinned here.
const EXPECTED = {
  "0-0-0": [0, -61], "0-0-1": [0, -61], "0-0-2": [0, -69],
  "0-0-3": [-1, -64], "0-1-0": [2, -64], "0-1-1": [0, -60],
  "0-1-2": [0, -70], "0-1-3": [1, -71], "0-2-0": [3, -61],
  "0-2-1": [1, -59], "0-3-0": [1, -69], "0-3-1": [2, -57],
  "1-0-0": [1, -65], "1-0-1": [1, -62], "1-0-2": [0, -69],
  "1-0-3": [0, -65], "1-1-0": [2, -61], "1-2-0": [1, -59],
  "1-3-0": [0, -61], "2-0-0": [0, -60], "2-0-1": [1, -59],
  "2-1-0": [1, -57], "3-0-0": [2, -63], "3-0-1": [1, -59],
  "3-1-0": [0, -58], ascended: [0, -64],
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
// States whose correction is large enough that the shot must land
// measurably off the OLD type fallback [0, -62] at that state's
// own display scale (>5px): computed from the table itself so the
// set cannot drift from the measurements — the six redo states
// (dy -69...-71 on taller towers) plus the low burst crowns
// (0-3-1 / 2-1-0 at -57) and 3-1-0.
const BIG = new Set(
  Object.entries(EXPECTED)
    .filter(([state, [dx, dy]]) => {
      if (state === "ascended") return false;
      const paths = state.split("-").map(Number);
      const scale = towerDisplaySize({ type: "frost", paths }) / 80;
      return Math.hypot(dx * scale, (dy + 62) * scale) > 5;
    })
    .map(([state]) => state),
);

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function createProfile(page) {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill("Winter Herald");
  await page.locator("#profile-form button").click();
}
async function enterFreePlay(page) {
  await page.locator("#play").click();
  await page.locator('[data-freeplay="classic"]').click();
}
// Shared setup: attack wrapper capturing each projectile's draw
// start synchronously at fire time, attributed by the firing
// tower's id (draw races to the logical position within frames,
// so the capture must happen inside the attack call itself). One
// immortal enemy is parked off-trail, and an in-page builder
// sells the previous proof tower, places a fresh Frost tower and
// upgrades it to the wanted state.
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
        });
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
      const t = g.place("frost", x, y);
      if (!t) throw new Error(`frost placement rejected at ${x},${y}`);
      for (const p of upgrades) g.upgrade(t.id, p);
      if (t.paths.join("-") !== paths)
        throw new Error(`frost ended at ${t.paths}, wanted ${paths}`);
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
    // Family-shot builder: place one Frost tower per wanted state
    // at the first grid spots the game accepts (placement rules —
    // tower spacing and path distance — are the game's own), then
    // upgrade each to its state. The scan starts at y=180: a tall
    // tower anchored in the top rows draws past the field's top
    // edge and reads as clipped in the still. Returns the towers.
    window.__proof.family = (wanted) => {
      const placed = [];
      for (const { paths, upgrades } of wanted) {
        let t = null;
        for (let y = 180; y <= 570 && !t; y += 24)
          for (let x = 70; x <= 1010 && !t; x += 24) {
            t = g.place("frost", x, y);
            if (t && placed.some((p) => p.id === t.id)) t = null;
          }
        if (!t) throw new Error(`family placement failed for ${paths}`);
        for (const p of upgrades) g.upgrade(t.id, p);
        if (t.paths.join("-") !== paths)
          throw new Error(`family frost ended at ${t.paths}, wanted ${paths}`);
        placed.push({ id: t.id, x: t.x, y: t.y, paths });
      }
      return placed;
    };
  });
}

test("frost table matches the grounded measurements", () => {
  for (const [state, want] of Object.entries(EXPECTED)) {
    const paths =
      state === "ascended" ? [3, 3, 3] : state.split("-").map(Number);
    expect(
      declaredMuzzle({ type: "frost", paths }),
      `frost ${state}`,
    ).toEqual(want);
  }
});

test("frost shots leave from each state's own muzzle", async ({
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
      type: "frost",
      x: built.x,
      y: built.y,
      paths,
    });
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
    const origin = await page.evaluate(
      (id) => window.__proof.shots.find((s) => s.towerId === id),
      built.id,
    );
    expect(Math.abs(origin.x - want.x), `${state} shot x`).toBeLessThan(1.5);
    expect(Math.abs(origin.y - want.y), `${state} shot y`).toBeLessThan(1.5);
    if (BIG.has(state)) {
      // The correction must be real: the origin sits measurably
      // off the old type fallback [0, -62] at this state's scale.
      const scale = towerDisplaySize({ type: "frost", paths }) / 80;
      const old = { x: built.x, y: built.y - 62 * scale };
      expect(
        Math.hypot(origin.x - old.x, origin.y - old.y),
        `${state} off old muzzle`,
      ).toBeGreaterThan(5);
    }
    await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  }
  expect(errors).toEqual([]);
});

test("frost redo stills — guardian, ring platform and shatterstorm firing, plus the family", async ({
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
    { state: "0-0-3", upgrades: [2, 2, 2], at: [342, 263] },
    { state: "0-1-3", upgrades: [2, 2, 2, 1], at: [342, 263] },
    { state: "0-3-0", upgrades: [1, 1, 1], at: [743, 396] },
  ];
  for (const scene of scenes) {
    const built = await page.evaluate(
      ({ paths, upgrades, x, y }) =>
        window.__proof.build(paths, upgrades, x, y),
      {
        paths: scene.state,
        upgrades: scene.upgrades,
        x: scene.at[0],
        y: scene.at[1],
      },
    );
    // Screenshot on a frame where the tower is visibly firing:
    // wait for the attack wrapper to record a FRESH shot FROM
    // THIS TOWER (recorded synchronously at fire time), then
    // shoot immediately — the projectile still sits at the
    // muzzle it left from.
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
    await page.screenshot({ path: `${QA}/frost-${scene.state}.png` });
    await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  }

  // Family shot: the three headline redos alongside two kept
  // states, all on one battlefield, mid-fight.
  const family = await page.evaluate(() =>
    window.__proof.family([
      { paths: "0-0-0", upgrades: [] },
      { paths: "0-0-3", upgrades: [2, 2, 2] },
      { paths: "0-1-3", upgrades: [2, 2, 2, 1] },
      { paths: "0-3-0", upgrades: [1, 1, 1] },
      { paths: "3-0-0", upgrades: [0, 0, 0] },
    ]),
  );
  const anchor = await page.evaluate((first) => {
    const g = window.__tinySiege.model;
    const trail = g.trails[0];
    const t = g.towers.find((tw) => tw.id === first.id);
    const range = g.effectiveStats(t).range;
    for (let p = 40; p < 2400; p += 5) {
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
  await page.screenshot({ path: `${QA}/frost-family.png` });
  expect(errors).toEqual([]);
});
