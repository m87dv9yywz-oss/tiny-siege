import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  declaredMuzzle,
  towerDisplaySize,
  towerMuzzle,
} from "../../src/data/towers.js";

// Runesmith per-state muzzles (structure-first redo, 2026-10-21):
// rune had NO per-state table at all — every state fired from
// the type fallback [0, -56], a point inside the obelisk body
// below every state's ring crown. Every state now declares its
// own muzzle in STATE_MUZZLES, grounded on its own emitter:
// the floating stone ring crowns (dy -61...-71), the mounted
// crystal spires on the Armorbreaker mixes (0-3-1 [0, -75],
// 1-3-0 [0, -76]) and 1-0-1's lower ring ([0, -63]). Six
// states also carry new structure-first art from this pass —
// the Fracture Sigils debris-vortex crowns became an iron
// circlet crown (0-2-0) and a bracketed stone ring (1-2-0),
// 0-3-0's swirling energy ribbons became the huge runic anvil
// its own description promises, the Arcane Empowerer's radial
// light-burst halo became stacked stone gyroscope rings
// (3-0-0), 3-0-1's translucent energy rings became solid
// interlocking stone rings, and 3-1-0's glow sunburst corona
// became a thick bracketed stone ring crown — and their
// muzzles are grounded on that new art. Rune draws no pointing
// weapon, so nothing mirrors — the renderer's visual muzzle
// IS towerMuzzle. This spec pins the table to the Phase 1
// measurements, then proves in-game that shots leave from the
// declared per-state muzzle: the capture wraps g.attack and
// records each new projectile's draw start against the FIRING
// tower's id (the PR #46 lesson — provenance by tower id,
// never by screen position). QA stills land in
// ~/workspace/ts-proof-art/qa/.
const QA = `${process.env.HOME}/workspace/ts-proof-art/qa`;
mkdirSync(QA, { recursive: true });

// Phase 1 grounded values (measurements.json), [dx, dy] at the
// 80px reference render. The ascended entry is grounded on the
// ascended art ([0, -73]) — originally the temple core of the
// first Archrunesmith; the art was SWAPPED 2026-10-22 (owner
// approved the ziggurat replacement with the old art's purple
// ground rune ring) and the same value lands on the new art's
// crown core, so the swap changed art only.
const EXPECTED = {
  "0-0-0": [0, -67], "0-0-1": [0, -70], "0-0-2": [0, -68],
  "0-0-3": [0, -67], "0-1-0": [0, -66], "0-1-1": [0, -67],
  "0-1-2": [0, -68], "0-1-3": [0, -67], "0-2-0": [0, -62],
  "0-2-1": [0, -68], "0-3-0": [3, -74], "0-3-1": [0, -75],
  "1-0-0": [0, -66], "1-0-1": [0, -63], "1-0-2": [1, -67],
  "1-0-3": [0, -67], "1-1-0": [1, -68], "1-2-0": [0, -71],
  "1-3-0": [0, -76], "2-0-0": [0, -67], "2-0-1": [0, -66],
  "2-1-0": [0, -68], "3-0-0": [0, -61], "3-0-1": [0, -62],
  "3-1-0": [0, -68], ascended: [0, -73],
};
const OLD_FALLBACK = [0, -56];
// Every state is sampled in-game: all three paths tier by tier,
// the mixes, and every redo state. Upgrade sequences build the
// highest path first, then the secondary (the cannon/fire/frost
// specs' proven order).
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
// land measurably off the OLD type fallback [0, -56] at that
// state's own display scale (>5px): computed from the table
// itself so the set cannot drift from the measurements. The
// fallback sat 5-20 units below the real crowns, so nearly
// every state qualifies.
const BIG = new Set(
  Object.entries(EXPECTED)
    .filter(([state, [dx, dy]]) => {
      if (state === "ascended") return false;
      const paths = state.split("-").map(Number);
      const scale = towerDisplaySize({ type: "rune", paths }) / 80;
      return (
        Math.hypot(
          (dx - OLD_FALLBACK[0]) * scale,
          (dy - OLD_FALLBACK[1]) * scale,
        ) > 5
      );
    })
    .map(([state]) => state),
);

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function createProfile(page) {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill("Rune Herald");
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
// immortal enemy is parked off-trail, and in-page builders sell
// the previous proof tower, place a fresh Runesmith tower and
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
      for (let p = 40; p < 2400 && (at === null || park === null); p += 5) {
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
      const t = g.place("rune", x, y);
      if (!t) throw new Error(`rune placement rejected at ${x},${y}`);
      for (const p of upgrades) g.upgrade(t.id, p);
      if (t.paths.join("-") !== paths)
        throw new Error(`rune ended at ${t.paths}, wanted ${paths}`);
      window.__proof.towerId = t.id;
      const { at, park } = scan(t);
      return { id: t.id, x: t.x, y: t.y, at, park };
    };
    // Ascension builder: three runesmiths, one Tier-3 evolution
    // per path (set directly, the ascension spec's proven route),
    // fused with g.ascend. The scan starts at y=180 so tall
    // sprites never clip the field's top edge (frost lesson).
    window.__proof.buildAscended = () => {
      if (window.__proof.towerId != null) {
        g.sell(window.__proof.towerId);
        window.__proof.towerId = null;
      }
      const spots = [];
      for (let y = 180; y <= 560 && spots.length < 3; y += 13)
        for (let x = 70; x <= 1010 && spots.length < 3; x += 13)
          if (
            g.canPlace("rune", x, y) === null &&
            spots.every((s) => Math.hypot(s.x - x, s.y - y) >= 60)
          )
            spots.push({ x, y });
      if (spots.length < 3) throw new Error("ascension spots not found");
      const towers = spots.map((s, i) => {
        const t = g.place("rune", s.x, s.y);
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
    // Family-shot builder: place one Runesmith tower per wanted
    // state at the first grid spots the game accepts (placement
    // rules — tower spacing and path distance — are the game's
    // own), then upgrade each to its state. The scan starts at
    // y=180: a tall tower anchored in the top rows draws past
    // the field's top edge and reads as clipped in the still.
    window.__proof.family = (wanted) => {
      const placed = [];
      for (const { paths, upgrades } of wanted) {
        let t = null;
        for (let y = 180; y <= 570 && !t; y += 24)
          for (let x = 70; x <= 1010 && !t; x += 24) {
            t = g.place("rune", x, y);
            if (t && placed.some((p) => p.id === t.id)) t = null;
          }
        if (!t) throw new Error(`family placement failed for ${paths}`);
        for (const p of upgrades) g.upgrade(t.id, p);
        if (t.paths.join("-") !== paths)
          throw new Error(`family rune ended at ${t.paths}, wanted ${paths}`);
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

test("rune table matches the grounded measurements", () => {
  for (const [state, want] of Object.entries(EXPECTED)) {
    const paths =
      state === "ascended" ? [3, 3, 3] : state.split("-").map(Number);
    expect(
      declaredMuzzle({ type: "rune", paths }),
      `rune ${state}`,
    ).toEqual(want);
  }
});

test("rune shots leave from each state's own muzzle", async ({ page }) => {
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
      ({ paths, upgrades }) => window.__proof.build(paths, upgrades, 342, 263),
      { paths: state, upgrades },
    );
    const origin = await fireAndCapture(page, built);
    const want = towerMuzzle({
      type: "rune",
      x: built.x,
      y: built.y,
      paths,
    });
    expect(Math.abs(origin.x - want.x), `${state} shot x`).toBeLessThan(1.5);
    expect(Math.abs(origin.y - want.y), `${state} shot y`).toBeLessThan(1.5);
    if (BIG.has(state)) {
      // The correction must be real: the origin sits measurably
      // off the old type fallback [0, -56] at this state's scale.
      const scale = towerDisplaySize({ type: "rune", paths }) / 80;
      const old = {
        x: built.x + OLD_FALLBACK[0] * scale,
        y: built.y + OLD_FALLBACK[1] * scale,
      };
      expect(
        Math.hypot(origin.x - old.x, origin.y - old.y),
        `${state} off old muzzle`,
      ).toBeGreaterThan(5);
    }
    await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  }
  expect(errors).toEqual([]);
});

test("ascended runesmith fires from the crown core of its swapped-in art", async ({
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
  // The ascended is grounded on the swapped-in Archrunesmith
  // art ([0, -73], the crown core of the ziggurat; the value
  // is unchanged from the original art's temple core).
  const want = towerMuzzle({
    type: "rune",
    x: built.x,
    y: built.y,
    paths: [3, 3, 3],
  });
  expect(Math.abs(origin.x - want.x), "ascended shot x").toBeLessThan(1.5);
  expect(Math.abs(origin.y - want.y), "ascended shot y").toBeLessThan(1.5);
  // And it sits measurably above the old fallback the ascended
  // used to share with every other state (17 units at ascended
  // scale, ~35px).
  const scale = towerDisplaySize({ type: "rune", paths: [3, 3, 3] }) / 80;
  const old = {
    x: built.x + OLD_FALLBACK[0] * scale,
    y: built.y + OLD_FALLBACK[1] * scale,
  };
  expect(Math.hypot(origin.x - old.x, origin.y - old.y)).toBeGreaterThan(10);
  await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  expect(errors).toEqual([]);
});

test("runesmith redo stills — anvil and stone rings firing, plus the family", async ({
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
    // The Armorbreaker redo: the huge runic anvil mounted on
    // the stone crown block, where the translucent energy
    // ribbons used to swirl around the whole body.
    { state: "0-3-0", upgrades: [1, 1, 1], at: [342, 263] },
    // The Arcane Empowerer + Binding Marks redo: three solid
    // interlocking stone rings on a chained base, where the
    // translucent energy rings used to float.
    { state: "3-0-1", upgrades: [0, 0, 0, 2], at: [743, 396] },
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
    await fireAndCapture(page, built);
    await page.screenshot({ path: `${QA}/runesmith-${scene.state}.png` });
    await page.evaluate((p) => window.__proof.moveEnemy(p), built.park);
  }

  // Family shot: the headline redos alongside kept states, all
  // on one battlefield, mid-fight.
  const family = await page.evaluate(() =>
    window.__proof.family([
      { paths: "0-0-0", upgrades: [] },
      { paths: "0-3-0", upgrades: [1, 1, 1] },
      { paths: "3-0-1", upgrades: [0, 0, 0, 2] },
      { paths: "3-0-0", upgrades: [0, 0, 0] },
      { paths: "0-2-0", upgrades: [1, 1] },
      { paths: "1-3-0", upgrades: [1, 1, 1, 0] },
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
  await page.screenshot({ path: `${QA}/runesmith-family.png` });
  expect(errors).toEqual([]);
});
