import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/systems/Game.js";
import { campaignFor, FREEPLAY } from "../src/data/difficulties.js";
import { CAMPAIGNS } from "../src/data/waves.js";
import {
  freshProfile,
  validateProfile,
  migrateProfile,
  ProfileStore,
} from "../src/progression/profiles.js";
import {
  profileDocuments,
  assembleProfile,
} from "../src/cloud/v4schema.js";
import {
  battleCheckpoint,
  validateBattle,
  restoreBattle,
} from "../src/systems/checkpoint.js";

const disk = () => ({
  value: null,
  getItem() {
    return this.value;
  },
  setItem(k, v) {
    this.value = v;
  },
});
const runStub = (g) => ({
  id: "fp-run",
  profileId: "local",
  granted: Object.fromEntries(
    Object.keys(g.participation).map((k) => [k, 0]),
  ),
  stats: { waves: 0, damage: 0, armor: 0, kills: 0 },
  heroGranted: 0,
  finished: false,
});

test("free play campaigns run 200 waves on every map, classic included", () => {
  for (const map of Object.keys(CAMPAIGNS)) {
    const c = campaignFor(map, "freeplay");
    assert.equal(c.mode, "freeplay");
    assert.equal(c.waves.length, 200);
    assert.equal(c.difficulty, FREEPLAY);
    assert.equal(c.first, 0);
    assert.equal(c.repeat, 0);
    const bosses = c.waves.filter((w) =>
      w.some((g) => ["boss", "crystalBoss", "drake"].includes(g.type)),
    );
    assert.equal(bosses.length, 10);
    const bossHp = (w) =>
      c.waves[w - 1].find((g) => g.traits.bossHealth).traits.bossHealth;
    assert(bossHp(200) > bossHp(100) * 3, "final boss far beyond mid boss");
    const mini195 = c.waves[194].filter((g) =>
      ["shadowhart", "broodmother"].includes(g.type),
    );
    assert.equal(mini195.reduce((n, g) => n + g.count, 0), 3);
    assert(
      c.waves.every((w) => w.reduce((n, g) => n + g.count, 0) < 250),
      "wave sizes stay bounded",
    );
  }
});

test("free play unlocks every tower and tier regardless of profile progress", () => {
  const p = freshProfile();
  assert.deepEqual(p.unlockedTowers, ["archer", "cannon", "frost"]);
  const g = new Game(() => {}, {
    map: "emerald",
    difficulty: "freeplay",
    profile: p,
    hero: "dragon",
    relics: [],
  });
  assert.equal(g.totalWaves, 200);
  for (const t of ["lightning", "tidecaller", "rune"])
    assert(g.available(t), `${t} available`);
  assert(g.pathAvailable("lightning", 0, 3));
  const adv = new Game(() => {}, {
    map: "emerald",
    difficulty: "easy",
    profile: p,
  });
  assert.equal(adv.available("lightning"), false);
});

test("free play health compounds past wave 100 on top of hard-style growth", () => {
  const hp = (wave) => {
    const g = new Game(() => {}, {
      map: "emerald",
      difficulty: "freeplay",
      profile: freshProfile(),
    });
    g.wave = wave;
    return g.spawn("basic").health;
  };
  // Identical linear growth would make this ratio ~1.9; the compound
  // endgame factor (1.028^50 ≈ 4) must push it far higher.
  assert(hp(150) / hp(100) > 5, `ratio ${hp(150) / hp(100)}`);
  assert(hp(100) > hp(50) * 2);
});

test("free play checkpoints validate to wave 199, on any map, and restore any board", () => {
  const p = freshProfile();
  const g = new Game(() => {}, {
    map: "classic",
    difficulty: "freeplay",
    profile: p,
    hero: "dragon",
    relics: [],
  });
  assert(g.place("lightning", 190, 80), "locked tower placeable");
  g.wave = 57;
  const b = battleCheckpoint(g, runStub(g));
  assert.equal(b.difficulty, "freeplay");
  assert(validateBattle(b));
  assert(validateBattle({ ...b, wave: 199 }));
  assert(!validateBattle({ ...b, wave: 200 }));
  assert(!validateBattle({ ...b, difficulty: "easy" }), "classic map is not an adventure");
  const h = new Game();
  restoreBattle(h, b, p);
  assert.equal(h.campaign.mode, "freeplay");
  assert.equal(h.wave, 57);
  assert.equal(h.towers[0].type, "lightning");
  // The same board as an adventure checkpoint still refuses to restore.
  const adv = battleCheckpoint(
    new Game(() => {}, { map: "emerald", difficulty: "hard", profile: p, hero: "dragon" }),
    runStub(g),
  );
  adv.towers = b.towers;
  assert.throws(() => restoreBattle(new Game(), adv, p));
});

test("free play best waves validate, migrate into old saves, and round-trip the cloud", () => {
  const p = freshProfile();
  p.freePlayBest = { emerald: 137, classic: 200 };
  assert(validateProfile(p));
  assert(!validateProfile({ ...p, freePlayBest: { emerald: 201 } }));
  assert(!validateProfile({ ...p, freePlayBest: { nowhere: 5 } }));
  // A schema-3 save written before Free Play existed has no field.
  const before = freshProfile("Veteran");
  before.crowns = 77;
  delete before.freePlayBest;
  const migrated = migrateProfile(before);
  assert.deepEqual(migrated.freePlayBest, {});
  assert.equal(migrated.crowns, 77);
  assert(validateProfile(migrated));
  // Cloud: bests ride in the core doc (maps docs don't exist for the
  // classic trail); assembly restores them, and a core written before
  // the mode existed assembles cleanly.
  const docs = profileDocuments(p, 1);
  assert.deepEqual(docs.core.freePlayBest, { emerald: 137, classic: 200 });
  const { core, ...components } = docs;
  const back = assembleProfile(core, components);
  assert.deepEqual(back.freePlayBest, { emerald: 137, classic: 200 });
  const oldCore = { ...core };
  delete oldCore.freePlayBest;
  const legacy = assembleProfile(oldCore, components);
  assert.deepEqual(legacy.freePlayBest, {});
});

test("ascension fuses three evolutions into one [3,3,3] tower (free play only)", async () => {
  const { TOWERS, towerStats, towerName, isAscended } = await import(
    "../src/data/towers.js"
  );
  const spots = (g, n) => {
    const found = [];
    for (let y = 70; y <= 600 && found.length < n; y += 26)
      for (let x = 40; x <= 920 && found.length < n; x += 26)
        if (
          g.canPlace("archer", x, y) === null &&
          found.every((s) => Math.hypot(s.x - x, s.y - y) >= 60)
        )
          found.push({ x, y });
    return found;
  };
  const evolve = (g, spot, path) => {
    const t = g.place("archer", spot.x, spot.y);
    t.paths = [0, 0, 0];
    t.paths[path] = 3;
    t.paths[(path + 1) % 3] = 1;
    t.invested =
      TOWERS.archer.cost +
      TOWERS.archer.prices
        .slice(0, 3)
        .reduce((a, c) => a + c, 0) +
      TOWERS.archer.prices[0];
    return t;
  };
  const g = new Game(() => {}, {
    map: "emerald",
    difficulty: "freeplay",
    profile: freshProfile(),
  });
  g.gold = 100000;
  const [s1, s2, s3] = spots(g, 3);
  const a = evolve(g, s1, 0);
  const b = evolve(g, s2, 1);
  assert.equal(g.canAscend(a), false, "third evolution still missing");
  const c = evolve(g, s3, 2);
  assert.equal(g.canAscend(a), true);
  const formDamage = towerStats(a).damage;
  assert.equal(g.ascend(a.id), true);
  assert.equal(g.towers.length, 1, "partners consumed");
  assert.deepEqual(a.paths, [3, 3, 3]);
  assert(isAscended(a));
  assert.equal(towerName(a), "Stormpiercer");
  assert.equal(
    a.invested,
    TOWERS.archer.cost +
      TOWERS.archer.prices.reduce((x, y) => x + y, 0) * 3,
    "book value matches the validator formula",
  );
  assert(
    towerStats(a).damage > formDamage,
    "ascended hits harder than any single form",
  );
  // A checkpoint holding the ascended tower validates and restores.
  g.wave = 88;
  const saved = battleCheckpoint(g, runStub(g));
  assert(validateBattle(saved), "free play checkpoint accepts [3,3,3]");
  const restored = new Game();
  restoreBattle(restored, saved, freshProfile());
  assert(isAscended(restored.towers[0]));
  // The identical board is illegal as an adventure checkpoint.
  assert(!validateBattle({ ...saved, difficulty: "hard" }));
  // Adventures can never ascend, even with three evolutions on the field.
  const adv = new Game(() => {}, {
    map: "emerald",
    difficulty: "hard",
    profile: freshProfile(),
  });
  adv.gold = 100000;
  const [h1, h2, h3] = spots(adv, 3);
  const ha = evolve(adv, h1, 0);
  evolve(adv, h2, 1);
  evolve(adv, h3, 2);
  assert.equal(adv.canAscend(ha), false);
  assert.equal(adv.ascend(ha.id), false);
});

test("free play kill gold decays past wave 50 to a 25% floor", () => {
  const rewardAt = (difficulty, wave) => {
    const g = new Game(() => {}, {
      map: "emerald",
      difficulty,
      profile: freshProfile(),
    });
    g.wave = wave;
    return g.spawn("basic").reward;
  };
  const base = (w) => Math.round(9 * (1 + (w - 1) * 0.01));
  assert.equal(rewardAt("freeplay", 40), base(40), "no decay before 50");
  assert.equal(
    rewardAt("freeplay", 100),
    Math.round(9 * (1 + 99 * 0.01) * 0.625),
  );
  assert.equal(
    rewardAt("freeplay", 150),
    Math.round(9 * (1 + 149 * 0.01) * 0.25),
    "floor reached at wave 150",
  );
  assert.equal(rewardAt("hard", 100), base(100), "adventures never decay");
});

test("ascension novas fire their signature effects", () => {
  const g = new Game(() => {}, {
    map: "emerald",
    difficulty: "freeplay",
    profile: freshProfile(),
  });
  g.gold = 10000;
  const found = [];
  for (let y = 70; y <= 600 && found.length < 3; y += 26)
    for (let x = 40; x <= 920 && found.length < 3; x += 26)
      if (
        g.canPlace("frost", x, y) === null &&
        found.every((s) => Math.hypot(s.x - x, s.y - y) >= 60)
      )
        found.push({ x, y });
  const mk = (type, spot) => {
    const t = g.place(type, spot.x, spot.y);
    t.paths = [3, 3, 3];
    return t;
  };
  const frost = mk("frost", found[0]);
  const foe = g.spawn("basic");
  foe.progress = 300;
  g.nova(frost, g.baseStats(frost));
  assert(foe.frozen > 0, "eternal winter freezes the field");
  const wind = mk("wind", found[1]);
  const runner = g.spawn("runner");
  runner.progress = 500;
  g.nova(wind, g.baseStats(wind));
  assert(runner.progress < 500, "hurricane blows enemies backward");
  const grove = mk("grove", found[2]);
  const goldBefore = g.gold;
  const leader = g.spawn("basic");
  leader.progress = 700;
  g.nova(grove, g.baseStats(grove));
  assert(leader.slow < 1, "worldroot roots the leaders");
  assert(g.gold > goldBefore, "seedburst pays gold for roots");
});

test("ProfileStore records only improving free play bests and persists them", () => {
  const store = new ProfileStore(disk());
  store.create("Chaser");
  assert.equal(store.recordFreePlayBest("emerald", 42), true);
  assert.equal(store.recordFreePlayBest("emerald", 40), false);
  assert.equal(store.recordFreePlayBest("emerald", 88), true);
  assert.equal(store.current.freePlayBest.emerald, 88);
  const reloaded = new ProfileStore(store.storage);
  assert.equal(reloaded.current.freePlayBest.emerald, 88);
});
