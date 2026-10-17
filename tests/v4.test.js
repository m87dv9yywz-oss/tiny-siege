import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/systems/Game.js";
import { TOWERS, towerStats } from "../src/data/towers.js";
import { HEROES } from "../src/data/heroes.js";
import { mergeProfiles } from "../src/cloud/firebase.js";
import { cloudProfile } from "../src/cloud/schema.js";
import { TRAILS, OBSTACLES } from "../src/data/map.js";
import { DIFFICULTIES, campaignFor } from "../src/data/difficulties.js";
import {
  freshProfile,
  validateProfile,
  migrateProfile,
  applyOperation,
  ProfileStore,
  TYPES,
} from "../src/progression/profiles.js";
import {
  profileDocuments,
  assembleProfile,
  battleDocuments,
  assembleBattle,
  COMPONENTS,
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
const run = (g) => ({
  id: "v4-run",
  profileId: "local",
  granted: Object.fromEntries(TYPES.map((k) => [k, 0])),
  stats: { waves: 0, damage: 0, armor: 0, kills: 0 },
  heroGranted: 0,
  finished: false,
});
test("prototype migration retains valid non-XP progress and repeated hero imports cannot refund Crowns", () => {
  const old = freshProfile("Early Explorer");
  old.schemaVersion = 1;
  delete old.heroes;
  delete old.relics;
  delete old.mapProgress;
  old.towerXP = {};
  old.unlockedUpgrades = {};
  old.crowns = 65;
  old.completedMaps = ["emerald"];
  old.mapStars = { emerald: 2 };
  old.statistics.wins = 1;
  old.statistics.ledger = "|early-clear|";
  old.settings.sound = true;
  const migrated = migrateProfile(old);
  assert.equal(migrated.crowns, 65);
  assert.equal(migrated.statistics.ledger, "|early-clear|");
  assert.equal(migrated.statistics.wins, 1);
  assert.equal(migrated.mapStars.emerald, 2);
  assert.equal(migrated.settings.sound, true);
  assert.equal(validateProfile({ ...migrated, mapProgress: [] }), false);
  let guest = applyOperation(freshProfile(), {
    id: "rex-reward",
    type: "reward",
    map: "emerald",
    difficulty: "easy",
    win: true,
    stars: 3,
    xp: {},
    stats: {},
  });
  const cloud = applyOperation(guest, {
    id: "rex-purchase",
    type: "hero",
    hero: "dinosaur",
  });
  const once = mergeProfiles(cloud, guest);
  assert.equal(once.crowns, 60);
  assert.equal(mergeProfiles(once, guest).crowns, 60);
});
test("v4 accepts full legacy schemas without losing any balances, stats, unlocks or stars", () => {
  for (const version of [1, 2]) {
    const p = freshProfile("Returning");
    p.schemaVersion = version;
    delete p.heroes;
    delete p.relics;
    delete p.mapProgress;
    for (const k of ["wind", "rune", "tidecaller", ...(version === 1 ? ["grove"] : [])]) {
      delete p.towerXP[k];
      delete p.unlockedUpgrades[k];
    }
    p.crowns = 133;
    p.towerXP.archer = { earned: 991, spent: 680 };
    p.unlockedUpgrades.archer = [3, 1, 1];
    p.completedMaps = ["emerald"];
    p.mapStars = { emerald: 3 };
    p.statistics.ledger = "|paid-before|";
    assert(validateProfile(p));
    const v = migrateProfile(p);
    assert.equal(v.schemaVersion, 3);
    assert.equal(v.crowns, 133);
    assert.deepEqual(v.statistics, p.statistics);
    assert.deepEqual(v.towerXP.archer, p.towerXP.archer);
    assert.deepEqual(v.mapStars, p.mapStars);
    assert.equal(v.mapProgress.emerald.easyClaims, 1);
    assert.deepEqual(v.unlockedUpgrades.wind, [1, 1, 1]);
    assert(!v.unlockedTowers.includes("wind"));
  }
});
test("six map routes are deterministic and new maps have different endpoints, geometry and obstacles", () => {
  assert.notDeepEqual(TRAILS.crystal.PATH, TRAILS.amber.PATH);
  assert.notDeepEqual(TRAILS.coast.PATH, TRAILS.crystal.PATH);
  assert.notDeepEqual(TRAILS.coast.PATH[0], TRAILS.crystal.PATH[0]);
  for (const map of ["crystal", "coast"]) {
    const g = new Game(() => {}, { map });
    let valid = 0;
    for (let y = 75; y <= 590; y += 35)
      for (let x = 40; x <= 920; x += 35)
        if (!g.canPlace("archer", x, y)) valid++;
    assert(valid > 100);
    for (const o of OBSTACLES[map]) assert(g.canPlace("archer", o.x, o.y));
    const e = g.spawn("basic");
    g.active = true;
    g.update(1);
    assert.deepEqual(
      { x: e.x, y: e.y },
      { x: g.trail.onPath(e.progress).x, y: g.trail.onPath(e.progress).y },
    );
  }
});
test("difficulty fixes wave count and boss milestones without independent length choices", () => {
  for (const map of ["emerald", "amber", "moon", "garden", "crystal", "coast"])
    for (const [mode, d] of Object.entries(DIFFICULTIES)) {
      const c = campaignFor(map, mode);
      assert.equal(c.waves.length, d.waves);
      assert.equal(
        c.waves.filter((w) =>
          w.some((g) => ["boss", "crystalBoss", "drake"].includes(g.type)),
        ).length,
        d.waves / 20,
      );
      assert.deepEqual(
        c.waves.slice(0, 3),
        campaignFor("emerald", mode).waves.slice(0, 3),
      );
      assert(c.waves.every((w) => w.reduce((n, g) => n + g.count, 0) < 250));
    }
});
test("Windcaller control, distinct ricochets, resisted pushes, and Runesmith support do not stack indefinitely", () => {
  const g = new Game();
  const w = g.place("wind", 145, 105);
  w.paths = [3, 0, 0];
  const e = g.spawn("brute");
  e.x = 200;
  e.y = 105;
  g.impact({
    type: "wind",
    stats: towerStats(w),
    towerId: w.id,
    origin: w,
    target: e,
  });
  assert(e.slow < 1);
  assert(g.zones.length);
  const armor = g.spawn("armored");
  armor.x = 200;
  armor.y = 105;
  const r = { type: "rune", paths: [0, 3, 0] };
  g.applyHit({ type: "rune", stats: towerStats(r) }, armor);
  assert.equal(armor.armor, 0);
  const a = { id: 99, type: "archer", x: 145, y: 105, paths: [0, 0, 0] };
  g.towers = [
    a,
    { ...r, id: 100, x: 170, y: 105, paths: [3, 0, 0] },
    { ...r, id: 101, x: 170, y: 105, paths: [3, 0, 0] },
  ];
  const s = g.effectiveStats(a);
  assert.equal(s.damage, 18 * 1.3);
  assert.equal(s.cooldown, 0.65 * 0.8);
  const boss = g.spawn("boss");
  boss.x = 200;
  boss.y = 105;
  boss.progress = 200;
  g.applyHit(
    { type: "wind", stats: towerStats({ type: "wind", paths: [0, 0, 3] }) },
    boss,
  );
  const p = boss.progress;
  g.applyHit(
    { type: "wind", stats: towerStats({ type: "wind", paths: [0, 0, 3] }) },
    boss,
  );
  assert.equal(boss.progress, p);
  assert(p > 180);
});
test("each animal attacks, moves, has a real cooldown, buffs its class and stops under pause", () => {
  for (const type of Object.keys(HEROES)) {
    const g = new Game(() => {}, {
      map: "emerald",
      difficulty: "easy",
      hero: type,
    });
    assert.equal(g.hero.type, type);
    const e = g.spawn("brute");
    Object.assign(e, { x: g.hero.x + 20, y: g.hero.y, progress: 100 });
    g.active = true;
    assert(g.heroAbility());
    assert(!g.heroAbility());
    const before = g.hero.abilityLeft;
    g.paused = true;
    g.update(2);
    assert.equal(g.hero.abilityLeft, before);
    assert(!g.moveHero(600, 100));
    g.paused = false;
    let dest;
    for (let y = 90; y < 600 && !dest; y += 45)
      for (let x = 70; x < 900 && !dest; x += 45)
        if (Math.hypot(x - g.hero.x, y - g.hero.y) > 50 && g.moveHero(x, y))
          dest = { x, y };
    assert(dest);
    g.active = false;
    g.update(20);
    assert.equal(g.hero.x, dest.x);
    assert.equal(g.hero.y, dest.y);
    const klass = { dragon: "fire", dinosaur: "cannon", tiger: "archer" }[type],
      t = { type: klass, x: g.hero.x, y: g.hero.y, paths: [0, 0, 0] };
    assert.notDeepEqual(g.effectiveStats(t), towerStats(t));
  }
});
test("relics unlock through milestones, allow two slots, never duplicate and difficulty rewards cap repeats", () => {
  let p = freshProfile();
  for (let i = 0; i < 10; i++)
    p = applyOperation(p, {
      id: "win-" + i,
      type: "reward",
      map: "crystal",
      difficulty: "easy",
      win: true,
      stars: 3,
      xp: {},
      stats: {},
    });
  assert.equal(p.crowns, 175);
  assert.equal(p.mapProgress.crystal.easyClaims, 6);
  assert(p.relics.unlocked.includes("purse"));
  assert(p.relics.unlocked.includes("lens"));
  assert.throws(() =>
    applyOperation(p, {
      id: "bad",
      type: "relic",
      equipped: ["purse", "purse"],
    }),
  );
  assert.throws(() =>
    applyOperation(p, {
      id: "bad",
      type: "relic",
      equipped: ["purse", "lens", "shield"],
    }),
  );
  p = applyOperation(p, {
    id: "equip",
    type: "relic",
    equipped: ["purse", "shield"],
  });
  const g = new Game(() => {}, {
    map: "emerald",
    difficulty: "easy",
    profile: p,
    hero: p.heroes.equipped,
    relics: p.relics.equipped,
  });
  assert.equal(g.gold, 325);
  assert.equal(g.lives, 22);
});
test("between-wave snapshot restores gold, specialization, hero cooldown and progress; active waves cannot snapshot", () => {
  const p = freshProfile();
  const g = new Game(() => {}, {
    map: "emerald",
    difficulty: "hard",
    profile: p,
    hero: "dragon",
  });
  const t = g.place("archer", 190, 80);
  assert(t);
  g.upgrade(t.id, 0);
  g.hero.abilityLeft = 17;
  const b = battleCheckpoint(g, run(g));
  assert(validateBattle(b));
  const docs = battleDocuments(b, 1, 1),
    parts = Object.fromEntries(
      Object.entries(docs)
        .filter(([k]) => k.startsWith("placements/"))
        .map(([k, v]) => [k.split("/")[1], v]),
    );
  const progress = Object.fromEntries(
    Object.entries(docs)
      .filter(([k]) => k.startsWith("battleProgress/"))
      .map(([k, v]) => [k.split("/")[1], v]),
  );
  const round = assembleBattle(docs["battles/current"], parts, progress);
  assert.equal(round.hero.abilityLeft, 17);
  const h = new Game();
  restoreBattle(h, round, p);
  assert.equal(h.gold, g.gold);
  assert.equal(h.hero.abilityLeft, 17);
  assert.deepEqual(h.towers[0].paths, [1, 0, 0]);
  assert(h.paused);
  h.paused = false;
  h.startWave();
  assert.equal(battleCheckpoint(h, run(h)), null);
  assert(!validateBattle({ ...b, towers: [{ ...t, paths: [2, 2, 0] }] }));
  assert(!validateBattle({ ...b, wave: 100 }));
});
test("checkpoints carry 3x speed and skipped waves; legacy snapshots still validate", () => {
  const p = freshProfile();
  const g = new Game(() => {}, {
    map: "emerald",
    difficulty: "hard",
    profile: p,
    hero: "dragon",
  });
  g.speed = 3;
  g.skippedWaves = 9;
  g.wave = 9;
  const b = battleCheckpoint(g, run(g));
  assert(validateBattle(b));
  assert.equal(b.speed, 3);
  assert.equal(b.skippedWaves, 9);
  assert(!validateBattle({ ...b, speed: 4 }));
  const legacy = { ...b };
  delete legacy.skippedWaves;
  assert(validateBattle(legacy));
  const h = new Game();
  restoreBattle(h, b, p);
  assert.equal(h.speed, 3);
  assert.equal(h.skippedWaves, 9);
});
test("auto-start begins the next wave after a beat, never while paused; 3x triples sim time", () => {
  const g = new Game(() => {}, { map: "emerald", difficulty: "easy" });
  g.autoWave = true;
  g.update(0.5);
  assert.equal(g.wave, 0);
  g.update(0.6);
  assert.equal(g.wave, 1);
  assert(g.active);
  const held = new Game(() => {}, { map: "emerald", difficulty: "easy" });
  held.autoWave = true;
  held.paused = true;
  held.update(2);
  assert.equal(held.wave, 0);
  const fast = new Game(() => {}, { map: "emerald", difficulty: "easy" });
  fast.startWave();
  fast.speed = 3;
  fast.update(1);
  assert(fast.waveTime > 2.9);
});
test("20-wave stages grow adventure enemies: health, speed and size step up, bosses exempt", () => {
  const mk = (wave) => {
    const g = new Game(() => {}, { map: "emerald", difficulty: "medium" });
    g.wave = wave;
    return g;
  };
  const s0 = mk(10).spawn("basic");
  const s1 = mk(30).spawn("basic");
  const s4 = mk(95).spawn("basic");
  assert.equal(s0.stage, 0);
  assert.equal(s1.stage, 1);
  assert.equal(s4.stage, 4);
  assert(s1.health > s0.health * 1.3, "stage health stacks on wave growth");
  assert(Math.abs(s1.speed - 52 * 1.03) < 1e-9);
  assert(Math.abs(s4.speed - 52 * 1.12) < 1e-9, "speed caps at +12%");
  assert(Math.abs(s1.displayScale - 1.07) < 1e-9);
  assert(Math.abs(s4.displayScale - 1.28) < 1e-9, "size caps at +28%");
  const boss = mk(30).spawn("boss");
  assert.equal(boss.displayScale, 1);
  assert.equal(boss.speed, 29);
  assert.equal(boss.health, 18000);
  const classic = new Game(() => {}, {});
  classic.wave = 10;
  const c = classic.spawn("basic");
  assert.equal(c.stage, 0);
  assert.equal(c.displayScale, 1);
  assert.equal(c.speed, 52);
});
test("auto waves switch off the moment a life is lost", () => {
  const events = [];
  const g = new Game((e) => events.push(e), {
    map: "emerald",
    difficulty: "easy",
  });
  g.autoWave = true;
  g.startWave();
  const e = g.spawn("basic");
  e.progress = g.trail.PATH_LENGTH - 1;
  g.enemies = [e];
  g.queue = [];
  g.update(0.1);
  assert.equal(g.lives, 19);
  assert.equal(g.autoWave, false);
  assert(events.some((ev) => ev.type === "autoOff"));
});
test("golden sproutling: rare bonus runner worth 250, costs no life if it escapes", () => {
  const original = Math.random;
  Math.random = () => 0;
  try {
    const g = new Game(() => {}, { map: "emerald", difficulty: "medium" });
    g.wave = 14;
    assert(g.startWave());
    assert(
      g.queue.some((q) => q.golden),
      "golden entry is queued on an eligible wave",
    );
    const e = g.spawn("sprout", { golden: true });
    assert.equal(e.name, "Golden Sproutling");
    assert.equal(e.reward, 250);
    assert.equal(e.lives, 0);
    assert(e.speed >= 115, "faster than a Fleetfoot");
    const lives = g.lives;
    e.progress = g.trail.PATH_LENGTH - 1;
    g.enemies = [e];
    g.queue = [];
    g.update(0.1);
    assert.equal(g.lives, lives, "escaping costs no life");
    const bossWave = new Game(() => {}, {
      map: "emerald",
      difficulty: "medium",
    });
    bossWave.wave = 19;
    bossWave.startWave();
    assert(!bossWave.queue.some((q) => q.golden), "never on a boss wave");
    const once = new Game(() => {}, { map: "emerald", difficulty: "medium" });
    once.wave = 14;
    once.startWave();
    assert(once.queue.some((q) => q.golden));
    once.active = false;
    once.wave = 15;
    once.startWave();
    assert(!once.queue.some((q) => q.golden), "at most once per run");
  } finally {
    Math.random = original;
  }
});
test("bounded document codec preserves progress while local receipt storage prevents ancient reward replay", () => {
  const store = new ProfileStore(disk());
  store.create("Long journey");
  for (let i = 0; i < 400; i++)
    store.commit({
      id: "reward-" + i,
      type: "reward",
      map: "emerald",
      win: false,
      stars: 0,
      xp: { archer: 1 },
      stats: {},
    });
  assert(store.current.statistics.ledger.length < 1500);
  assert.equal(store.current.towerXP.archer.earned, 400);
  store.commit({
    id: "reward-0",
    type: "reward",
    map: "emerald",
    win: false,
    stars: 0,
    xp: { archer: 1 },
    stats: {},
  });
  assert.equal(store.current.towerXP.archer.earned, 400);
  const docs = profileDocuments(store.current, 1),
    core = docs.core;
  assert(!("ledger" in core.statistics));
  assert(JSON.stringify(core).length < 1000);
  assert.equal(COMPONENTS.length, 25);
  const p = assembleProfile(core, docs);
  assert.equal(p.towerXP.archer.earned, 400);
  assert(validateProfile(p));
  const missing = { ...docs };
  delete missing["towers/wind"];
  assert.throws(() => assembleProfile(core, missing));
});
test("hero auras strengthen from Teen (level 4)", () => {
  const klass = { dragon: "fire", dinosaur: "cannon", tiger: "archer" };
  for (const [type, towerType] of Object.entries(klass)) {
    const g = new Game(() => {}, {
      map: "emerald",
      difficulty: "easy",
      hero: type,
    });
    const t = { type: towerType, x: g.hero.x, y: g.hero.y, paths: [0, 0, 0] };
    const base = towerStats(t);
    const baby = g.effectiveStats(t);
    g.hero.level = 4;
    const teen = g.effectiveStats(t);
    if (type === "dragon") {
      assert.equal(baby.damage, base.damage * 1.15);
      assert.equal(teen.damage, base.damage * 1.2);
    } else if (type === "dinosaur") {
      assert.equal(baby.armorDamage, (base.armorDamage || 0) * 1.25);
      assert.equal(teen.armorDamage, (base.armorDamage || 0) * 1.3);
    } else {
      assert.equal(baby.cooldown, base.cooldown * (1 - 0.12));
      assert.equal(teen.cooldown, base.cooldown * (1 - 0.16));
    }
  }
});
test("adult heroes (level 7) gain a wider, faster-recharging ability", () => {
  const g = new Game(() => {}, {
    map: "emerald",
    difficulty: "easy",
    hero: "dragon",
  });
  g.active = true;
  const e = g.spawn("brute");
  // 240 from the hero: beyond Teen reach (135 * 1.65 = 222.75),
  // inside Adult reach (135 * 2 = 270).
  Object.assign(e, { x: g.hero.x + 240, y: g.hero.y, progress: 100 });
  g.hero.level = 6;
  assert(!g.heroAbility());
  g.hero.level = 7;
  assert(g.heroAbility());
  assert.equal(g.hero.abilityLeft, 28 * 0.8);
});

// Regression (live incident 2026-10-16): a save written before a tower or
// map launches — same schema 3, fewer entries — must still load with its
// progress intact; the new content starts at zero. Shaping a current
// profile by deleting the newest tower reproduces exactly what the
// previous release wrote to disk and to the cloud.
const preExpansionProfile = () => {
  const p = freshProfile("Veteran");
  p.crowns = 1234;
  p.towerXP.archer = { earned: 900, spent: 680 };
  p.completedMaps = ["emerald"];
  p.mapStars = { emerald: 3 };
  delete p.towerXP.tidecaller;
  delete p.unlockedUpgrades.tidecaller;
  return p;
};
test("schema-3 profile written before the Tidecaller loads with progress intact", () => {
  const out = migrateProfile(preExpansionProfile());
  assert.equal(out.crowns, 1234);
  assert.deepEqual(out.towerXP.archer, { earned: 900, spent: 680 });
  assert.deepEqual(out.towerXP.tidecaller, { earned: 0, spent: 0 });
  assert.deepEqual(out.unlockedUpgrades.tidecaller, [1, 1, 1]);
  assert(validateProfile(out));
});
test("flattened cloud wire profile from before the Tidecaller loads", () => {
  const wire = cloudProfile(preExpansionProfile());
  assert.equal(wire.towerXP.tidecallerEarned, undefined);
  const out = migrateProfile(wire);
  assert.equal(out.crowns, 1234);
  assert.deepEqual(out.towerXP.archer, { earned: 900, spent: 680 });
  assert(validateProfile(out));
});
test("ProfileStore boots a pre-expansion save without the could-not-load warning", () => {
  const storage = disk();
  storage.value = JSON.stringify({
    version: 1,
    selected: "hero1",
    profiles: {
      hero1: { profile: preExpansionProfile(), pending: [], remoteRevision: null },
    },
    cloud: {},
  });
  const store = new ProfileStore(storage);
  assert.equal(store.warning, "");
  assert.equal(store.data.profiles.hero1.profile.crowns, 1234);
});
test("cloud assembly tolerates component docs that did not exist when the save was written", () => {
  const docs = profileDocuments(freshProfile("Veteran"), 1);
  const { core, ...components } = docs;
  components["towers/tidecaller"] = null;
  for (const m of ["twinponds", "roundabout", "switchbacks", "twofronts", "spiral", "riverbend"])
    components["maps/" + m] = null;
  const p = assembleProfile(core, components);
  assert.deepEqual(p.towerXP.tidecaller, { earned: 0, spent: 0 });
  assert.equal(p.mapProgress.spiral.easy, 0);
  assert(validateProfile(p));
});
test("a checkpoint written before the Tidecaller still validates and restores", () => {
  const p = freshProfile();
  const g = new Game(() => {}, { map: "emerald", difficulty: "hard", profile: p, hero: "dragon" });
  assert(g.place("archer", 190, 80));
  const b = battleCheckpoint(g, run(g));
  delete b.participation.tidecaller;
  delete b.run.granted.tidecaller;
  assert(validateBattle(b));
  assert.deepEqual(b.participation.tidecaller, { time: 0, damage: 0, armor: 0, control: 0, kills: 0 });
  const h = new Game();
  restoreBattle(h, b, p);
  assert.equal(h.gold, g.gold);
});
