import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { layeredMuzzle, towerDisplaySize } from "../../src/data/towers.js";
import { towerLayer } from "../../src/towerArtwork.js";

// Tower-turning proof, aim model v3 — HYBRID (2026-10-19): towers
// are STATIC (Kingdom Rush style). No top rotates, ever: v1's full
// in-plane spin read as the tower "tipped sideways", and v2's rigid
// flip + tilt still looked off. Cannon tops instead ship as three
// DRAWN poses (raised / level / down) with per-pose emitters: the
// scene shows the pose for the target's elevation band, flipped to
// the target's side, and a fired projectile's draw start rides the
// ACTIVE pose's emitter. Wind crowns are fully static. QA stills land
// in ~/workspace/ts-proof-art/qa/.
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
async function moveEnemy(page, progress) {
  await page.evaluate((p) => {
    const { model: g } = window.__tinySiege;
    const e = g.enemies.find((e) => e.id === window.__proof.enemyId);
    e.progress = p;
    Object.assign(e, g.trails[0].onPath(e.progress));
  }, progress);
}
// Poll until the tower's top shows the wanted texture + flip with
// rotation exactly 0, then sample a few frames of it holding.
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
  // Drop earlier shots from this tower so the wait below only sees a
  // fresh one fired under the current pose.
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

test("cannon aims with drawn poses, wind stays static — nothing rotates", async ({
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
    // Capture every shot's draw start together with the pose + flip
    // that produced it, synchronously at fire time (the draw point
    // races toward the logical position within a few frames, so
    // polling would miss the muzzle).
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
          pose: t._aimPose,
          flip: t._aimFlip,
        });
    };
    // A pinned, effectively immortal enemy: speed 0 keeps it exactly
    // where its trail progress puts it. Find trail positions in
    // cannon range for each pose phase by the elevation φ =
    // atan2(−dy, |dx|) from the cannon's pivot (cannon 0-0-0 pivot
    // fractions, display 96).
    const trail = g.trails[0],
      pivot = {
        x: cannon.x + (0.499 - 0.5) * 96,
        y: cannon.y + (0.57 - 0.96) * 96,
      };
    const find = (ok) => {
      for (let p = 40; p < 2400; p += 5) {
        const pos = trail.onPath(p);
        if (!pos || !Number.isFinite(pos.x)) continue;
        const dx = pos.x - pivot.x,
          dy = pos.y - pivot.y,
          d = Math.hypot(pos.x - cannon.x, pos.y - cannon.y),
          phi = (Math.atan2(-dy, Math.abs(dx)) * 180) / Math.PI;
        if (ok({ dx, dy, d, phi })) return p;
      }
      return null;
    };
    // RAISED: up-LEFT, well past the 9° + 2.5° hysteresis edge.
    const pRaised = find(
      (i) => i.d >= 85 && i.d <= 140 && i.dx < 0 && i.phi >= 18 && i.phi <= 45,
    );
    // DOWN: down-RIGHT, well past the lower edge (the trail dives
    // steeply below the cannon here, so φ runs past −45°).
    const pDown = find(
      (i) => i.d >= 85 && i.d <= 140 && i.dx > 0 && i.phi >= -80 && i.phi <= -18,
    );
    // LEVEL: within the band on either side.
    const pLevel = find((i) => i.d >= 85 && i.d <= 140 && Math.abs(i.phi) <= 6);
    // WIND: any position in wind range (the crown must not react).
    const pWind = (() => {
      for (let p = 40; p < 2400; p += 5) {
        const pos = trail.onPath(p);
        if (!pos || !Number.isFinite(pos.x)) continue;
        const d = Math.hypot(pos.x - wind.x, pos.y - wind.y);
        if (d >= 60 && d <= 140) return p;
      }
      return null;
    })();
    if (pRaised === null || pDown === null || pLevel === null || pWind === null)
      throw new Error(
        `trail scan missed a phase: raised=${pRaised} down=${pDown} level=${pLevel} wind=${pWind}`,
      );
    Object.assign(window.__proof, { pRaised, pDown, pLevel, pWind });
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

  // All three cannon pose textures load up front; at rest the top is
  // the level pose, unflipped, rotation exactly 0.
  await page.waitForFunction(() => {
    const { ui } = window.__tinySiege;
    return ["", "-raised", "-down"].every((s) =>
      ui.scene.textures.exists(`v5-cannon-0-0-0-top${s}`),
    );
  });
  await expectPose(page, proof.cannonId, "v5-cannon-0-0-0-top", false);

  // RAISED / LEFT: the raised drawn pose, no flip, and a fired shell
  // leaves from the raised pose's emitter.
  await moveEnemy(page, proof.pRaised);
  await expectPose(page, proof.cannonId, "v5-cannon-0-0-0-top-raised", false);
  await page.screenshot({ path: `${QA}/pose-raised-v1.png` });
  await expectShot(page, proof.cannonId, "cannon", "raised", false);

  // DOWN / RIGHT: the down drawn pose, flipped, shell from the down
  // pose's mirrored emitter.
  await moveEnemy(page, proof.pDown);
  await expectPose(page, proof.cannonId, "v5-cannon-0-0-0-top-down", true);
  await page.screenshot({ path: `${QA}/pose-down-v1.png` });
  await expectShot(page, proof.cannonId, "cannon", "down", true);

  // LEVEL: a near-level bearing settles back to the level pose.
  await moveEnemy(page, proof.pLevel);
  await page.waitForFunction((id) => {
    const top = window.__tinySiege.ui.scene.towerTops.get(id);
    return top?.texture.key === "v5-cannon-0-0-0-top" && top.rotation === 0;
  }, proof.cannonId);
  await page.screenshot({ path: `${QA}/pose-level-v1.png` });

  // WIND: with the enemy in range and firing, the crown's top never
  // rotates, never flips, never swaps — fully static.
  await page.waitForFunction(() =>
    Boolean(window.__tinySiege.ui.scene.towerTops.get(window.__proof.windId)),
  );
  await moveEnemy(page, proof.pWind);
  await expectPose(page, proof.windId, "v5-wind-0-0-0-top", false, 5);

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

  // Upgrading swaps the layers to the new state (cannon 3-0-0 has
  // drawn poses too; the enemy is out of its range here, so it rests
  // at the level pose)...
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

test("cluster, mortar and worldhammer cannons aim with drawn poses too", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await enterFreePlay(page);

  // Per-state geometry, from the same data the game ships.
  const geo = {};
  for (const [name, paths] of Object.entries({
    cluster: [0, 3, 0],
    mortar: [0, 0, 3],
    anchor: [3, 0, 0],
    ascended: [3, 3, 3],
  })) {
    const layer = towerLayer({ type: "cannon", paths });
    geo[name] = {
      pivot: layer.pivot,
      display: towerDisplaySize({ type: "cannon", paths }),
    };
  }

  await page.evaluate((geo) => {
    const { model: g } = window.__tinySiege;
    g.reset();
    g.gold = 100000;
    const cluster = g.place("cannon", 145, 105);
    const mortar = g.place("cannon", 342, 263);
    const anchor = g.place("cannon", 743, 396);
    if (!cluster || !mortar || !anchor)
      throw new Error("rollout placements were rejected");
    for (let i = 0; i < 3; i++) g.upgrade(cluster.id, 1);
    for (let i = 0; i < 3; i++) g.upgrade(mortar.id, 2);
    for (let i = 0; i < 3; i++) g.upgrade(anchor.id, 0);
    window.__proof = {
      clusterId: cluster.id,
      mortarId: mortar.id,
      anchorId: anchor.id,
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
          pose: t._aimPose,
          flip: t._aimFlip,
        });
    };
    // Find a trail progress whose position sits at the wanted
    // elevation band from a tower's pivot (same φ convention as the
    // proof test: φ = atan2(−dy, |dx|) from the pivot).
    const findFor = (t, { pivot, display }, ok, rangeOverride) => {
      const trail = g.trails[0];
      const pv = {
        x: t.x + (pivot[0] - 0.5) * display,
        y: t.y + (pivot[1] - 0.96) * display,
      };
      const range = rangeOverride ?? g.effectiveStats(t).range;
      for (let p = 40; p < 2400; p += 5) {
        const pos = trail.onPath(p);
        if (!pos || !Number.isFinite(pos.x)) continue;
        const dx = pos.x - pv.x,
          dy = pos.y - pv.y,
          d = Math.hypot(pos.x - t.x, pos.y - t.y),
          phi = (Math.atan2(-dy, Math.abs(dx)) * 180) / Math.PI;
        if (d >= 85 && d <= Math.min(150, range - 15) && ok({ dx, dy, d, phi }))
          return p;
      }
      return null;
    };
    const phases = {};
    phases.mortarRaised = findFor(mortar, geo.mortar, (i) => i.dx < 0 && i.phi >= 18 && i.phi <= 50);
    phases.clusterDown = findFor(cluster, geo.cluster, (i) => i.dx > 0 && i.phi <= -18 && i.phi >= -85);
    phases.anchorLevel = findFor(anchor, geo.anchor, (i) => i.dx < 0 && Math.abs(i.phi) <= 6);
    // The ascended Worldhammer keeps the anchor's spot but pivots
    // from its own geometry; find its level bearing now (its range
    // only grows, so the anchor's range window stays valid).
    phases.ascendedLevel = findFor(
      anchor,
      geo.ascended,
      (i) => i.dx < 0 && Math.abs(i.phi) <= 6,
      g.effectiveStats(anchor).range,
    );
    // Park the enemy where NO tower can reach it.
    let park = null;
    for (let p = 40; p < 2400 && park === null; p += 5) {
      const pos = g.trails[0].onPath(p);
      if (!pos || !Number.isFinite(pos.x)) continue;
      const clear = [cluster, mortar, anchor].every(
        (t) => Math.hypot(pos.x - t.x, pos.y - t.y) > g.effectiveStats(t).range + 30,
      );
      if (clear) park = p;
    }
    if (
      phases.mortarRaised === null ||
      phases.clusterDown === null ||
      phases.anchorLevel === null ||
      phases.ascendedLevel === null ||
      park === null
    )
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
  }, geo);
  const proof = await page.evaluate(() => window.__proof);

  // At rest all three Tier-3 cannons wear their level pose tops.
  await expectPose(page, proof.clusterId, "v5-cannon-0-3-0-top", false);
  await expectPose(page, proof.mortarId, "v5-cannon-0-0-3-top", false);
  await expectPose(page, proof.anchorId, "v5-cannon-3-0-0-top", false);

  // GRAND MORTAR, raised / left: drawn raised pose, shell from its
  // raised emitter.
  await moveEnemy(page, proof.mortarRaised);
  await expectPose(page, proof.mortarId, "v5-cannon-0-0-3-top-raised", false);
  await page.screenshot({ path: `${QA}/rollout-mortar-raised.png` });
  await expectShot(page, proof.mortarId, "cannon", "raised", false);

  // CLUSTER BOMBARD, down / right: drawn down pose, flipped, shell
  // from the mirrored down emitter.
  await moveEnemy(page, proof.clusterDown);
  await expectPose(page, proof.clusterId, "v5-cannon-0-3-0-top-down", true);
  await page.screenshot({ path: `${QA}/rollout-cluster-down.png` });
  await expectShot(page, proof.clusterId, "cannon", "down", true);

  // Fuse the three evolutions: the Worldhammer keeps the pose system
  // (ascended layers resolve under tower_cannon_ascended). Settle the
  // anchor's aim first (its upgrades reset _aimPose; a shot fired
  // before the scene's next aim pass would record no pose).
  await moveEnemy(page, proof.anchorLevel);
  await expectPose(page, proof.anchorId, "v5-cannon-3-0-0-top", false);
  await expectShot(page, proof.anchorId, "cannon", "level", false);
  const ascended = await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    return g.ascend(window.__proof.anchorId);
  });
  expect(ascended).toBe(true);
  await page.waitForFunction(() => {
    const { ui } = window.__tinySiege;
    return (
      ui.scene.towerTops.get(window.__proof.anchorId)?.texture.key ===
      "v5-cannon-ascended-top"
    );
  });
  await page.screenshot({ path: `${QA}/rollout-worldhammer-level.png` });
  // The fused tower fires from its own level emitter, still unrotated
  // (ascension reset its aim too — settle the pose before the shot).
  await moveEnemy(page, proof.ascendedLevel);
  await expectPose(page, proof.anchorId, "v5-cannon-ascended-top", false);
  await expectShot(page, proof.anchorId, "cannon", "level", false);
  const topState = await page.evaluate((id) => {
    const top = window.__tinySiege.ui.scene.towerTops.get(id);
    return { key: top.texture.key, rotation: top.rotation };
  }, proof.anchorId);
  expect(topState.key).toBe("v5-cannon-ascended-top");
  expect(topState.rotation).toBe(0);
  expect(errors).toEqual([]);
});
