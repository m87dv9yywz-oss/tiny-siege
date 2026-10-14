import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/systems/Game.js";
import {
  TOWERS,
  towerStats,
  upgradeState,
  towerName,
} from "../src/data/towers.js";
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
    [75, 160, 130, 150, 200, 115, 145, 175],
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
      const g = new Game();
      g.gold = 10000;
      const t = g.place(type, 145, 105);
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
test("fourteen classes and the preserved twenty Classic waves introduce abilities gradually, with one final boss", () => {
  assert.equal(Object.keys(ENEMIES).length, 14);
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
