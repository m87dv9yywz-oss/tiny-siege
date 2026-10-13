import { TOWERS } from "../data/towers.js";
import { ENEMIES } from "../data/enemies.js";
import { waveQueue } from "../data/waves.js";
import { MAP, PATH_LENGTH, onPath, distanceToPath } from "../data/map.js";
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export class Game {
  constructor(onEvent = () => {}) {
    this.onEvent = onEvent;
    this.reset();
  }
  reset() {
    Object.assign(this, {
      gold: 300,
      lives: 20,
      wave: 0,
      kills: 0,
      earned: 0,
      towers: [],
      enemies: [],
      projectiles: [],
      queue: [],
      waveTime: 0,
      active: false,
      paused: false,
      speed: 1,
      ended: null,
      id: 0,
    });
    this.emit("reset");
  }
  emit(type, payload = {}) {
    this.onEvent({ type, ...payload });
  }
  canPlace(type, x, y) {
    if (this.ended) return "The battle is over.";
    if (!TOWERS[type]) return "Choose a tower first.";
    if (this.gold < TOWERS[type].cost) return "Not enough gold for this tower.";
    if (x < 30 || x > MAP.width - 30 || y < 60 || y > MAP.height - 30)
      return "Stay inside the battlefield.";
    if (distanceToPath(x, y) < MAP.pathWidth / 2 + MAP.towerRadius)
      return "Keep the trail clear.";
    if (this.towers.some((t) => Math.hypot(t.x - x, t.y - y) < 52))
      return "Give your towers a little room.";
    return null;
  }
  place(type, x, y) {
    const error = this.canPlace(type, x, y);
    if (error) {
      this.emit("invalid", { message: error });
      return null;
    }
    const tower = {
      id: ++this.id,
      type,
      x,
      y,
      level: 1,
      invested: TOWERS[type].cost,
      cooldown: 0.1,
      shots: 0,
    };
    this.gold -= tower.invested;
    this.towers.push(tower);
    this.emit("build", { tower });
    return tower;
  }
  upgrade(id) {
    const t = this.towers.find((t) => t.id === id);
    if (!t || this.ended || t.level === 3) return false;
    const cost = TOWERS[t.type].upgrades[t.level - 1];
    if (this.gold < cost) {
      this.emit("invalid", { message: "Save a little more gold to upgrade." });
      return false;
    }
    this.gold -= cost;
    t.invested += cost;
    t.level++;
    this.emit("upgrade", { tower: t });
    return true;
  }
  sell(id) {
    const t = this.towers.find((t) => t.id === id);
    if (!t || this.ended) return false;
    const value = Math.floor(t.invested * 0.7);
    this.gold += value;
    this.towers = this.towers.filter((a) => a !== t);
    this.projectiles = this.projectiles.filter((p) => p.towerId !== id);
    this.emit("sell", { tower: t, value });
    return true;
  }
  startWave() {
    if (this.active || this.ended || this.paused || this.wave >= 20)
      return false;
    this.wave++;
    this.queue = waveQueue(this.wave);
    this.waveTime = 0;
    this.active = true;
    this.emit("wave");
    return true;
  }
  get remaining() {
    return this.queue.length + this.enemies.filter((e) => e.alive).length;
  }
  spawn(type) {
    const config = ENEMIES[type],
      scale =
        type === "boss"
          ? 1
          : 1 +
            Math.max(0, this.wave - 1) * 0.09 +
            Math.pow(Math.max(0, this.wave - 10), 2) * 0.035;
    const e = {
      id: ++this.id,
      type,
      ...config,
      health: config.health * scale,
      maxHealth: config.health * scale,
      reward: Math.round(config.reward * (1 + (this.wave - 1) * 0.035)),
      progress: 0,
      alive: true,
      burn: 0,
      burnLeft: 0,
      slow: 1,
      slowLeft: 0,
      frozen: 0,
      ...onPath(0),
    };
    this.enemies.push(e);
    this.emit("spawn", { enemy: e });
    return e;
  }
  damage(e, amount, magic = false) {
    if (!e?.alive || this.ended) return;
    e.health -= amount * (magic ? 1 : 1 - e.armor);
    if (e.health <= 0) {
      e.alive = false;
      this.gold += e.reward;
      this.earned += e.reward;
      this.kills++;
      this.emit("death", { enemy: e });
    } else if (amount > 2) this.emit("hit", { enemy: e });
  }
  applyHit(p, e) {
    if (!e.alive) return;
    this.damage(
      e,
      p.stats.damage,
      p.type === "fire" || p.type === "frost" || p.type === "lightning",
    );
    if (!e.alive) return;
    if (p.type === "frost") {
      e.slow = Math.min(e.slow, p.stats.slow);
      e.slowLeft = p.stats.duration;
      if (p.freeze) e.frozen = p.stats.freeze;
    }
    if (p.type === "fire") {
      e.burn = Math.max(e.burn, p.stats.burn);
      e.burnLeft = p.stats.duration;
    }
  }
  impact(p) {
    if (!p.target.alive) return;
    const center = { x: p.target.x, y: p.target.y };
    const victims = p.stats.splash
      ? this.enemies.filter(
          (e) => e.alive && distance(e, center) <= p.stats.splash,
        )
      : [p.target];
    for (const e of victims) this.applyHit(p, e);
    this.emit("impact", {
      ...center,
      attack: p.type,
      radius: p.stats.splash || 16,
    });
  }
  attack(t, targets, stats) {
    t.shots++;
    if (t.type === "lightning") {
      const chain = [targets[0]];
      while (chain.length < stats.chains) {
        const last = chain.at(-1);
        const next = this.enemies
          .filter(
            (e) => e.alive && !chain.includes(e) && distance(e, last) < 115,
          )
          .sort((a, b) => distance(a, last) - distance(b, last))[0];
        if (!next) break;
        chain.push(next);
      }
      this.emit("bolt", {
        tower: t,
        points: chain.map((e) => ({ x: e.x, y: e.y })),
      });
      chain.forEach((e, i) =>
        this.damage(e, stats.damage * Math.pow(0.86, i), true),
      );
    } else {
      for (const target of targets.slice(0, stats.targets || 1)) {
        this.projectiles.push({
          id: ++this.id,
          towerId: t.id,
          type: t.type,
          x: t.x,
          y: t.y - 15,
          target,
          stats: { ...stats },
          freeze: stats.freeze && t.shots % 3 === 0,
          speed: t.type === "cannon" ? 280 : 410,
        });
      }
    }
    this.emit("attack", { tower: t, target: targets[0] });
  }
  // The same fixed-sized steps drive 1x, 2x, and accelerated test simulations.
  update(realDelta) {
    if (this.paused || this.ended) return;
    let remaining = realDelta * this.speed;
    while (remaining > 1e-8 && !this.ended) {
      const dt = Math.min(remaining, 0.025);
      this.step(dt);
      remaining -= dt;
    }
  }
  step(dt) {
    if (!this.active) return;
    this.waveTime += dt;
    while (this.queue.length && this.queue[0].at <= this.waveTime)
      this.spawn(this.queue.shift().type);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.burnLeft > 0) {
        const burnTime = Math.min(e.burnLeft, dt);
        e.burnLeft -= dt;
        this.damage(e, e.burn * burnTime, true);
        if (!e.alive) continue;
      }
      e.slowLeft = Math.max(0, e.slowLeft - dt);
      if (!e.slowLeft) e.slow = 1;
      const stopped = Math.min(dt, e.frozen);
      e.frozen = Math.max(0, e.frozen - dt);
      e.progress += e.speed * e.slow * (dt - stopped);
      Object.assign(e, onPath(e.progress));
      if (e.progress >= PATH_LENGTH) {
        e.alive = false;
        this.lives = Math.max(0, this.lives - e.lives);
        this.emit("escape", { enemy: e });
        if (!this.lives) {
          this.finish("defeat");
          break;
        }
      }
    }
    if (this.ended) return;
    for (const t of this.towers) {
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      const stats = TOWERS[t.type].levels[t.level - 1];
      const targets = this.enemies
        .filter((e) => e.alive && distance(e, t) <= stats.range)
        .sort((a, b) => b.progress - a.progress);
      if (targets.length) {
        this.attack(t, targets, stats);
        t.cooldown = stats.cooldown;
      }
    }
    this.projectiles = this.projectiles.filter((p) => {
      if (!p.target.alive) return false;
      const d = distance(p, p.target),
        move = p.speed * dt;
      if (d <= move) {
        this.impact(p);
        return false;
      }
      p.x += ((p.target.x - p.x) * move) / d;
      p.y += ((p.target.y - p.y) * move) / d;
      return true;
    });
    this.enemies = this.enemies.filter((e) => e.alive);
    if (!this.remaining) {
      this.active = false;
      this.projectiles = [];
      const bonus = 20 + this.wave * 3;
      this.gold += bonus;
      this.earned += bonus;
      this.emit("clear", { bonus });
      if (this.wave === 20) this.finish("victory");
    }
  }
  finish(result) {
    this.ended = result;
    this.active = false;
    this.queue = [];
    this.projectiles = [];
    this.emit("end", { result });
  }
}
