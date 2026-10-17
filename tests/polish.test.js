import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/systems/Game.js";
import {
  TOWERS,
  attackVisual,
  towerStats,
  upgradeState,
} from "../src/data/towers.js";
import { CAMPAIGNS } from "../src/data/waves.js";
import { introductionsFor } from "../src/data/introductions.js";
import { pathPreview } from "../src/upgradeGuide.js";
import {
  freshProfile,
  migrateProfile,
  applyOperation,
  validateProfile,
} from "../src/progression/profiles.js";
import { cloudProfile } from "../src/cloud/schema.js";
import { mergeProfiles } from "../src/cloud/firebase.js";
test("every tower path and tier has a distinct attack recipe and an exact future stat preview", () => {
  for (const type of Object.keys(TOWERS))
    for (let path = 0; path < 3; path++) {
      const t = { type, paths: [0, 0, 0] };
      const previews = pathPreview(t, path);
      const recipes = new Set();
      for (let n = 0; n <= 3; n++) {
        t.paths[path] = n;
        recipes.add(JSON.stringify(attackVisual(t)));
        if (n) {
          assert.deepEqual(previews[n - 1].stats, towerStats(t));
          assert(previews[n - 1].changes.length);
        }
      }
      assert.equal(recipes.size, 4);
    }
});
test("Grove respects costs, secondary restrictions, selling and three specialized evolutions", () => {
  for (let path = 0; path < 3; path++) {
    const g = new Game();
    assert.equal(TOWERS.grove.cost, 115);
    const t = g.place("grove", 145, 105);
    assert.equal(g.gold, 185);
    // Mechanics fixture: campaign affordability is verified separately using earned gold.
    g.gold = 2000;
    for (let n = 0; n < 3; n++) assert(g.upgrade(t.id, path));
    assert.equal(t.paths[path], 3);
    assert(g.upgrade(t.id, (path + 1) % 3));
    assert(upgradeState(t, (path + 1) % 3).locked);
    assert(upgradeState(t, (path + 2) % 3).locked);
    const refund = Math.floor(t.invested * 0.7),
      before = g.gold;
    assert(g.sell(t.id));
    assert.equal(g.gold, before + refund);
  }
});
test("Grove piercing thorns break armor, bouncing pods visit distinct foes, root patches expire and bosses resist roots", () => {
  const events = [],
    g = new Game((e) => events.push(e));
  g.gold = 10000;
  const t = g.place("grove", 145, 105);
  t.paths = [3, 0, 0];
  const armored = g.spawn("armored");
  g.applyHit({ type: "grove", stats: towerStats(t) }, armored);
  assert.equal(armored.armor, 0);
  assert(armored.health < armored.maxHealth);
  g.enemies = [];
  const enemies = Array.from({ length: 7 }, () => g.spawn("brute"));
  enemies.forEach((e, i) => {
    e.x = 200 + i * 65;
    e.y = 250;
  });
  t.paths = [0, 3, 0];
  g.impact({
    type: "grove",
    towerId: t.id,
    target: enemies[0],
    stats: towerStats(t),
    origin: t,
  });
  assert.equal(events.filter((e) => e.type === "seedBounce").length, 4);
  assert.equal(enemies.filter((e) => e.health < e.maxHealth).length, 5);
  g.enemies = [];
  t.paths = [0, 0, 3];
  const brute = g.spawn("brute");
  brute.x = 220;
  brute.y = 250;
  g.impact({
    type: "grove",
    towerId: t.id,
    target: brute,
    stats: towerStats(t),
    origin: t,
  });
  assert(g.zones[0].slow);
  assert(brute.slow < 1);
  g.active = true;
  g.queue = [];
  for (let n = 0; n < 70; n++) g.update(0.05);
  assert.equal(g.zones.length, 0);
  const boss = g.spawn("boss");
  g.chill(boss, 0.5, 3, 0.7);
  const first = boss.frozen;
  g.chill(boss, 0.5, 3, 0.7);
  assert(boss.frozen <= first);
  assert(boss.frozen < 0.7);
});
test("enemy introductions occur only before the first wave containing a class on every map", () => {
  for (const c of Object.values(CAMPAIGNS)) {
    const seen = new Set();
    for (let wave = 1; wave <= c.waves.length; wave++)
      for (const type of introductionsFor(c, wave)) {
        assert(!seen.has(type));
        seen.add(type);
      }
  }
  assert.deepEqual(introductionsFor(CAMPAIGNS.emerald, 7), ["armored"]);
  assert.equal(CAMPAIGNS.garden.waves.length, 18);
});
test("v3 local and wire saves migrate losslessly; Grove progress and fourth-map rewards survive merges and repeat imports", () => {
  const old = freshProfile("Old hero");
  old.schemaVersion = 1;
  for(const t of ["grove","wind","rune","tidecaller"]) {delete old.towerXP[t];delete old.unlockedUpgrades[t];}
  for(const k of ["heroes","relics","mapProgress"])delete old[k];
  delete old.towerXP.grove;
  delete old.unlockedUpgrades.grove;
  old.crowns = 90;
  old.statistics.ledger = "|original|";
  old.unlockedUpgrades.archer = [3, 1, 1];
  old.towerXP.archer = { earned: 900, spent: 680 };
  const oldWire = {
    ...old,
    towerXP: Object.fromEntries(
      Object.entries(old.towerXP).flatMap(([t, x]) => [
        [t + "Earned", x.earned],
        [t + "Spent", x.spent],
      ]),
    ),
  };
  assert(validateProfile(old));
  const a = migrateProfile(old),
    b = migrateProfile(oldWire);
  assert.deepEqual(a, b);
  assert.equal(a.statistics.ledger, old.statistics.ledger);
  assert.deepEqual(a.towerXP.archer, old.towerXP.archer);
  assert.equal(a.schemaVersion, 3);
  let p = applyOperation(a, {
    id: "grove-unlock",
    type: "tower",
    tower: "grove",
  });
  assert.equal(p.crowns, 0);
  p = applyOperation(p, {
    id: "garden-clear",
    type: "reward",
    map: "garden",
    win: true,
    stars: 3,
    xp: { grove: 350 },
    stats: {},
  });
  assert.equal(p.crowns, 140);
  assert.equal(p.towerXP.grove.earned, 350);
  p = applyOperation(p, {
    id: "grove-tier2",
    type: "path",
    tower: "grove",
    path: 1,
    tier: 2,
  });
  assert.equal(p.towerXP.grove.spent, 180);
  assert.deepEqual(migrateProfile(cloudProfile(p)), p);
  const merged = mergeProfiles(p, a);
  assert.equal(merged.crowns, p.crowns);
  assert.equal(merged.towerXP.grove.spent, 180);
  assert.deepEqual(merged.mapStars, { garden: 3 });
  assert.throws(() => migrateProfile({ ...old, schemaVersion: 4 }));
  assert.throws(() =>
    migrateProfile({
      ...oldWire,
      towerXP: { ...oldWire.towerXP, groveEarned: 999 },
    }),
  );
});

test("locked-path blueprints never preview illegal 3-1-1 builds", () => {
  const t = { type: "archer", paths: [3, 1, 0] };
  assert.deepEqual(
    pathPreview(t, 2)[2].stats,
    towerStats({ ...t, paths: [1, 0, 3] }),
  );
});

test("piercing Grove crosspaths keep their impact splash without double hits", () => {
  const g = new Game();
  const t = g.place("grove", 145, 105);
  t.paths = [2, 1, 0];
  const foes = Array.from({ length: 4 }, () => g.spawn("brute"));
  [
    [200, 105],
    [195, 132],
    [175, 105],
    [200, 155],
  ].forEach(([x, y], i) => Object.assign(foes[i], { x, y }));
  const stats = towerStats(t);
  g.impact({ type: "grove", towerId: t.id, target: foes[0], origin: t, stats });
  for (const e of foes.slice(0, 3))
    assert.equal(e.maxHealth - e.health, stats.damage);
  assert.equal(foes[3].health, foes[3].maxHealth);
});
