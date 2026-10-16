import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/systems/Game.js";
import { ENEMIES } from "../src/data/enemies.js";
import { campaignFor } from "../src/data/difficulties.js";

// Expansion (2026-10): water placement, two trails, and the new enemy
// traits — dodge, burrowing, egg-laying, generalized splits, minibosses.

const stepSeconds = (g, seconds) => {
  for (let t = 0; t < seconds; t += 0.05) g.update(0.05);
};

test("water rules: Tidecaller needs a pond, land towers are kept out", () => {
  const g = new Game(() => {}, { map: "twinponds" });
  g.gold = 5000;
  assert.equal(g.canPlace("archer", 285, 235), "Only the Tidecaller can sail there.");
  assert.equal(g.canPlace("tidecaller", 480, 400), "The Tidecaller needs open water — place it in a pond or lake.");
  assert.ok(g.place("tidecaller", 285, 235));
  assert.equal(g.canPlace("tidecaller", 285, 235), "Give your towers a little room.");
  const dry = new Game(() => {}, { map: "classic" });
  dry.gold = 5000;
  assert.equal(
    dry.canPlace("tidecaller", 145, 105),
    "The Tidecaller needs open water — place it in a pond or lake.",
  );
});

test("two fronts: queue spawns are dealt across both trails", () => {
  const g = new Game(() => {}, { map: "twofronts", difficulty: "hard" });
  g.gold = 100000;
  g.startWave();
  stepSeconds(g, 8);
  const trails = new Set(g.enemies.map((e) => g.trails.indexOf(e.trail)));
  assert.ok(g.enemies.length > 3);
  assert.deepEqual([...trails].sort(), [0, 1]);
});

test("shadowhart dodges about half of direct hits, never area or ticks", () => {
  const g = new Game();
  const hart = g.spawn("shadowhart");
  hart.health = hart.maxHealth = 100000;
  let dodges = 0;
  g.onEvent = (ev) => {
    if (ev.type === "dodge") dodges++;
  };
  for (let i = 0; i < 400; i++)
    g.damage(hart, 1, { damageType: "physical", penetration: 1 });
  assert.ok(dodges > 140 && dodges < 260, `${dodges} dodges in 400 hits`);
  const before = hart.health;
  for (let i = 0; i < 40; i++)
    g.damage(hart, 10, { damageType: "physical", penetration: 1, area: true });
  assert.equal(hart.health, before - 400);
  // Slowed: the dodge switches off entirely.
  hart.slowLeft = 5;
  dodges = 0;
  for (let i = 0; i < 40; i++)
    g.damage(hart, 1, { damageType: "physical", penetration: 1 });
  assert.equal(dodges, 0);
});

test("shadowhart bursts into five umbralings on its own trail", () => {
  const g = new Game(() => {}, { map: "twofronts" });
  const hart = g.spawn("shadowhart", { trail: g.trails[1] });
  hart.progress = 300;
  g.damage(hart, 999999, { damageType: "physical", penetration: 1, area: true });
  const fawns = g.enemies.filter((e) => e.type === "umbraling" && e.alive);
  assert.equal(fawns.length, 5);
  assert.ok(fawns.every((f) => f.trail === g.trails[1]));
  assert.ok(fawns.every((f) => f.reward === ENEMIES.umbraling.reward));
});

test("shardling split is unchanged: three sprouts, 3g, quarter faster", () => {
  const g = new Game();
  const shard = g.spawn("shard");
  const base = ENEMIES.sprout.speed * (1 + Math.min(g.stage * 0.03, 0.12));
  g.damage(shard, 999999, { damageType: "physical", penetration: 1 });
  const kids = g.enemies.filter((e) => e.type === "sprout" && e.alive);
  assert.equal(kids.length, 3);
  assert.ok(kids.every((k) => k.reward === 3));
  assert.ok(kids.every((k) => Math.abs(k.speed - base * 1.25) < 0.01));
});

test("dustdiver dives: untargetable and unhittable, burns keep ticking", () => {
  const g = new Game();
  g.gold = 10000;
  const tower = g.place("archer", 145, 105);
  const diver = g.spawn("dustdiver");
  diver.progress = 200;
  Object.assign(diver, diver.trail.onPath(200));
  diver.burrowTimer = 0.01;
  g.active = true;
  stepSeconds(g, 0.2);
  assert.equal(diver.burrowed, true);
  assert.equal(g.targets(tower).includes(diver), false);
  const hp = diver.health;
  g.damage(diver, 50, { damageType: "physical", penetration: 1 });
  assert.equal(diver.health, hp);
  g.damage(diver, 5, { damageType: "magic", tick: true, bypass: 1 });
  assert.ok(diver.health < hp);
  stepSeconds(g, 1.5);
  assert.equal(diver.burrowed, false);
});

test("broodmother lays capped eggs; eggs hatch two sprouts; freeze pauses", () => {
  const g = new Game();
  g.active = true;
  const mother = g.spawn("broodmother");
  mother.progress = 100;
  for (let i = 0; i < 30; i++) g.abilities(mother, 99);
  const sacs = g.enemies.filter((e) => e.type === "eggsac" && e.alive);
  assert.equal(sacs.length, ENEMIES.broodmother.eggCap);
  assert.ok(sacs.every((s) => s.health === ENEMIES.eggsac.health));
  const sac = sacs[0];
  sac.frozen = 10;
  const left = sac.hatchLeft;
  stepSeconds(g, 1);
  assert.equal(sac.hatchLeft, left);
  sac.frozen = 0;
  stepSeconds(g, 3.2);
  assert.equal(sac.alive, false);
  assert.ok(
    g.enemies.filter((e) => e.type === "sprout" && e.alive).length >= 2,
  );
});

test("a wave never waits on leftover egg sacs", () => {
  const g = new Game();
  g.active = true;
  g.queue = [];
  g.spawn("eggsac");
  stepSeconds(g, 0.1);
  assert.equal(g.active, false);
});

test("miniboss schedule: shadowhart at 25, broodmother at 35, pairs at 95", () => {
  const hard = campaignFor("emerald", "hard");
  const typesAt = (w) => hard.waves[w - 1].map((gr) => gr.type);
  assert.ok(typesAt(25).includes("shadowhart"));
  assert.ok(typesAt(35).includes("broodmother"));
  assert.ok(typesAt(45).includes("shadowhart"));
  assert.equal(
    hard.waves[94].find((gr) => gr.type === "broodmother")?.count,
    2,
  );
  assert.ok(!typesAt(24).includes("shadowhart"));
  assert.ok(!typesAt(20).includes("shadowhart"));
  const easy = campaignFor("emerald", "easy");
  assert.equal(easy.waves.length, 20);
  assert.ok(easy.waves.flat().every((gr) => gr.type !== "shadowhart"));
  assert.ok(typesAt(18).includes("dustdiver"));
});

test("tidecaller fights from the pond", () => {
  const g = new Game(() => {}, { map: "twinponds" });
  g.gold = 10000;
  const boat = g.place("tidecaller", 285, 235);
  assert.ok(boat);
  const walker = g.spawn("basic");
  walker.progress = 340; // on the pond loop, inside harpoon range
  Object.assign(walker, walker.trail.onPath(340));
  walker.health = walker.maxHealth = 5000;
  g.active = true;
  const hp = walker.health;
  stepSeconds(g, 3);
  assert.ok(walker.health < hp, "boat should damage enemies sailing past");
});
