import { Game } from "../src/systems/Game.js";
import { TOWERS } from "../src/data/towers.js";
import { CAMPAIGNS } from "../src/data/waves.js";
import {
  freshProfile,
  applyOperation,
  rewardForRun,
  TYPES,
  UNLOCK_COSTS,
} from "../src/progression/profiles.js";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
let serial = 0;
function positions(g, range = 145) {
  const points = [];
  for (let y = 75; y <= 595; y += 35)
    for (let x = 40; x <= 920; x += 35) {
      if (
        g.trail.distanceToPath(x, y) < 46 ||
        (g.canPlace("archer", x, y) &&
          !g.canPlace("archer", x, y).includes("gold"))
      )
        continue;
      const coverage = g.trail.PATH.reduce(
        (n, p) => n + (Math.hypot(p.x - x, p.y - y) < range ? 1 : 0),
        0,
      );
      points.push({ x, y, coverage });
    }
  return points.sort(
    (a, b) => b.coverage - a.coverage || a.y - b.y || a.x - b.x,
  );
}
function spend(g, style) {
  const preferences =
    style === "physical"
      ? [
          "archer",
          "cannon",
          "rune",
          "frost",
          "wind",
          "grove",
          "fire",
          "lightning",
        ]
      : style === "magic"
        ? [
            "fire",
            "wind",
            "lightning",
            "frost",
            "archer",
            "rune",
            "cannon",
            "grove",
          ]
        : [
            "archer",
            "cannon",
            "frost",
            "grove",
            "wind",
            "rune",
            "fire",
            "lightning",
          ];
  const paths = {
    archer: 0,
    cannon: 0,
    frost: 1,
    fire: 2,
    lightning: 1,
    grove: 1,
    wind: style === "control" ? 0 : 1,
    rune: style === "control" ? 0 : 1,
  };
  const available = preferences.filter((t) => g.available(t));
  for (let actions = 0; actions < 60; actions++) {
    let done = false;
    // Reliable starter foundations before specializations; no injected resources.
    if (g.towers.length < Math.min(12, 3 + Math.floor(g.wave / 2))) {
      const type = available[g.towers.length % available.length];
      if (g.gold >= TOWERS[type].cost) {
        const point = positions(g, TOWERS[type].base.range).find(
          (p) => !g.canPlace(type, p.x, p.y),
        );
        if (point) {
          g.place(type, point.x, point.y);
          done = true;
        }
      }
    }
    if (!done)
      for (const tier of [1, 2, 3]) {
        const candidates = g.towers.filter(
          (t) =>
            t.paths[paths[t.type]] === tier - 1 &&
            g.pathAvailable(t.type, paths[t.type], tier),
        );
        const target = candidates.find(
          (t) => g.gold >= TOWERS[t.type].prices[tier - 1],
        );
        if (target && g.upgrade(target.id, paths[target.type])) {
          done = true;
          break;
        }
      }
    if (!done) {
      const second = {
        archer: 1,
        cannon: 2,
        frost: 0,
        fire: 0,
        lightning: 0,
        grove: 0,
        wind: 0,
        rune: 0,
      };
      const cross = g.towers.find(
        (t) =>
          t.paths[paths[t.type]] >= 2 &&
          t.paths[second[t.type]] === 0 &&
          g.gold >= TOWERS[t.type].prices[0],
      );
      if (cross && g.upgrade(cross.id, second[cross.type])) done = true;
    }
    if (
      !done &&
      g.towers.length < 38 &&
      !g.towers.some(
        (t) =>
          t.paths[paths[t.type]] < 3 &&
          g.pathAvailable(t.type, paths[t.type], t.paths[paths[t.type]] + 1),
      )
    ) {
      const type = available[g.towers.length % available.length];
      if (g.gold >= TOWERS[type].cost) {
        const point = positions(g, TOWERS[type].base.range).find(
          (p) => !g.canPlace(type, p.x, p.y),
        );
        if (point) {
          g.place(type, point.x, point.y);
          done = true;
        }
      }
    }
    if (!done) break;
  }
}
function campaign(profile, map, mode, hero, style = "mixed") {
  const g = new Game(() => {}, {
    map,
    difficulty: mode,
    profile,
    hero,
    relics: profile.relics.equipped,
  });
  const rows = [];
  const previousTowers = new Map();
  let saved = profile;
  let granted = Object.fromEntries(TYPES.map((k) => [k, 0])),
    stats = { waves: 0, damage: 0, armor: 0, kills: 0 },
    heroGranted = 0;
  const runId = `balance-v4-${++serial}`;
  for (let wave = 1; wave <= g.totalWaves && !g.ended; wave++) {
    spend(g, style);
    if (g.hero && g.towers[0])
      g.moveHero(Math.max(35, g.towers[0].x - 25), Math.max(60, g.towers[0].y));
    if (wave % 20 === 0) {
      for (const t of g.towers)
        if (["archer", "cannon", "rune", "lightning"].includes(t.type))
          g.setTargeting(t.id, "STRONG");
    } else {
      for (const t of g.towers) g.setTargeting(t.id, "FIRST");
    }
    g.startWave();
    let time = 0;
    const escaped = [];
    g.onEvent = (e) => {
      if (e.type === "escape") escaped.push(e.enemy.type);
    };
    while (g.active && !g.ended && time < 360) {
      g.heroAbility();
      g.update(0.5);
      time += 0.5;
      spend(g, style);
    }
    assert(time < 360, `${map}/${mode} wave ${wave} cannot stall`);
    const op = rewardForRun(
        g,
        `${runId}-${g.ended === "victory" ? "end" : wave}`,
      ),
      xp = { ...op.xp },
      totals = { ...op.stats },
      heroTotal = op.heroXP;
    for (const t of TYPES) op.xp[t] = Math.max(0, xp[t] - granted[t]);
    for (const k of Object.keys(stats))
      op.stats[k] = Math.max(0, totals[k] - stats[k]);
    op.heroXP = Math.max(0, heroTotal - heroGranted);
    saved = applyOperation(saved, op);
    granted = xp;
    stats = totals;
    heroGranted = heroTotal;
    rows.push({
      wave,
      lives: g.lives,
      gold: g.gold,
      earned: g.earned,
      time,
      escaped,
      towerCount: g.towers.length,
      spent: g.towers.reduce((n, t) => n + t.invested, 0),
      towerChanges: g.towers
        .filter((t) => previousTowers.get(t.id) !== t.paths.join(","))
        .map((t) => ({
          id: t.id,
          type: t.type,
          paths: [...t.paths],
          invested: t.invested,
        })),
    });
    for (const t of g.towers) previousTowers.set(t.id, t.paths.join(","));
    if (wave <= 3)
      assert.equal(
        g.lives,
        20 + (profile.relics.equipped.includes("shield") ? 2 : 0),
        `${map}/${mode}: safe introduction`,
      );
  }
  const next = saved;
  console.log(map, mode, hero, style, g.ended, g.lives, g.earned);
  return {
    profile: next,
    result: {
      map,
      mode,
      hero,
      style,
      result: g.ended,
      lives: g.lives,
      earned: g.earned,
      spent: g.towers.reduce((n, t) => n + t.invested, 0),
      waves: rows,
      finalTowers: g.towers.map((t) => ({
        type: t.type,
        x: t.x,
        y: t.y,
        paths: t.paths,
        invested: t.invested,
        targeting: t.targeting,
      })),
    },
  };
}
function unlock(p) {
  for (const type of ["wind", "rune", "fire", "lightning", "grove"])
    if (!p.unlockedTowers.includes(type) && p.crowns >= UNLOCK_COSTS[type])
      p = applyOperation(p, {
        id: `unlock-${++serial}`,
        type: "tower",
        tower: type,
      });
  if (!p.heroes.unlocked.includes("dinosaur") && p.crowns >= 40)
    p = applyOperation(p, {
      id: `hero-${++serial}`,
      type: "hero",
      hero: "dinosaur",
    });
  for (const type of TYPES)
    for (const path of [0, 1, 2])
      for (const tier of [2, 3])
        if (
          p.unlockedTowers.includes(type) &&
          p.unlockedUpgrades[type][path] === tier - 1 &&
          p.towerXP[type].earned - p.towerXP[type].spent >=
            (tier === 2 ? 180 : 500)
        )
          p = applyOperation(p, {
            id: `path-${++serial}`,
            type: "path",
            tower: type,
            path,
            tier,
          });
  if (
    p.relics.unlocked.includes("purse") &&
    p.relics.unlocked.includes("shield")
  )
    p = applyOperation(p, {
      id: `relic-${++serial}`,
      type: "relic",
      equipped: ["purse", "shield"],
    });
  return p;
}
let p = freshProfile("Earned progression");
const results = [];
for (const map of ["emerald", "amber", "garden", "crystal", "coast", "moon"]) {
  const c = campaign(p, map, "easy", "dragon");
  results.push(c.result);
  p = unlock(c.profile);
}
// Repeated real runs earn class XP for permanent evolutions. Claims are capped.
for (let i = 0; i < 6; i++) {
  const c = campaign(
    p,
    i % 2 ? "coast" : "crystal",
    "easy",
    ["dragon", "tiger", "dinosaur"][i % 3],
  );
  results.push(c.result);
  p = unlock(c.profile);
}
for (const map of ["emerald", "amber", "moon", "garden", "crystal", "coast"])
  for (const mode of ["medium", "hard"]) {
    const c = campaign(
      p,
      map,
      mode,
      ["dragon", "tiger", "dinosaur"][results.length % 3],
      ["mixed", "physical", "magic", "control"][results.length % 4],
    );
    results.push(c.result);
    p = unlock(c.profile);
  }
writeFileSync(
  "docs/v4-balance-results.json",
  JSON.stringify(
    {
      startingResources: { gold: 300, lives: 20 },
      earnedOnly: true,
      profile: p,
      results,
    },
    null,
    2,
  ),
);
for (const r of results)
  console.log(r.map, r.mode, r.hero, r.style, r.result, r.lives, r.earned);
assert(
  results.every((r) => r.result === "victory"),
  "All progression and endurance strategies must win with earned resources.",
);
