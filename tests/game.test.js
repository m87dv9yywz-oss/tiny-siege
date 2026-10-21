import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/systems/Game.js";
import {
  TOWERS,
  towerStats,
  towerMuzzle,
  towerVisualMuzzle,
  declaredMuzzle,
  STATE_MUZZLES,
  MIRRORED_WEAPONS,
  mirrorDrawnSide,
  mirrorFlipFor,
  MIRROR_DEADBAND,
  layeredMuzzle,
  poseForBearing,
  POSE_BAND_DEG,
  POSE_HYSTERESIS_DEG,
  towerDisplaySize,
  upgradeState,
  towerName,
} from "../src/data/towers.js";
import {
  TOWER_STATES,
  towerLayer,
  towerBaseArtwork,
  towerTopArtwork,
} from "../src/towerArtwork.js";
import towerLayers from "../src/data/towerLayers.json" with { type: "json" };
import { ENEMIES } from "../src/data/enemies.js";
import { WAVES } from "../src/data/waves.js";
import { PATH_LENGTH, onPath } from "../src/data/map.js";
import { runCampaign, STRATEGIES } from "./strategy.js";
const advance = (g, s) => {
  for (let i = 0; i < s * 40 && !g.ended; i++) g.update(0.025);
};
const live = (g) => {
  g.active = true;
  g.queue = [{ type: "basic", at: 999 }];
};
const upgrade = (g, t, p, n) => {
  for (let i = 0; i < n; i++) assert.ok(g.upgrade(t.id, p));
  return towerStats(t);
};
const attack = (g, type, p, n) => {
  g.gold = 10000;
  const t = g.place(type, 145, 105);
  const stats = upgrade(g, t, p, n);
  return { t, stats };
};
test("starting resources, prices, legal placement, collisions, and honest refunds", () => {
  const g = new Game();
  assert.equal(g.gold, 300);
  assert.equal(g.lives, 20);
  assert.equal(g.active, false);
  assert.deepEqual(
    Object.values(TOWERS).map((t) => t.cost),
    [75, 160, 130, 150, 200, 115, 145, 175, 240],
  );
  assert.equal(g.place("archer", 150, 170), null);
  assert.equal(g.place("archer", -4, 100), null);
  const t = g.place("archer", 145, 105);
  assert.ok(t);
  assert.equal(g.gold, 225);
  assert.equal(g.place("archer", 155, 110), null);
  assert.ok(g.upgrade(t.id, 0));
  assert.equal(g.gold, 125);
  assert.equal(g.upgrade(t.id, 0), false);
  assert.equal(g.place("lightning", 400, 100), null);
  assert.ok(g.sell(t.id));
  assert.equal(g.gold, 247);
  assert.equal(g.towers.length, 0);
});
for (const [type, def] of Object.entries(TOWERS))
  for (let path = 0; path < 3; path++)
    test(`${type} path ${path}: every tier, exact prices, distinct evolution and sell investment`, () => {
      // Water towers can only be placed in a pond: use Twin Ponds and a
      // pond-center spot for them, the usual grass spot for everyone else.
      const g = def.waterOnly
        ? new Game(() => {}, { map: "twinponds" })
        : new Game();
      g.gold = 10000;
      const t = def.waterOnly
        ? g.place(type, 285, 235)
        : g.place(type, 145, 105);
      let spent = def.cost;
      const base = towerStats(t);
      for (let n = 0; n < 3; n++) {
        assert.equal(upgradeState(t, path).cost, def.prices[n]);
        assert.ok(g.upgrade(t.id, path));
        spent += def.prices[n];
        assert.equal(g.gold, 10000 - spent);
        assert.equal(t.paths[path], n + 1);
      }
      assert.notDeepEqual(towerStats(t), base);
      assert.equal(towerName(t), def.paths[path].tiers[2].name);
      assert.equal(g.upgrade(t.id, path), false);
      g.sell(t.id);
      assert.equal(g.gold, 10000 - spent + Math.floor(spent * 0.7));
    });
test("3-1-0 permits a different primary, locks the third and caps secondary tiers", () => {
  const g = new Game();
  g.gold = 10000;
  const t = g.place("archer", 145, 105);
  assert.ok(g.upgrade(t.id, 0));
  assert.ok(g.upgrade(t.id, 1));
  assert.match(upgradeState(t, 2).locked, /two paths/);
  assert.equal(g.upgrade(t.id, 2), false);
  assert.ok(g.upgrade(t.id, 1));
  assert.ok(g.upgrade(t.id, 1));
  assert.equal(g.upgrade(t.id, 0), false);
  assert.match(upgradeState(t, 0).locked, /Secondary/);
  assert.deepEqual(t.paths, [1, 3, 0]);
  assert.equal(towerStats(t).armorDamage, 8);
  assert.equal(g.upgrade(t.id, -1), false);
  assert.equal(g.upgrade(t.id, 4), false);
  const other = g.place("archer", 342, 263);
  upgrade(g, other, 2, 3);
  assert.equal(towerName(other), "Master Sniper");
  assert.equal(towerName(t), "Arrowstorm");
});
test("real early combat awards once and waits for a manual next wave", () => {
  const g = new Game();
  g.place("archer", 145, 105);
  assert.ok(g.startWave());
  assert.equal(g.startWave(), false);
  advance(g, 70);
  assert.equal(g.active, false);
  assert.equal(g.wave, 1);
  assert.equal(g.kills, 6);
  assert.equal(g.lives, 20);
  assert.equal(g.gold, 225 + 54 + 23);
  advance(g, 10);
  assert.equal(g.wave, 1);
  const e = g.spawn("basic");
  g.damage(e, 999);
  const gold = g.gold;
  g.damage(e, 999);
  assert.equal(g.gold, gold);
});
test("armor is separate: arrows ricochet, cannon cracks and breaks, then health is vulnerable", () => {
  const events = [],
    g = new Game((e) => events.push(e.type));
  const e = g.spawn("armored");
  const hp = e.health;
  g.damage(e, 18, TOWERS.archer.base);
  assert.equal(e.health, hp);
  assert.equal(e.armor, 80);
  assert.ok(events.includes("ricochet"));
  const gold = g.gold;
  g.damage(e, 40, TOWERS.cannon.base);
  assert.equal(e.armor, 30);
  assert.equal(e.health, hp - 4);
  g.damage(e, 40, TOWERS.cannon.base);
  assert.equal(e.armor, 0);
  assert.equal(g.gold, gold);
  assert.ok(events.includes("armorBreak"));
  const after = e.health;
  g.damage(e, 18, TOWERS.archer.base);
  assert.equal(e.health, after - 18);
});
test("piercing bolts penetrate heavy armor and hit aligned enemies, not distant ones", () => {
  const g = new Game();
  const { t, stats } = attack(g, "archer", 0, 2);
  const a = g.spawn("armored"),
    b = g.spawn("armored"),
    c = g.spawn("armored");
  Object.assign(a, { x: 145, y: 200 });
  Object.assign(b, { x: 145, y: 230 });
  Object.assign(c, { x: 280, y: 200 });
  const hp = a.health;
  g.impact({ type: "archer", target: a, origin: t, stats });
  assert.ok(a.health < hp);
  assert.ok(b.health < hp);
  assert.equal(c.health, hp);
});
test("frost brittleness amplifies armor damage; physical impacts shatter chilled groups", () => {
  const g = new Game();
  const { stats } = attack(g, "frost", 1, 3);
  const a = g.spawn("armored"),
    b = g.spawn("basic");
  b.x += 20;
  g.applyHit({ type: "frost", stats, freeze: true }, a);
  const armor = a.armor;
  g.damage(a, 10, { damageType: "physical", armorDamage: 10 });
  assert.equal(a.armor, Math.max(0, armor - 17.5));
  assert.equal(b.alive, false);
  assert.equal(a.shatter, 0);
});
test("freezing ends, and boss control resistance plus immunity prevents permanent locking", () => {
  const g = new Game();
  live(g);
  const e = g.spawn("brute");
  const stats = { ...TOWERS.frost.base, freeze: 0.9 };
  g.applyHit({ type: "frost", stats, freeze: true }, e);
  advance(g, 0.5);
  assert.equal(e.progress, 0);
  advance(g, 1);
  assert.ok(e.progress > 0 && e.progress < e.speed);
  const boss = g.spawn("boss");
  g.chill(boss, 0.2, 2, 2);
  assert.ok(boss.frozen < 1);
  g.chill(boss, 0.2, 2, 2);
  advance(g, 1);
  assert.equal(boss.frozen, 0);
  assert.ok(boss.progress > 0);
});
test("fire melts armor; burning uses strongest effect and never adds unbounded stacks", () => {
  const g = new Game();
  live(g);
  const { stats } = attack(g, "fire", 2, 1);
  const e = g.spawn("armored");
  g.applyHit({ type: "fire", stats }, e);
  assert.equal(e.burn, stats.burn);
  const armor = e.armor;
  advance(g, 0.5);
  assert.ok(e.armor < armor);
  const brute = g.spawn("brute");
  for (let i = 0; i < 5; i++)
    g.applyHit({ type: "fire", stats: { ...stats, damage: 0 } }, brute);
  assert.equal(brute.burn, stats.burn);
  const hp = brute.health;
  advance(g, 1);
  assert.ok(brute.health < hp);
  assert.ok(brute.health > hp - 20);
});
test("wildfire spreads finite burns and magma zones expire and reset", () => {
  const g = new Game();
  live(g);
  const { stats } = attack(g, "fire", 1, 2);
  const a = g.spawn("brute"),
    b = g.spawn("brute");
  b.x += 25;
  g.applyHit({ type: "fire", stats }, a);
  advance(g, 1.1);
  assert.ok(b.burnLeft > 0);
  assert.ok(b.burn <= a.burn);
  const magma = { ...TOWERS.fire.base, pool: 50, poolDamage: 28, melt: 40 };
  g.impact({ towerId: 1, type: "fire", target: a, stats: magma });
  assert.equal(g.zones.length, 1);
  advance(g, 3.1);
  assert.equal(g.zones.length, 0);
  g.reset();
  assert.equal(g.zones.length, 0);
});
test("cannon splash, fragmentation and lightning chain reach nearby targets", () => {
  const g = new Game();
  const a = g.spawn("basic"),
    b = g.spawn("basic"),
    c = g.spawn("basic");
  b.x += 20;
  c.x += 250;
  g.impact({ type: "cannon", stats: TOWERS.cannon.base, target: a });
  assert.equal(a.alive, false);
  assert.equal(b.alive, false);
  assert.equal(c.alive, true);
  const d = g.spawn("armored"),
    e = g.spawn("armored");
  e.x += 50;
  g.attack(
    { type: "lightning", x: 0, y: 170, shots: 0 },
    [d],
    TOWERS.lightning.base,
  );
  assert.ok(d.health < 115 && e.health < 115);
  assert.ok(d.health > 90);
  const { stats } = attack(g, "cannon", 1, 3);
  const f = g.spawn("brute"),
    neighbor = g.spawn("brute");
  neighbor.x += 42;
  const hp = neighbor.health;
  g.impact({ type: "cannon", stats, target: f });
  assert.ok(neighbor.health < hp - stats.damage);
});
test("magic resistance is meaningful while physical damage is fully effective", () => {
  const g = new Game();
  const e = g.spawn("wraith");
  g.damage(e, 50, { damageType: "magic", bypass: 1 });
  assert.equal(e.health, 90);
  g.damage(e, 50, { damageType: "physical" });
  assert.equal(e.health, 40);
});
test("healers cap health, never revive and show a timed pulse", () => {
  const g = new Game();
  const healer = g.spawn("healer"),
    ally = g.spawn("brute"),
    dead = g.spawn("basic");
  ally.health -= 10;
  dead.alive = false;
  const hp = dead.health;
  g.abilities(healer, 3);
  assert.equal(ally.health, ally.maxHealth);
  assert.equal(dead.health, hp);
  assert.equal(dead.alive, false);
});
test("warden shields protect nearby allies, absorb damage and stop protection when broken", () => {
  const g = new Game();
  const w = g.spawn("warden"),
    ally = g.spawn("brute");
  g.damage(ally, 100, { damageType: "physical" });
  assert.equal(ally.health, 270);
  g.damage(w, 120, { damageType: "physical" });
  assert.equal(w.shield, 0);
  assert.equal(w.health, 260);
  g.damage(ally, 100);
  assert.equal(ally.health, 170);
});
test("shardlings split once into exactly three faster, low-reward offspring", () => {
  const g = new Game();
  const e = g.spawn("shard");
  e.progress = 120;
  g.damage(e, 999);
  let children = g.enemies.filter((a) => a.alive);
  assert.equal(children.length, 3);
  assert.ok(
    children.every(
      (a) =>
        a.type === "sprout" &&
        a.reward === 3 &&
        !a.split &&
        a.speed > ENEMIES.sprout.speed,
    ),
  );
  assert.equal(g.gold, 320);
  children.forEach((e) => g.damage(e, 999));
  assert.equal(g.gold, 329);
  assert.equal(g.kills, 4);
  assert.equal(g.enemies.filter((e) => e.alive).length, 0);
});
test("boss phases add armor once, accelerate and summon allies without regeneration", () => {
  const g = new Game();
  const e = g.spawn("boss");
  g.damage(e, 6200, { damageType: "magic", bypass: 1 });
  assert.equal(e.phase, 2);
  assert.equal(e.armor, 850);
  g.breakArmor(e, 1000);
  g.damage(e, 1);
  assert.equal(e.armor, 0);
  g.damage(e, 7000, { damageType: "magic", bypass: 1 });
  assert.equal(e.phase, 3);
  assert.equal(e.speed, 41);
  g.abilities(e, 8);
  assert.ok(g.enemies.some((a) => a.type === "warden"));
  assert.equal(g.enemies.length, 4);
});
test("FIRST LAST STRONG WEAK priorities update immediately with deterministic ties", () => {
  const g = new Game();
  const t = g.place("archer", 145, 105);
  const a = g.spawn("basic"),
    b = g.spawn("brute"),
    c = g.spawn("basic");
  for (const e of [a, b, c]) Object.assign(e, { x: 145, y: 150 });
  a.progress = 100;
  b.progress = 50;
  c.progress = 100;
  for (const [priority, id] of [
    ["FIRST", a.id],
    ["LAST", b.id],
    ["STRONG", b.id],
    ["WEAK", a.id],
  ]) {
    assert.ok(g.setTargeting(t.id, priority));
    assert.equal(g.targets(t)[0].id, id);
  }
  assert.equal(g.setTargeting(t.id, "SUPPORT"), false);
  g.gold = 10000;
  upgrade(g, t, 2, 2);
  assert.ok(g.setTargeting(t.id, "SUPPORT"));
});
test("arrowstorm multishot and selling remove in-flight attacks and invested value", () => {
  const g = new Game();
  const { t, stats } = attack(g, "archer", 1, 3);
  const targets = Array.from({ length: 5 }, () => g.spawn("brute"));
  g.attack(t, targets, stats);
  assert.equal(g.projectiles.length, 5);
  g.sell(t.id);
  assert.equal(g.projectiles.length, 0);
});
test("ultimate pulses, storms, blizzards and thunder strikes damage groups differently", () => {
  for (const [type, p] of [
    ["frost", 0],
    ["frost", 2],
    ["lightning", 2],
    ["lightning", 1],
    ["archer", 1],
  ]) {
    const g = new Game();
    const { t, stats } = attack(g, type, p, 3);
    const enemies = Array.from({ length: 8 }, () => g.spawn("brute"));
    enemies.forEach((e, i) =>
      Object.assign(e, { x: t.x + 30 + i * 4, y: t.y + 20 }),
    );
    t.shots = (stats.pulseEvery || 6) - 1;
    g.attack(t, enemies, stats);
    assert.ok(
      g.projectiles.length > 0 || enemies.some((e) => e.health < e.maxHealth),
    );
    if (stats.pulse) assert.ok(enemies.every((e) => e.health < e.maxHealth));
  }
});
test("pause freezes all state; speed applies equally to abilities, zones, shots and movement", () => {
  const a = new Game(),
    b = new Game();
  for (const g of [a, b]) {
    g.place("fire", 145, 105);
    g.startWave();
    g.spawn("healer");
  }
  a.speed = 2;
  for (let i = 0; i < 80; i++) {
    a.update(0.025);
    b.update(0.025);
    b.update(0.025);
  }
  assert.equal(a.gold, b.gold);
  assert.equal(a.kills, b.kills);
  assert.equal(a.enemies.length, b.enemies.length);
  assert.ok(Math.abs(a.enemies[0].progress - b.enemies[0].progress) < 1e-6);
  a.paused = true;
  const snapshot = JSON.stringify(a);
  a.update(20);
  assert.equal(JSON.stringify(a), snapshot);
});
test("escapes deduct lives once, defeat blocks actions, restart resets every combat state", () => {
  const g = new Game();
  g.startWave();
  const boss = g.spawn("boss");
  boss.progress = PATH_LENGTH - 1;
  advance(g, 0.1);
  assert.equal(g.ended, "defeat");
  assert.equal(g.lives, 0);
  assert.equal(g.place("archer", 100, 100), null);
  assert.equal(g.startWave(), false);
  g.reset();
  assert.equal(g.gold, 300);
  assert.equal(g.lives, 20);
  assert.equal(g.wave, 0);
  assert.equal(g.ended, null);
  for (const key of ["projectiles", "enemies", "zones", "queue", "towers"])
    assert.equal(g[key].length, 0);
});
for (const strategy of Object.keys(STRATEGIES))
  test(`earned-gold ${strategy} strategy completes all twenty waves`, () => {
    const { model, report } = runCampaign(strategy);
    assert.equal(model.ended, "victory", JSON.stringify(report));
    assert.equal(report.length, 20);
    assert.ok(report.slice(0, 3).every((w) => w.lives === 20));
    assert.ok(model.kills > 600);
    assert.equal(model.enemies.length, 0);
    assert.equal(model.sell(model.towers[0].id), false);
    assert.equal(model.upgrade(model.towers[0].id), false);
    assert.ok(
      model.earned + 300 >= 18000 && model.earned + 300 <= 21000,
      `${model.earned + 300} campaign gold`,
    );
    assert.ok(
      report.find((w) => w.towers.some((t) => t.paths.includes(3))).wave <= 16,
    );
  });
test("nineteen classes and the preserved twenty Classic waves introduce abilities gradually, with one final boss", () => {
  assert.equal(Object.keys(ENEMIES).length, 19);
  assert.equal(WAVES.length, 20);
  assert.ok(WAVES.slice(0, 3).every((w) => w.every((g) => g.type === "basic")));
  for (const [index, type] of [
    [3, "runner"],
    [4, "sprout"],
    [6, "armored"],
    [8, "shard"],
    [10, "brute"],
    [12, "healer"],
    [13, "warden"],
    [14, "wraith"],
  ])
    assert.ok(WAVES[index].some((g) => g.type === type));
  assert.equal(WAVES.flat().filter((g) => g.type === "boss").length, 1);
  assert.ok(WAVES[19].some((g) => g.type === "boss"));
});
test("chain shattering consumes marks and awards each death exactly once", () => {
  const g = new Game();
  const foes = Array.from({ length: 4 }, () => g.spawn("brute"));
  foes.forEach((e, i) =>
    Object.assign(e, {
      x: 100 + i * 10,
      y: 100,
      health: 50,
      shatter: 65,
      shatterRadius: 80,
      slowLeft: 2,
    }),
  );
  const bounty = foes.reduce((n, e) => n + e.reward, 0);
  g.damage(foes[0], 30, { damageType: "physical" });
  assert.equal(g.kills, 4);
  assert.equal(g.gold, 300 + bounty);
  foes.forEach((e) => g.damage(e, 100));
  assert.equal(g.gold, 300 + bounty);
});
test("invalid coordinates and pause cannot create or purchase towers", () => {
  const g = new Game();
  assert.equal(g.place("archer", NaN, 100), null);
  assert.equal(g.place("archer", 100, Infinity), null);
  g.paused = true;
  assert.equal(g.place("archer", 145, 105), null);
  assert.equal(g.gold, 300);
});
test("boss summons have a hard lifetime cap and finite bounties", () => {
  const g = new Game();
  const boss = g.spawn("boss");
  for (let i = 0; i < 100; i++) g.abilities(boss, 100);
  assert.equal(boss.summons, 12);
  assert.equal(g.enemies.length, 37);
  assert.ok(g.enemies.filter((e) => e !== boss).every((e) => e.reward <= 6));
});
test("Inferno evolves into instant flame jets with capped focus heat that resets on retarget", () => {
  const events = [],
    g = new Game((e) => events.push(e.type));
  const { t, stats } = attack(g, "fire", 0, 3);
  const boss = g.spawn("boss");
  for (let i = 0; i < 20; i++) g.attack(t, [boss], stats);
  assert.equal(g.projectiles.length, 0);
  assert.ok(events.includes("jet"));
  assert.equal(t.heat, 2.2);
  assert.ok(boss.burn > stats.burn);
  const brute = g.spawn("brute");
  g.attack(t, [brute], stats);
  assert.equal(t.heat, 1);
  assert.equal(brute.burn, stats.burn);
});
test("shots leave from each tower's muzzle, not its base", () => {
  // Every type declares an emitter point measured from its artwork, well
  // above the ground anchor projectiles used to spawn from (y - 15).
  for (const [type, def] of Object.entries(TOWERS)) {
    assert.ok(Array.isArray(def.muzzle), `${type} declares a muzzle`);
    const probe = { type, x: 200, y: 300, paths: [0, 0, 0] };
    const m = towerMuzzle(probe);
    const layer = towerLayer(probe);
    if (layer) {
      // Layered states (turning proof): the muzzle is the artwork's
      // emitter point — for cannon the LEVEL pose's, at rest exactly
      // the drawn emitter position.
      const rest = layeredMuzzle(probe, layer);
      assert.equal(m.x, rest.x, `${type} layered muzzle x`);
      assert.equal(m.y, rest.y, `${type} layered muzzle y`);
      assert.ok(m.y < 270, `${type} layered emitter sits high on the art`);
      continue;
    }
    // Declared offsets are measured at the 80px reference render and
    // scale with the tower state's actual (per-state normalized)
    // display size. The effective declaration is the per-state
    // override when the type declares one (STATE_MUZZLES), else the
    // type muzzle.
    const declared = declaredMuzzle(probe);
    const k = towerDisplaySize({ type, paths: [0, 0, 0] }) / 80;
    assert.equal(m.x, 200 + declared[0] * k);
    assert.equal(m.y, 300 + declared[1] * k);
    assert.ok(declared[1] <= -28, `${type} muzzle is up at the emitter`);
  }
  // Archer per-state sweep (owner playtest, 2026-10-20: arrows left
  // from the tower's lower body): EVERY legal archer state — and the
  // ascended — declares an override measured on its own weapon, in
  // the artwork's upper reaches (frame y <= 0.45 at the 80px
  // reference, i.e. dy <= -44), never down at the old platform point.
  assert.ok(STATE_MUZZLES.archer, "archer declares per-state muzzles");
  for (const state of TOWER_STATES) {
    assert.ok(
      STATE_MUZZLES.archer[state],
      `archer ${state} has a measured muzzle`,
    );
  }
  assert.ok(STATE_MUZZLES.archer.ascended, "archer ascended muzzle");
  for (const [state, [dx, dy]] of Object.entries(STATE_MUZZLES.archer)) {
    assert.ok(dy <= -44, `archer ${state} muzzle sits up at the weapon`);
    assert.ok(Math.abs(dx) <= 36, `archer ${state} muzzle stays on the art`);
    const probe =
      state === "ascended"
        ? { type: "archer", x: 200, y: 300, paths: [3, 3, 3] }
        : {
            type: "archer",
            x: 200,
            y: 300,
            paths: state.split("-").map(Number),
          };
    const m = towerMuzzle(probe);
    const k = towerDisplaySize(probe) / 80;
    assert.equal(m.x, 200 + dx * k, `archer ${state} muzzle x`);
    assert.equal(m.y, 300 + dy * k, `archer ${state} muzzle y`);
  }
  // Wind per-state sweep (structure-first redo, 2026-10-20): every
  // non-layered wind state — and the ascended — declares an override
  // measured on its own artwork (the horn only on 0-0-1, rotor/hub on
  // the dual-weapon states, the hood vent on 3-0-1 / 3-1-0). The
  // three layered states stay out of the table on purpose:
  // towerMuzzle resolves them through their layer emitter instead.
  assert.ok(STATE_MUZZLES.wind, "wind declares per-state muzzles");
  const WIND_LAYERED = ["0-0-0", "0-0-3", "3-0-0"];
  for (const state of TOWER_STATES) {
    if (WIND_LAYERED.includes(state)) {
      assert.equal(
        STATE_MUZZLES.wind[state],
        undefined,
        `wind ${state} is layered — no table entry`,
      );
      continue;
    }
    assert.ok(
      STATE_MUZZLES.wind[state],
      `wind ${state} has a measured muzzle`,
    );
  }
  assert.ok(STATE_MUZZLES.wind.ascended, "wind ascended muzzle");
  for (const [state, [dx, dy]] of Object.entries(STATE_MUZZLES.wind)) {
    assert.ok(
      dy <= -35 && dy >= -80,
      `wind ${state} muzzle sits up at the emitter`,
    );
    assert.ok(Math.abs(dx) <= 36, `wind ${state} muzzle stays on the art`);
    const probe =
      state === "ascended"
        ? { type: "wind", x: 200, y: 300, paths: [3, 3, 3] }
        : {
            type: "wind",
            x: 200,
            y: 300,
            paths: state.split("-").map(Number),
          };
    assert.deepEqual(
      declaredMuzzle(probe),
      [dx, dy],
      `wind ${state} declared muzzle`,
    );
    const m = towerMuzzle(probe);
    const k = towerDisplaySize(probe) / 80;
    assert.equal(m.x, 200 + dx * k, `wind ${state} muzzle x`);
    assert.equal(m.y, 300 + dy * k, `wind ${state} muzzle y`);
  }
  // The layered wind states resolve through their (Phase-1 corrected)
  // layer emitters, never the table or the type muzzle.
  for (const state of WIND_LAYERED) {
    const probe = {
      type: "wind",
      x: 200,
      y: 300,
      paths: state.split("-").map(Number),
    };
    const layer = towerLayer(probe);
    assert.ok(layer, `wind ${state} has a layer`);
    const rest = layeredMuzzle(probe, layer);
    const m = towerMuzzle(probe);
    assert.equal(m.x, rest.x, `wind ${state} layered muzzle x`);
    assert.equal(m.y, rest.y, `wind ${state} layered muzzle y`);
  }
  assert.deepEqual(towerLayer({ type: "wind", paths: [0, 0, 3] }).emitter, [
    0.5, 0.134,
  ]);
  assert.deepEqual(towerLayer({ type: "wind", paths: [3, 0, 0] }).emitter, [
    0.52, 0.05,
  ]);
  // Integration: the rendered shot starts at the muzzle while the
  // logical flight keeps its classic start (the homing chase is
  // balance-tuned around it — see the spawn comment in Game.js). The
  // draw point then catches up to the logical position as it flies.
  const g = new Game();
  g.gold = 10000;
  const t = g.place("cannon", 145, 105);
  const e = g.spawn("basic");
  e.x = t.x + 60;
  e.y = t.y;
  g.attack(t, [e], towerStats(t));
  assert.equal(g.projectiles.length, 1);
  const m = towerMuzzle(t);
  assert.equal(g.projectiles[0].draw.x, m.x);
  assert.equal(g.projectiles[0].draw.y, m.y);
  assert.ok(g.projectiles[0].draw.y < t.y - 30);
  assert.equal(g.projectiles[0].x, t.x);
  assert.equal(g.projectiles[0].y, t.y - 15);
  g.active = true; // the sim only steps while a wave is running
  for (let i = 0; i < 12 && g.projectiles.length; i++) g.update(0.025);
  if (g.projectiles.length) {
    assert.equal(g.projectiles[0].draw.x, g.projectiles[0].x);
    assert.equal(g.projectiles[0].draw.y, g.projectiles[0].y);
  }
  // Ascended towers render larger; the muzzle scales with the sprite.
  // Frost was the table-less type this pinned to the type muzzle
  // until its own per-state table landed (frost pass, 2026-10-21):
  // the ascended now declares [0, -64], grounded on the current
  // Eternal Winter art, so the expectation reads the declaration.
  const big = towerMuzzle({ type: "frost", x: 0, y: 0, paths: [3, 3, 3] });
  assert.equal(
    big.y,
    declaredMuzzle({ type: "frost", paths: [3, 3, 3] })[1] *
      (towerDisplaySize({ type: "frost", paths: [3, 3, 3] }) / 80),
  );
});
test("mirror-facing weapons flip to the target's side — visuals only", () => {
  // Eligibility is pinned per type (surveyed state by state from
  // the battlefield art — see MIRRORED_WEAPONS in towers.js).
  const counts = Object.fromEntries(
    Object.entries(MIRRORED_WEAPONS).map(([k, v]) => [
      k,
      Object.keys(v).length,
    ]),
  );
  assert.deepEqual(counts, {
    archer: 22,
    wind: 7,
    tidecaller: 23,
  });
  const side = (type, state) =>
    mirrorDrawnSide(
      state === "ascended"
        ? { type, paths: [3, 3, 3] }
        : { type, paths: state.split("-").map(Number) },
    );
  // Spot signs: the tower the owner named, plus the left-drawn art.
  assert.equal(side("wind", "0-2-1"), 1); // the owner's horn tower
  assert.equal(side("wind", "0-0-1"), 1);
  assert.equal(side("wind", "3-0-1"), -1); // chimney keep, horn left
  assert.equal(side("archer", "0-0-0"), 1);
  assert.equal(side("archer", "3-0-0"), -1); // ballista bolt points left
  assert.equal(side("archer", "ascended"), -1); // glowing bow points left
  assert.equal(side("tidecaller", "0-0-0"), -1); // prow harpoon
  assert.equal(side("tidecaller", "3-0-0"), -1); // deck cannon
  // Layered states never mirror — cannon tops aim with drawn poses
  // and wind crowns are planted; the layered ascended included.
  // Since the mid-tier pose rollout (2026-10-21) EVERY cannon state
  // is layered, so the whole family reads null here.
  for (const [type, state] of [
    ["cannon", "0-0-0"],
    ["cannon", "0-0-1"],
    ["cannon", "0-0-2"],
    ["cannon", "0-0-3"],
    ["cannon", "0-1-0"],
    ["cannon", "0-1-1"],
    ["cannon", "0-1-2"],
    ["cannon", "0-1-3"],
    ["cannon", "0-2-0"],
    ["cannon", "0-2-1"],
    ["cannon", "0-3-0"],
    ["cannon", "0-3-1"],
    ["cannon", "1-0-0"],
    ["cannon", "1-0-1"],
    ["cannon", "1-0-2"],
    ["cannon", "1-0-3"],
    ["cannon", "1-1-0"],
    ["cannon", "1-2-0"],
    ["cannon", "1-3-0"],
    ["cannon", "2-0-0"],
    ["cannon", "2-0-1"],
    ["cannon", "2-1-0"],
    ["cannon", "3-0-0"],
    ["cannon", "3-0-1"],
    ["cannon", "3-1-0"],
    ["cannon", "ascended"],
    ["wind", "0-0-0"],
    ["wind", "0-0-3"],
    ["wind", "3-0-0"],
  ])
    assert.equal(side(type, state), null, `${type} ${state} is layered`);
  // Dual-weapon archers (same weapon both sides) and the radial
  // maelstrom ships stay put, as does every state of the five
  // types with no pointing weapon at all.
  for (const s of ["0-2-0", "1-2-0", "0-2-1", "0-3-0"])
    assert.equal(side("archer", s), null, `archer ${s} is dual-sided`);
  for (const s of ["0-0-3", "0-1-3", "ascended"])
    assert.equal(side("tidecaller", s), null, `tidecaller ${s} has no prow weapon`);
  for (const type of ["frost", "fire", "lightning", "grove", "rune"])
    assert.equal(side(type, "0-0-0"), null, `${type} has no pointing weapon`);

  // Facing resolution: the deadband holds the facing, a clearly
  // sided target flips (or un-flips), no target holds the last.
  const horn = { type: "wind", x: 400, y: 300, paths: [0, 2, 1] }; // drawn +1
  assert.equal(mirrorFlipFor(horn, 500, false), false); // right: as drawn
  assert.equal(mirrorFlipFor(horn, 300, false), true); // left: mirror
  assert.equal(mirrorFlipFor(horn, 300, true), true);
  assert.equal(mirrorFlipFor(horn, 400 + MIRROR_DEADBAND, true), true); // in band: hold
  assert.equal(mirrorFlipFor(horn, 400 - MIRROR_DEADBAND, false), false); // in band: hold
  assert.equal(mirrorFlipFor(horn, 400 + MIRROR_DEADBAND + 1, true), false); // past band: settle
  assert.equal(mirrorFlipFor(horn, null, true), true); // no target: hold
  assert.equal(mirrorFlipFor(horn, undefined, false), false);
  const keep = { type: "wind", x: 400, y: 300, paths: [3, 0, 1] }; // drawn −1
  assert.equal(mirrorFlipFor(keep, 300, false), false); // left: as drawn
  assert.equal(mirrorFlipFor(keep, 500, false), true); // right: mirror
  const frost = { type: "frost", x: 400, y: 300, paths: [0, 0, 0] };
  assert.equal(mirrorFlipFor(frost, 100, true), false); // ineligible never flips

  // The visual muzzle mirrors across the tower's axis while the
  // sprite is flipped; the canonical muzzle never reads the flag.
  const probe = { type: "wind", x: 400, y: 300, paths: [0, 2, 1] };
  const m = towerMuzzle(probe);
  assert.deepEqual(towerVisualMuzzle(probe), m);
  probe._mirrorFlip = true;
  const vm = towerVisualMuzzle(probe);
  assert.equal(vm.x, 800 - m.x);
  assert.equal(vm.y, m.y);
  assert.deepEqual(towerMuzzle(probe), m);
  // Sweep: every eligible state's visual muzzle mirrors exactly.
  for (const [type, states] of Object.entries(MIRRORED_WEAPONS))
    for (const state of Object.keys(states)) {
      const p =
        state === "ascended"
          ? { type, x: 200, y: 300, paths: [3, 3, 3] }
          : { type, x: 200, y: 300, paths: state.split("-").map(Number) };
      const base = towerMuzzle(p);
      p._mirrorFlip = true;
      const flipped = towerVisualMuzzle(p);
      assert.equal(flipped.x, 400 - base.x, `${type} ${state} visual muzzle x`);
      assert.equal(flipped.y, base.y, `${type} ${state} visual muzzle y`);
    }
  // A stray flip flag on an ineligible or layered tower is inert.
  const inert = [
    { type: "frost", x: 400, y: 300, paths: [0, 0, 0], _mirrorFlip: true },
    { type: "cannon", x: 400, y: 300, paths: [0, 0, 0], _mirrorFlip: true },
    { type: "archer", x: 400, y: 300, paths: [0, 2, 0], _mirrorFlip: true },
  ];
  for (const p of inert)
    assert.deepEqual(towerVisualMuzzle(p), towerMuzzle(p));

  // Integration: a shot fired while flipped draws from the
  // mirrored muzzle; the logical spawn stays (t.x, t.y − 15).
  const g = new Game();
  g.gold = 10000;
  const t = g.place("archer", 145, 105);
  const e = g.spawn("basic");
  e.x = t.x - 60;
  e.y = t.y;
  t._mirrorFlip = true; // the scene would set this from the target's side
  g.attack(t, [e], towerStats(t));
  const p = g.projectiles.at(-1);
  const mm = towerMuzzle(t);
  assert.equal(p.draw.x, t.x * 2 - mm.x);
  assert.equal(p.draw.y, mm.y);
  assert.equal(p.x, t.x);
  assert.equal(p.y, t.y - 15);
});
test("layered towers: twenty-nine states, cannon poses aim, wind static", () => {
  // The turning proof layered five states; the rollout (owner,
  // 2026-10-20: "do it to the upgrades") added the cannon's other
  // Tier-3 paths and its ascended, and the mid-tier rollout
  // (2026-10-21: "do them all to the standard") layered the 21
  // remaining cannon states — every cannon state now aims with
  // drawn poses. Every state of every OTHER tower (besides the
  // three static wind crowns) stays on the single-sprite path.
  assert.deepEqual(Object.keys(towerLayers).sort(), [
    "tower_cannon_0-0-0",
    "tower_cannon_0-0-1",
    "tower_cannon_0-0-2",
    "tower_cannon_0-0-3",
    "tower_cannon_0-1-0",
    "tower_cannon_0-1-1",
    "tower_cannon_0-1-2",
    "tower_cannon_0-1-3",
    "tower_cannon_0-2-0",
    "tower_cannon_0-2-1",
    "tower_cannon_0-3-0",
    "tower_cannon_0-3-1",
    "tower_cannon_1-0-0",
    "tower_cannon_1-0-1",
    "tower_cannon_1-0-2",
    "tower_cannon_1-0-3",
    "tower_cannon_1-1-0",
    "tower_cannon_1-2-0",
    "tower_cannon_1-3-0",
    "tower_cannon_2-0-0",
    "tower_cannon_2-0-1",
    "tower_cannon_2-1-0",
    "tower_cannon_3-0-0",
    "tower_cannon_3-0-1",
    "tower_cannon_3-1-0",
    "tower_cannon_ascended",
    "tower_wind_0-0-0",
    "tower_wind_0-0-3",
    "tower_wind_3-0-0",
  ]);
  for (const type of Object.keys(TOWERS))
    for (const state of TOWER_STATES) {
      const paths = state.split("-").map(Number);
      const layered = towerLayer({ type, paths }) !== null;
      assert.equal(
        layered,
        `tower_${type}_${state}` in towerLayers,
        `${type} ${state} layer lookup`,
      );
    }
  for (const key of Object.keys(towerLayers))
    assert.equal(
      towerLayers[key].mode,
      key.startsWith("tower_cannon") ? "poses" : "static",
      `${key} aim mode`,
    );
  // The ascended layer resolves under its own key (artworkState has
  // no ascended form), its files follow the <type>_ascended stem, and
  // types without an ascended layer stay single-sprite.
  const asc = { type: "cannon", x: 200, y: 300, paths: [3, 3, 3] };
  assert.equal(towerLayer(asc), towerLayers.tower_cannon_ascended);
  assert.ok(towerBaseArtwork(asc).endsWith("cannon_ascended_base.png"));
  assert.ok(towerTopArtwork(asc).endsWith("cannon_ascended_top.png"));
  assert.ok(
    towerTopArtwork(asc, "raised").endsWith("cannon_ascended_top_raised.png"),
  );
  assert.ok(
    towerTopArtwork(asc, "down").endsWith("cannon_ascended_top_down.png"),
  );
  assert.equal(towerLayer({ type: "frost", paths: [3, 3, 3] }), null);
  // Every layered cannon state rests at its level-pose emitter,
  // measured on the drawn gun (batch-1/2 proof + rollout art and
  // the batch-3 mid-tier art), never the old per-type muzzle. The
  // height bound is 280 rather than the Tier-3 sweep's 270: the
  // low-slung 1-0-2 twin rests at 270.2 — still ~30px up on the
  // gun at display 96, far from the platform spawn (y − 15).
  for (const key of Object.keys(towerLayers).filter((k) =>
    k.startsWith("tower_cannon"),
  )) {
    const state = key.replace("tower_cannon_", "");
    const paths =
      state === "ascended" ? [3, 3, 3] : state.split("-").map(Number);
    const probe = { type: "cannon", x: 200, y: 300, paths };
    const layer = towerLayer(probe);
    assert.ok(layer, `cannon ${state} resolves a layer`);
    const rest = layeredMuzzle(probe, layer);
    const m = towerMuzzle(probe);
    assert.equal(m.x, rest.x, `cannon ${state} rest muzzle x`);
    assert.equal(m.y, rest.y, `cannon ${state} rest muzzle y`);
    assert.ok(m.y < 280, `cannon ${state} emitter sits up on the gun`);
    // The three poses genuinely step the muzzle: raised highest,
    // down lowest on the page, on every layered cannon state.
    const yOf = (poseName) => layeredMuzzle(probe, layer, poseName, false).y;
    assert.ok(
      yOf("raised") < yOf("level") && yOf("level") < yOf("down"),
      `cannon ${state} poses step the muzzle`,
    );
  }
  const close = (a, b) => Math.abs(a - b) < 1e-9;
  // Pose selection from the pivot->target offset (canvas space, y
  // down): elevation φ = atan2(−dy, |dx|), up positive, measured
  // against the FACING side. Bands: φ > +9° raised, φ < −9° down,
  // else level — with ±2.5° of hysteresis against the current pose.
  // at(φ°, side): an offset at elevation φ on the given facing side.
  const at = (phiDeg, side = -1, dist = 100) => {
    const r = (phiDeg * Math.PI) / 180;
    return [side * Math.cos(r) * dist, -Math.sin(r) * dist];
  };
  const band = POSE_BAND_DEG,
    hyst = POSE_HYSTERESIS_DEG;
  // Facing: flip follows the target's side, dead ahead keeps left.
  assert.equal(poseForBearing(-100, 0).flip, false);
  assert.equal(poseForBearing(100, 0).flip, true);
  assert.equal(poseForBearing(0, -100).flip, false);
  // From level, a pose engages only past band + hysteresis.
  assert.equal(poseForBearing(...at(band + hyst - 0.5)).pose, "level");
  assert.equal(poseForBearing(...at(band + hyst + 0.5)).pose, "raised");
  assert.equal(poseForBearing(...at(-band - hyst + 0.5)).pose, "level");
  assert.equal(poseForBearing(...at(-band - hyst - 0.5)).pose, "down");
  assert.equal(poseForBearing(...at(45)).pose, "raised");
  assert.equal(poseForBearing(...at(-45)).pose, "down");
  assert.equal(poseForBearing(...at(0)).pose, "level");
  // The same elevations read identically on the flipped side.
  assert.equal(poseForBearing(...at(30, 1)).pose, "raised");
  assert.equal(poseForBearing(...at(-30, 1)).pose, "down");
  // Hysteresis: once raised, the pose holds until φ falls back under
  // band − hysteresis; hovering between the edges never flickers.
  assert.equal(poseForBearing(...at(band), "raised").pose, "raised");
  assert.equal(poseForBearing(...at(band - hyst + 0.5), "raised").pose, "raised");
  assert.equal(poseForBearing(...at(band - hyst - 0.5), "raised").pose, "level");
  assert.equal(poseForBearing(...at(-band), "down").pose, "down");
  assert.equal(poseForBearing(...at(-band + hyst - 0.5), "down").pose, "down");
  assert.equal(poseForBearing(...at(-band + hyst + 0.5), "down").pose, "level");
  let pose = "level";
  for (let i = 0; i < 20; i++)
    pose = poseForBearing(...at(i % 2 ? band - 1 : band + 1), pose).pose;
  assert.equal(pose, "level", "hovering at the band edge never engages");
  pose = "raised";
  for (let i = 0; i < 20; i++)
    pose = poseForBearing(...at(i % 2 ? band - 1 : band + 1), pose).pose;
  assert.equal(pose, "raised", "hovering at the band edge never releases");
  // A swing straight across jumps pose to pose without a level stop.
  assert.equal(poseForBearing(...at(-45), "raised").pose, "down");
  assert.equal(poseForBearing(...at(45), "down").pose, "raised");
  // Straight above/below are pure elevation on either side.
  assert.equal(poseForBearing(0, -100).pose, "raised");
  assert.equal(poseForBearing(0, 100).pose, "down");
  // Muzzle = the ACTIVE pose's emitter, mirrored under flip. Cannon's
  // side-profile emitters sit far LEFT of the trunnion pivot.
  const t = { type: "cannon", x: 400, y: 300, paths: [0, 0, 0] };
  const layer = towerLayer(t),
    display = towerDisplaySize(t);
  assert.equal(layer.mode, "poses");
  const pivot = {
    x: t.x + (layer.pivot[0] - 0.5) * display,
    y: t.y + (layer.pivot[1] - 0.96) * display,
  };
  const expectMuzzle = (poseName, flip) => {
    const e = layer.poses[poseName];
    const ox = (e[0] - layer.pivot[0]) * display,
      oy = (e[1] - layer.pivot[1]) * display;
    return { x: pivot.x + (flip ? -ox : ox), y: pivot.y + oy };
  };
  for (const poseName of ["level", "raised", "down"])
    for (const flip of [false, true]) {
      const m = layeredMuzzle(t, layer, poseName, flip);
      const want = expectMuzzle(poseName, flip);
      assert.ok(
        close(m.x, want.x) && close(m.y, want.y),
        `${poseName} muzzle${flip ? " (flipped)" : ""}`,
      );
      assert.ok(
        Math.abs(m.x - pivot.x) > display * 0.35,
        `${poseName} emitter sits far from the pivot`,
      );
    }
  // The three poses genuinely move the muzzle (raised highest, down
  // lowest on the page), and towerMuzzle reads the scene's channels.
  const yOf = (poseName) => layeredMuzzle(t, layer, poseName, false).y;
  assert.ok(yOf("raised") < yOf("level") && yOf("level") < yOf("down"));
  const viaMuzzle = towerMuzzle(t);
  const levelRest = expectMuzzle("level", false);
  assert.ok(close(viaMuzzle.x, levelRest.x) && close(viaMuzzle.y, levelRest.y));
  const aimed = towerMuzzle({ ...t, _aimPose: "down", _aimFlip: true });
  const wantAimed = expectMuzzle("down", true);
  assert.ok(close(aimed.x, wantAimed.x) && close(aimed.y, wantAimed.y));
  // Wind is fully static: one fixed emitter, and stray pose/flip
  // channels can never move its muzzle.
  const w = { type: "wind", x: 100, y: 100, paths: [0, 0, 3] };
  const wLayer = towerLayer(w);
  assert.equal(wLayer.mode, "static");
  const wRest = towerMuzzle(w),
    wStray = towerMuzzle({ ...w, _aimPose: "down", _aimFlip: true });
  assert.ok(close(wStray.x, wRest.x) && close(wStray.y, wRest.y));
  const wDisplay = towerDisplaySize(w);
  assert.ok(
    close(
      wRest.x,
      w.x + (wLayer.emitter[0] - 0.5) * wDisplay,
    ) &&
      close(
        wRest.y,
        w.y + (wLayer.emitter[1] - 0.96) * wDisplay,
      ),
    "wind muzzle is its fixed measured emitter",
  );
});
test("upgrading never shrinks a tower's rendered size", () => {
  // Round 5 regression (owner playtest, 2026-10-19): per-state width
  // normalization scaled each state independently, so a tower SHRANK
  // on upgrade when the higher-tier artwork was wider — the owner
  // watched a Windcaller (120.5px at 0-0-0) drop to 96px as Tornado
  // Master (3-0-0). Effective factors now floor at the largest raw
  // factor among a state's componentwise ancestors, so display size
  // is monotonic along every upgrade path.
  const parse = (s) => s.split("-").map(Number);
  const leq = (a, b) => a.every((v, i) => v <= b[i]);
  for (const type of Object.keys(TOWERS)) {
    const sizes = new Map(
      TOWER_STATES.map((s) => [
        s,
        towerDisplaySize({ type, paths: parse(s) }),
      ]),
    );
    for (const a of TOWER_STATES)
      for (const b of TOWER_STATES)
        if (leq(parse(a), parse(b)))
          assert.ok(
            sizes.get(b) >= sizes.get(a) - 1e-9,
            `${type} ${a} -> ${b} must not shrink (${sizes.get(a)} -> ${sizes.get(b)})`,
          );
    const ascended = towerDisplaySize({ type, paths: [3, 3, 3] });
    for (const s of TOWER_STATES)
      assert.ok(
        ascended >= sizes.get(s),
        `${type} ascended must be at least ${s}`,
      );
  }
  // The owner's exact case.
  assert.ok(
    towerDisplaySize({ type: "wind", paths: [3, 0, 0] }) >=
      towerDisplaySize({ type: "wind", paths: [0, 0, 0] }),
    "Tornado Master renders no smaller than the base Windcaller",
  );
});
