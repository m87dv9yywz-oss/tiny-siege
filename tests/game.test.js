import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/systems/Game.js";
import { TOWERS } from "../src/data/towers.js";
import { WAVES } from "../src/data/waves.js";
import { PATH_LENGTH, onPath } from "../src/data/map.js";
import { runCampaign } from "./strategy.js";
const nearStart = (g, type = "archer") => g.place(type, 145, 105);
const advance = (g, seconds) => {
  for (let i = 0; i < seconds * 40 && !g.ended; i++) g.update(0.025);
};
test("starting defense, legal placement, collision, insufficient funds and refunds", () => {
  const g = new Game();
  assert.equal(g.gold, 300);
  assert.equal(g.lives, 20);
  assert.equal(g.active, false);
  assert.equal(g.place("archer", 150, 170), null);
  assert.equal(g.place("archer", -4, 100), null);
  const t = nearStart(g);
  assert.ok(t);
  assert.equal(g.gold, 225);
  assert.equal(g.place("archer", 155, 110), null);
  assert.ok(g.upgrade(t.id));
  assert.equal(t.level, 2);
  assert.equal(g.gold, 125);
  assert.equal(g.upgrade(t.id), false);
  assert.equal(g.place("lightning", 400, 100), null);
  assert.ok(g.sell(t.id));
  assert.equal(g.gold, 247);
  assert.equal(g.towers.length, 0);
});
test("real combat kills, awards once, and clears a manual wave", () => {
  const g = new Game();
  nearStart(g);
  assert.ok(g.startWave());
  assert.equal(g.startWave(), false);
  advance(g, 70);
  assert.equal(g.active, false);
  assert.equal(g.wave, 1);
  assert.equal(g.kills, 6);
  assert.equal(g.lives, 20);
  assert.equal(g.gold, 225 + 6 * 9 + 23);
  advance(g, 10);
  assert.equal(g.wave, 1);
  assert.equal(g.remaining, 0);
  const e = g.spawn("basic");
  g.damage(e, 999);
  const gold = g.gold;
  g.damage(e, 999);
  assert.equal(g.gold, gold);
});
test("armor resists arrows while magic deals full damage", () => {
  const g = new Game();
  const e = g.spawn("armored");
  g.damage(e, 100);
  assert.equal(e.health, 70);
  g.damage(e, 20, true);
  assert.equal(e.health, 50);
});
test("frost slows and freezes movement, and fire burns without further hits", () => {
  const g = new Game();
  g.active = true;
  g.queue = [{ type: "basic", at: 999 }];
  const e = g.spawn("brute");
  g.applyHit({ type: "frost", stats: TOWERS.frost.levels[2], freeze: true }, e);
  const start = e.progress;
  advance(g, 0.5);
  assert.equal(e.progress, start);
  advance(g, 1);
  assert.ok(e.progress > start && e.progress < e.speed * 0.7);
  const hp = e.health;
  g.applyHit({ type: "fire", stats: TOWERS.fire.levels[1] }, e);
  advance(g, 1);
  assert.ok(e.health < hp - 29 - 15);
});
test("cannon splash and lightning chains damage nearby enemies", () => {
  const g = new Game();
  const a = g.spawn("basic"),
    b = g.spawn("basic"),
    c = g.spawn("basic");
  b.x += 20;
  c.x += 250;
  g.impact({ type: "cannon", stats: TOWERS.cannon.levels[0], target: a });
  assert.equal(a.alive, false);
  assert.equal(b.alive, false);
  assert.equal(c.alive, true);
  const d = g.spawn("armored"),
    e = g.spawn("armored");
  e.x += 50;
  const t = { type: "lightning", x: 0, y: 170, shots: 0 };
  g.attack(t, [d], TOWERS.lightning.levels[0]);
  assert.ok(d.health < 135 && e.health < 135);
});
test("level-three Archer multishot and selling removes in-flight attacks", () => {
  const g = new Game();
  const t = nearStart(g);
  t.level = 3;
  const targets = [g.spawn("armored"), g.spawn("armored"), g.spawn("armored")];
  g.attack(t, targets, TOWERS.archer.levels[2]);
  assert.equal(g.projectiles.length, 3);
  g.sell(t.id);
  assert.equal(g.projectiles.length, 0);
});
test("pause stops the entire simulation and 2x matches two normal updates", () => {
  const a = new Game(),
    b = new Game();
  nearStart(a, "fire");
  nearStart(b, "fire");
  a.startWave();
  b.startWave();
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
  const state = JSON.stringify(a);
  a.update(20);
  assert.equal(JSON.stringify(a), state);
});
test("escapes remove lives, defeat blocks all spending, and restart clears state", () => {
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
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.enemies.length, 0);
});
test("a reasonable mixed defense completes all 20 waves, including the boss", () => {
  const { model, report } = runCampaign();
  assert.equal(model.ended, "victory", JSON.stringify(report));
  assert.equal(model.wave, 20);
  assert.equal(report.length, 20);
  assert.ok(report.slice(0, 3).every((w) => w.lives === 20));
  assert.ok(model.kills > 600);
  assert.equal(model.enemies.length, 0);
  assert.equal(model.sell(model.towers[0].id), false);
  assert.equal(model.upgrade(model.towers[0].id), false);
});
test("wave roster introduces enemies gradually and has exactly one final boss", () => {
  assert.equal(WAVES.length, 20);
  assert.ok(WAVES.slice(0, 3).every((w) => w.every((g) => g.type === "basic")));
  assert.ok(WAVES[3].some((g) => g.type === "runner"));
  assert.ok(WAVES[6].some((g) => g.type === "armored"));
  assert.ok(WAVES[10].some((g) => g.type === "brute"));
  assert.equal(WAVES.flat().filter((g) => g.type === "boss").length, 1);
  assert.ok(WAVES[19].some((g) => g.type === "boss"));
});
