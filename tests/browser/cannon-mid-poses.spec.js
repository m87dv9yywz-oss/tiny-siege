import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { layeredMuzzle, towerDisplaySize } from "../../src/data/towers.js";
import { towerLayer } from "../../src/towerArtwork.js";

// Cannon mid-tier pose rollout (2026-10-21, owner: "do them all to
// the standard — only redo a tower if it doesn't hold the standard"):
// the 21 cannon states that were still flat single sprites in PR #41
// now ship as planted base + three DRAWN pose tops (batch-3 art),
// exactly like the Tier-3 rollout states. They also STOP mirroring
// (PR #43's flat-art flip): a layered tower's base never flips and
// its top flips with the pose system instead. QA stills land in
// ~/workspace/ts-proof-art/qa/cannonmid-*.png.
const QA = `${process.env.HOME}/workspace/ts-proof-art/qa`;
mkdirSync(QA, { recursive: true });

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function createProfile(page) {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill("Midtier Knight");
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
async function expectPose(page, towerId, key, flip, samples = 3) {
  await page.waitForFunction(
    ({ id, key, flip }) => {
      const { ui } = window.__tinySiege;
      const top = ui.scene.towerTops.get(id);
      return (
        top &&
        top.texture.key === key &&
        top.flipX === flip &&
        top.rotation === 0
      );
    },
    { id: towerId, key, flip },
    { timeout: 10000 },
  );
  for (let i = 0; i < samples; i++) {
    const s = await page.evaluate((id) => {
      const top = window.__tinySiege.ui.scene.towerTops.get(id);
      return { key: top.texture.key, flip: top.flipX, rotation: top.rotation };
    }, towerId);
    expect(s.key).toBe(key);
    expect(s.flip).toBe(flip);
    expect(s.rotation).toBe(0);
    await page.waitForTimeout(150);
  }
}
async function expectShot(page, towerId, type, wantPose, wantFlip) {
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
  const shot = await page.evaluate((id) => {
    const { model: g } = window.__tinySiege;
    const t = g.towers.find((t) => t.id === id);
    const s = window.__proof.shots.find((s) => s.towerId === id);
    return { shot: s, x: t.x, y: t.y, paths: t.paths };
  }, towerId);
  expect(shot.shot.pose).toBe(wantPose);
  expect(shot.shot.flip).toBe(wantFlip);
  const layer = towerLayer({ type, paths: shot.paths });
  const emitter = layeredMuzzle(
    { type, x: shot.x, y: shot.y, paths: shot.paths },
    layer,
    shot.shot.pose,
    shot.shot.flip,
  );
  expect(
    Math.hypot(shot.shot.x - emitter.x, shot.shot.y - emitter.y),
  ).toBeLessThan(14);
}
// Shared setup: place + upgrade the given cannons, capture shots at
// fire time, scan the trail for each tower's wanted phases, park an
// immortal enemy out of everyone's range.
async function setup(page, geo, placements) {
  await page.evaluate(
    ({ geo, placements }) => {
      const { model: g } = window.__tinySiege;
      g.reset();
      g.gold = 100000;
      const towers = {};
      for (const [name, [x, y, upgrades]] of Object.entries(placements)) {
        const t = g.place("cannon", x, y);
        if (!t) throw new Error(`placement rejected for ${name}`);
        for (const path of upgrades) g.upgrade(t.id, path);
        towers[name] = t;
      }
      window.__proof = { shots: [], ids: {} };
      for (const [name, t] of Object.entries(towers))
        window.__proof.ids[name] = t.id;
      const orig = g.attack.bind(g);
      g.attack = (t, targets, stats) => {
        const before = g.projectiles.length;
        orig(t, targets, stats);
        for (const p of g.projectiles.slice(before))
          window.__proof.shots.push({
            towerId: t.id,
            x: p.draw.x,
            y: p.draw.y,
            pose: t._aimPose,
            flip: t._aimFlip,
          });
      };
      const findFor = (t, geoEntry, ok, dMin = 60, dSlack = 10) => {
        const { pivot, display } = geoEntry;
        const trail = g.trails[0];
        const pv = {
          x: t.x + (pivot[0] - 0.5) * display,
          y: t.y + (pivot[1] - 0.96) * display,
        };
        const range = g.effectiveStats(t).range;
        for (let p = 40; p < 2400; p += 5) {
          const pos = trail.onPath(p);
          if (!pos || !Number.isFinite(pos.x)) continue;
          const dx = pos.x - pv.x,
            dy = pos.y - pv.y,
            d = Math.hypot(pos.x - t.x, pos.y - t.y),
            phi = (Math.atan2(-dy, Math.abs(dx)) * 180) / Math.PI;
          if (d >= dMin && d <= range - dSlack && ok({ dx, dy, d, phi }))
            return { p, flip: dx > 0 };
        }
        return null;
      };
      const phases = {};
      const flips = {};
      for (const [name, wants] of Object.entries(geo.phases)) {
        const inWindow = (w) => (i) =>
          (w.side === 0 || Math.sign(i.dx) === w.side) &&
          i.phi >= w.phiMin &&
          i.phi <= w.phiMax;
        // Strict window first; the widened window stays inside the
        // same pose band (bands engage past ±11.5° from level), so
        // the pose/flip assertions are unaffected by which matched.
        const found =
          findFor(towers[geo.of[name]], geo[geo.of[name]], inWindow(wants)) ??
          findFor(
            towers[geo.of[name]],
            geo[geo.of[name]],
            inWindow({
              side: wants.side,
              phiMin: wants.widePhiMin,
              phiMax: wants.widePhiMax,
            }),
            50,
            5,
          );
        phases[name] = found?.p ?? null;
        flips[name] = found?.flip ?? null;
      }
      window.__proof.flips = flips;
      let park = null;
      for (let p = 40; p < 2400 && park === null; p += 5) {
        const pos = g.trails[0].onPath(p);
        if (!pos || !Number.isFinite(pos.x)) continue;
        const clear = Object.values(towers).every(
          (t) =>
            Math.hypot(pos.x - t.x, pos.y - t.y) >
            g.effectiveStats(t).range + 30,
        );
        if (clear) park = p;
      }
      if (Object.values(phases).some((v) => v === null) || park === null)
        throw new Error(
          `trail scan missed a phase: ${JSON.stringify({ ...phases, park })}`,
        );
      Object.assign(window.__proof, phases);
      const e = g.spawn("basic");
      e.progress = park;
      e.speed = 0;
      e.health = 1e12;
      e.armor = 0;
      Object.assign(e, g.trails[0].onPath(park));
      window.__proof.enemyId = e.id;
      g.startWave();
      g.queue = [];
    },
    { geo, placements },
  );
  return page.evaluate(() => window.__proof);
}
function geoFor(spec) {
  // spec: { name: { paths, phases: { phaseName: {of, side, phiMin,
  // phiMax, widePhiMin, widePhiMax} } } } — flattened below into the
  // shape setup() consumes. Phase windows are plain data (side: −1
  // left / +1 right / 0 any; φ in degrees, up positive) because
  // page.evaluate args must serialize — no closures cross into the
  // page.
  const geo = { phases: {}, of: {} };
  for (const [name, { paths, phases }] of Object.entries(spec)) {
    const layer = towerLayer({ type: "cannon", paths });
    geo[name] = {
      pivot: layer.pivot,
      display: towerDisplaySize({ type: "cannon", paths }),
    };
    for (const [phase, w] of Object.entries(phases)) {
      geo.phases[phase] = w;
      geo.of[phase] = w.of;
    }
  }
  return geo;
}

test("mid-tier cannons aim with drawn poses — 2-0-0, twin 0-2-0, mortar 1-0-3", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await enterFreePlay(page);

  const geo = geoFor({
    two: {
      paths: [2, 0, 0],
      phases: {
        twoRaised: {
          of: "two", side: -1, phiMin: 18, phiMax: 50,
          widePhiMin: 13, widePhiMax: 55,
        },
        twoDown: {
          of: "two", side: 1, phiMin: -85, phiMax: -18,
          widePhiMin: -88, widePhiMax: -13,
        },
      },
    },
    twin: {
      paths: [0, 2, 0],
      phases: {
        // (145, 105) has no shallow in-range bearing — the trail
        // dives below-right of it (the same window the rollout
        // spec proved for the cluster at this spot).
        twinDown: {
          of: "twin", side: 1, phiMin: -85, phiMax: -18,
          widePhiMin: -88, widePhiMax: -13,
        },
      },
    },
    mortar: {
      paths: [1, 0, 3],
      phases: {
        mortarRaised: {
          of: "mortar", side: -1, phiMin: 18, phiMax: 50,
          widePhiMin: 13, widePhiMax: 55,
        },
      },
    },
  });
  const proof = await setup(page, geo, {
    two: [342, 263, [0, 0]],
    twin: [145, 105, [1, 1]],
    mortar: [743, 396, [0, 2, 2, 2]],
  });
  const ids = proof.ids;

  // At rest the mid-tier tops are the level poses, unflipped.
  await expectPose(page, ids.two, "v5-cannon-2-0-0-top", false);
  await expectPose(page, ids.twin, "v5-cannon-0-2-0-top", false);
  await expectPose(page, ids.mortar, "v5-cannon-1-0-3-top", false);

  // 2-0-0 RAISED / LEFT: drawn raised pose; the shell leaves from
  // the raised pose's measured emitter.
  await moveEnemy(page, proof.twoRaised);
  await expectPose(page, ids.two, "v5-cannon-2-0-0-top-raised", false);
  await page.screenshot({ path: `${QA}/cannonmid-2-0-0-raised.png` });
  await expectShot(page, ids.two, "cannon", "raised", false);

  // 2-0-0 DOWN / RIGHT: drawn down pose, flipped to the target's
  // side; shell from the mirrored down emitter. The BASE sprite
  // never flips — only the top does (layered contract).
  await moveEnemy(page, proof.twoDown);
  await expectPose(page, ids.two, "v5-cannon-2-0-0-top-down", true);
  await page.screenshot({ path: `${QA}/cannonmid-2-0-0-down.png` });
  await expectShot(page, ids.two, "cannon", "down", true);
  const baseFlip = await page.evaluate((id) => {
    return window.__tinySiege.ui.scene.towerSprites.get(id)?.flipX;
  }, ids.two);
  expect(baseFlip).toBe(false);

  // TWIN 0-2-0 DOWN / RIGHT: drawn down pose, flipped; the shot
  // leaves from the down pose's mirrored drawn muzzle.
  await moveEnemy(page, proof.twinDown);
  await expectPose(page, ids.twin, "v5-cannon-0-2-0-top-down", true);
  await page.screenshot({ path: `${QA}/cannonmid-0-2-0-firing.png` });
  await expectShot(page, ids.twin, "cannon", "down", true);

  // MORTAR 1-0-3 RAISED / LEFT: drawn raised pose + emitter.
  await moveEnemy(page, proof.mortarRaised);
  await expectPose(page, ids.mortar, "v5-cannon-1-0-3-top-raised", false);
  await page.screenshot({ path: `${QA}/cannonmid-1-0-3-raised.png` });
  await expectShot(page, ids.mortar, "cannon", "raised", false);

  expect(errors).toEqual([]);
});

test("0-3-1 cluster fires its raised pose; 3-1-0 fights layered", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await enterFreePlay(page);

  const geo = geoFor({
    cluster: {
      paths: [0, 3, 1],
      phases: {
        clusterRaised: {
          of: "cluster", side: -1, phiMin: 18, phiMax: 50,
          widePhiMin: 13, widePhiMax: 55,
        },
      },
    },
    spike: {
      paths: [3, 1, 0],
      phases: {
        // Either side at level: (743, 396)'s shallow stretch is on
        // the left for the Tier-3 anchor; whichever side matches,
        // the expected flip comes back in proof.flips.
        spikeLevel: {
          of: "spike", side: 0, phiMin: -6, phiMax: 6,
          widePhiMin: -9, widePhiMax: 9,
        },
      },
    },
  });
  const proof = await setup(page, geo, {
    cluster: [342, 263, [1, 1, 1, 2]],
    spike: [743, 396, [0, 0, 0, 1]],
  });
  const ids = proof.ids;

  // All three 0-3-1 pose textures exist — including the raised pose
  // generated in Phase 2 to close the batch-3 gap.
  await page.waitForFunction(() => {
    const { ui } = window.__tinySiege;
    return ["", "-raised", "-down"].every((s) =>
      ui.scene.textures.exists(`v5-cannon-0-3-1-top${s}`),
    );
  });
  await expectPose(page, ids.cluster, "v5-cannon-0-3-1-top", false);

  // RAISED / LEFT: the new raised pose renders and fires from its
  // own measured emitter.
  await moveEnemy(page, proof.clusterRaised);
  await expectPose(page, ids.cluster, "v5-cannon-0-3-1-top-raised", false);
  await page.screenshot({ path: `${QA}/cannonmid-0-3-1-raised.png` });
  await expectShot(page, ids.cluster, "cannon", "raised", false);

  // 3-1-0 — the one cannon whose FLAT art faced left and mirrored
  // under PR #43 — now fights as a layered tower: level top facing
  // the target's side (flip per the found bearing), unflipped
  // planted base, shell from the level emitter on that side.
  await moveEnemy(page, proof.spikeLevel);
  await expectPose(page, ids.spike, "v5-cannon-3-1-0-top", proof.flips.spikeLevel);
  await page.screenshot({ path: `${QA}/cannonmid-3-1-0-battle.png` });
  await expectShot(page, ids.spike, "cannon", "level", proof.flips.spikeLevel);
  const spikeBase = await page.evaluate((id) => {
    return window.__tinySiege.ui.scene.towerSprites.get(id)?.flipX;
  }, ids.spike);
  expect(spikeBase).toBe(false);

  expect(errors).toEqual([]);
});

test("redrawn carriages sit planted at scene scale — 2-0-1, 2-1-0", async ({
  page,
}) => {
  // The three batch-3 states whose first tops floated on a single
  // central wheel (owner, on the contact sheet: "some are floating
  // and some look weird with only one wheel") were REDRAWN with
  // supports sharing one ground line: 2-0-1 and 2-1-0 gained a
  // smaller front trail wheel, 3-1-0 (covered above) a front stone
  // foot + rear skid. The staging gate verifies every support
  // cluster touches the deck (21/21); these stills are the
  // scene-scale visual record for the two wheel carriages.
  test.setTimeout(240000);
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await enterFreePlay(page);

  const geo = geoFor({
    spy: {
      paths: [2, 0, 1],
      phases: {
        spyLevel: {
          of: "spy", side: 0, phiMin: -6, phiMax: 6,
          widePhiMin: -9, widePhiMax: 9,
        },
      },
    },
    brass: {
      paths: [2, 1, 0],
      phases: {
        // (145, 105) has no shallow in-range bearing (the trail
        // dives below-right of it — same window the twin test
        // proved at this spot), so the planted still is the DOWN
        // pose flipped to the target's side.
        brassDown: {
          of: "brass", side: 1, phiMin: -85, phiMax: -18,
          widePhiMin: -88, widePhiMax: -13,
        },
      },
    },
  });
  const proof = await setup(page, geo, {
    spy: [342, 263, [0, 0, 2]],
    brass: [145, 105, [0, 0, 1]],
  });
  const ids = proof.ids;

  await expectPose(page, ids.spy, "v5-cannon-2-0-1-top", false);
  await expectPose(page, ids.brass, "v5-cannon-2-1-0-top", false);

  await moveEnemy(page, proof.spyLevel);
  await expectPose(page, ids.spy, "v5-cannon-2-0-1-top", proof.flips.spyLevel);
  await page.screenshot({ path: `${QA}/cannonmid-2-0-1-placed.png` });

  await moveEnemy(page, proof.brassDown);
  await expectPose(page, ids.brass, "v5-cannon-2-1-0-top-down", proof.flips.brassDown);
  await page.screenshot({ path: `${QA}/cannonmid-2-1-0-placed.png` });

  expect(errors).toEqual([]);
});
