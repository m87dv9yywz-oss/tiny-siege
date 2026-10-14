import { HEROES } from "../data/heroes.js";
import { heroStart, moveHero, heroAttack, stepHero } from "./Hero.js";
import {
  TOWERS,
  towerStats,
  upgradeState,
  attackVisual,
} from "../data/towers.js";
import { ENEMIES } from "../data/enemies.js";
import { waveQueue, CAMPAIGNS } from "../data/waves.js";
import { campaignFor } from "../data/difficulties.js";
import { MAP, TRAILS, OBSTACLES } from "../data/map.js";
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export class Game {
  constructor(onEvent = () => {}, options = {}) {
    this.configure(options);
    this.onEvent = onEvent;
    this.reset();
  }
  configure({
    map = "classic",
    profile = null,
    difficulty = null,
    hero = null,
    relics = [],
  } = {}) {
    this.campaign = campaignFor(map, difficulty);
    this.heroType = hero;
    this.relics = relics;
    this.trail = TRAILS[this.campaign.id];
    this.profile = profile;
  }
  get totalWaves() {
    return this.campaign.waves.length;
  }
  available(type) {
    return (
      this.campaign.id === "classic" ||
      !this.profile ||
      this.profile.unlockedTowers.includes(type)
    );
  }
  pathAvailable(type, path, tier) {
    return (
      this.campaign.id === "classic" ||
      !this.profile ||
      this.profile.unlockedUpgrades[type][path] >= tier
    );
  }
  reset() {
    Object.assign(this, {
      participation: Object.fromEntries(
        Object.keys(TOWERS).map((k) => [
          k,
          { time: 0, damage: 0, armor: 0, control: 0, kills: 0 },
        ]),
      ),
      gold: 300,
      lives: 20,
      wave: 0,
      kills: 0,
      earned: 0,
      towers: [],
      enemies: [],
      projectiles: [],
      zones: [],
      queue: [],
      waveTime: 0,
      active: false,
      paused: false,
      speed: 1,
      ended: null,
      id: 0,
    });
    this.gold += this.relics.includes("purse") ? 25 : 0;
    this.lives += this.relics.includes("shield") ? 2 : 0;
    this.hero = heroStart(
      this,
      this.heroType,
      this.profile?.heroes?.xp[this.heroType] || 0,
    );
    this.emit("reset");
  }
  emit(type, payload = {}) {
    this.onEvent({ type, ...payload });
  }
  canPlace(type, x, y) {
    if (this.ended) return "The battle is over.";
    if (this.paused) return "Resume before placing a tower.";
    if (!Number.isFinite(x) || !Number.isFinite(y))
      return "Choose a spot inside the battlefield.";
    if (!Object.hasOwn(TOWERS,type)) return "Choose a tower first.";
    if (!this.available(type))
      return "Unlock this tower in your Kingdom first.";
    if (this.towers.length >= 80)
      return "This battlefield has room for 80 towers.";
    if (this.gold < TOWERS[type].cost) return "Not enough gold for this tower.";
    if (x < 30 || x > MAP.width - 30 || y < 60 || y > MAP.height - 30)
      return "Stay inside the battlefield.";
    if (this.trail.distanceToPath(x, y) < MAP.pathWidth / 2 + MAP.towerRadius)
      return "Keep the trail clear.";
    if (
      (OBSTACLES[this.campaign.id] || []).some(
        (o) => Math.hypot(o.x - x, o.y - y) < o.r + MAP.towerRadius,
      )
    )
      return "Keep cliffs and lava clear.";
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
      paths: [0, 0, 0],
      targeting: "FIRST",
      invested: TOWERS[type].cost,
      cooldown: 0.1,
      shots: 0,
    };
    this.gold -= tower.invested;
    this.towers.push(tower);
    this.emit("build", { tower });
    return tower;
  }
  upgrade(id, path = 0) {
    const t = this.towers.find((t) => t.id === id);
    if (
      !t ||
      this.ended ||
      this.paused ||
      !Number.isInteger(path) ||
      path < 0 ||
      path > 2
    )
      return false;
    const state = upgradeState(t, path);
    const message =
      state.locked ||
      (!this.pathAvailable(t.type, path, t.paths[path] + 1)
        ? "Unlock this path with tower XP in your Kingdom."
        : null) ||
      (this.gold < state.cost ? "Save a little more gold to upgrade." : null);
    if (message) {
      this.emit("invalid", { message });
      return false;
    }
    this.gold -= state.cost;
    t.invested += state.cost;
    t.paths[path]++;
    t.level = Math.min(3, 1 + Math.max(...t.paths));
    this.emit("upgrade", { tower: t });
    return true;
  }
  setTargeting(id, priority) {
    const t = this.towers.find((t) => t.id === id);
    if (
      !t ||
      this.ended ||
      ![
        "FIRST",
        "LAST",
        "STRONG",
        "WEAK",
        ...(towerStats(t).supportTarget ? ["SUPPORT"] : []),
      ].includes(priority)
    )
      return false;
    t.targeting = priority;
    this.emit("targeting", { tower: t });
    return true;
  }
  moveHero(x, y) {
    return moveHero(this, x, y);
  }
  heroAbility() {
    return heroAttack(this, true);
  }
  baseStats(t) {
    this.statCache ||= new WeakMap();
    const key = t.paths.join("|"),
      cached = this.statCache.get(t);
    if (cached?.key === key) return cached.stats;
    const stats = towerStats(t);
    this.statCache.set(t, { key, stats });
    return stats;
  }
  effectiveStats(t) {
    const stats = { ...this.baseStats(t) };
    let damage = 0,
      rate = 0,
      armor = 0;
    for (const source of this.towers) {
      if (source === t || source.type !== "rune") continue;
      const buff = this.baseStats(source);
      if (buff.buffRange && distance(t, source) <= buff.buffRange) {
        damage = Math.max(damage, buff.buffDamage || 0);
        rate = Math.max(rate, buff.buffRate || 0);
        armor = Math.max(armor, buff.buffArmor || 0);
      }
    }
    if (
      this.hero &&
      distance(t, this.hero) <=
        HEROES[this.hero.type].buffRange *
          (this.relics.includes("banner") ? 1.2 : 1)
    ) {
      if (this.hero.type === "dragon" && t.type === "fire") {
        damage += 0.15;
        stats.burn = (stats.burn || 0) * 1.15;
      }
      if (this.hero.type === "dinosaur" && t.type === "cannon") armor += 0.25;
      if (this.hero.type === "tiger" && t.type === "archer")
        rate = Math.min(0.32, rate + 0.12);
    }
    if (this.relics.includes("lens")) stats.range *= 1.05;
    stats.damage *= 1 + damage;
    stats.cooldown *= 1 - rate;
    stats.armorDamage = (stats.armorDamage || 0) * (1 + armor);
    return stats;
  }
  targets(t, stats = towerStats(t)) {
    const relevant = (e) => e.health + e.armor + (e.shield || 0);
    const compare = {
      FIRST: (a, b) => b.progress - a.progress,
      LAST: (a, b) => a.progress - b.progress,
      STRONG: (a, b) => relevant(b) - relevant(a),
      WEAK: (a, b) => relevant(a) - relevant(b),
      SUPPORT: (a, b) =>
        Number(["healer", "warden"].includes(b.type)) -
          Number(["healer", "warden"].includes(a.type)) ||
        b.progress - a.progress,
    };
    return this.enemies
      .filter((e) => e.alive && distance(e, t) <= stats.range)
      .sort((a, b) => compare[t.targeting || "FIRST"](a, b) || a.id - b.id);
  }
  sell(id) {
    const t = this.towers.find((t) => t.id === id);
    if (!t || this.ended || this.paused) return false;
    const value = Math.floor(t.invested * 0.7);
    this.gold += value;
    this.towers = this.towers.filter((a) => a !== t);
    this.projectiles = this.projectiles.filter((p) => p.towerId !== id);
    this.zones = this.zones.filter((z) => z.towerId !== id);
    this.emit("sell", { tower: t, value });
    return true;
  }
  startWave() {
    if (
      this.active ||
      this.ended ||
      this.paused ||
      this.wave >= this.totalWaves
    )
      return false;
    this.wave++;
    this.queue = waveQueue(this.wave, this.campaign.waves);
    this.waveTime = 0;
    this.active = true;
    this.emit("wave");
    return true;
  }
  get remaining() {
    return this.queue.length + this.enemies.filter((e) => e.alive).length;
  }
  spawn(type, traits = {}) {
    const config = ENEMIES[type],
      scale = config.boss
        ? 1
        : this.campaign.mode
          ? this.wave <= 3
            ? 1
            : this.campaign.difficulty.health *
              (1 +
                (this.wave - 1) *
                  (this.campaign.mode === "hard" ? 0.04 : 0.028) +
                (this.campaign.mode === "hard"
                  ? Math.max(0, this.wave - 20) * 0.14
                  : 0))
          : 1 + Math.max(0, this.wave - 1) * 0.055;
    const e = {
      id: ++this.id,
      type,
      ...config,
      health: config.health * scale,
      armor: config.armor * scale,
      maxArmor: config.armor * scale,
      shield: (config.shield || 0) * (this.campaign.mode ? scale : 1),
      maxShield: (config.shield || 0) * (this.campaign.mode ? scale : 1),
      abilityTime: config.abilityPeriod || 1,
      phase: 1,
      summons: 0,
      freezeImmunity: 0,
      pushCooldown: 0,
      brittle: 1,
      brittleLeft: 0,
      shatter: 0,
      shatterRadius: 0,
      melt: 0,
      spread: 0,
      spreadTime: 1,
      maxHealth: config.health * scale,
      reward: Math.round(
        config.reward * (1 + Math.max(0, this.wave - 1) * 0.01),
      ),
      progress: 0,
      alive: true,
      burn: 0,
      burnLeft: 0,
      slow: 1,
      slowLeft: 0,
      frozen: 0,
      ...this.trail.onPath(0),
    };
    if (this.campaign.mode && e.heal) e.heal *= Math.sqrt(scale);
    if (traits.bossHealth && config.boss) {
      e.health = traits.bossHealth;
      e.maxHealth = traits.bossHealth;
    }
    if (traits.elite) {
      e.elite = true;
      e.name = "Ironbound Captain";
      e.health *= 3;
      e.maxHealth *= 3;
      e.armor *= 2;
      e.maxArmor *= 2;
      e.reward *= 2;
      e.lives = 4;
      e.radius += 5;
    }
    this.enemies.push(e);
    this.emit("spawn", { enemy: e });
    return e;
  }
  // A damage packet describes health damage, armor damage and penetration.
  // Wardens absorb their own damage in shields; nearby allies receive protection.
  damage(e, amount, packet = {}) {
    if (!e?.alive || this.ended || !Number.isFinite(amount) || amount < 0)
      return;
    if (typeof packet === "boolean")
      packet = {
        damageType: packet ? "magic" : "physical",
        bypass: packet ? 1 : 0,
      };
    const beforeHealth = e.health,
      beforeArmor = e.armor;
    const magic = packet.damageType === "magic";
    let healthDamage = amount * (magic ? 1 - (e.magicResistance || 0) : 1);
    if (
      this.enemies.some(
        (w) =>
          w !== e &&
          w.alive &&
          w.protection &&
          w.shield > 0 &&
          distance(w, e) <= w.abilityRange,
      )
    )
      healthDamage *= 0.7;
    if (e.shield > 0) {
      const absorbed = Math.min(e.shield, healthDamage);
      e.shield -= absorbed;
      healthDamage -= absorbed;
      if (!e.shield) this.emit("shieldBreak", { enemy: e });
    }
    const wasArmored = e.armor > 0;
    if (wasArmored) {
      const armorDamage =
        (packet.armorDamage || 0) * (e.brittleLeft > 0 ? e.brittle : 1);
      this.breakArmor(e, armorDamage);
      const penetration = packet.penetration || packet.bypass || 0;
      healthDamage *= penetration;
      if (!penetration && !armorDamage) this.emit("ricochet", { enemy: e });
    }
    let shatterBurst = null;
    // Brittle marks are consumed at most once per impact, never by DoT ticks.
    if (
      !magic &&
      e.shatter > 0 &&
      e.slowLeft > 0 &&
      !packet.tick &&
      (packet.shatterDepth || 0) < 3
    ) {
      const bonus = e.shatter,
        radius = e.shatterRadius;
      e.shatter = 0;
      healthDamage += bonus;
      this.emit("shatter", { enemy: e, radius: radius || 25 });
      if (radius) shatterBurst = { radius, bonus };
    }
    e.health -= healthDamage;
    if (packet.source && this.participation[packet.source]) {
      const metrics = this.participation[packet.source];
      metrics.damage += Math.max(0, Math.min(beforeHealth, healthDamage));
      metrics.armor += Math.max(0, beforeArmor - e.armor);
      if (e.health <= 0) metrics.kills++;
    }
    if (e.health <= 0) {
      e.alive = false;
      this.gold += e.reward;
      this.earned += e.reward;
      this.kills++;
      this.emit("death", { enemy: e });
      if (e.split)
        for (let i = 0; i < e.split; i++) {
          const child = this.spawn("sprout");
          child.progress = Math.max(0, e.progress - i * 10);
          child.speed *= 1.25;
          child.reward = 3;
          child.split = 0;
          Object.assign(child, this.trail.onPath(child.progress));
        }
    } else if (healthDamage > 2) this.emit("hit", { enemy: e });
    if (e.alive && e.boss) this.bossPhase(e);
    // Resolve the original victim first: recursive shatters must never award
    // the same death twice or damage a corpse while unwinding a chain.
    if (shatterBurst)
      for (const other of this.enemies.filter(
        (a) => a !== e && a.alive && distance(a, e) <= shatterBurst.radius,
      ))
        this.damage(other, shatterBurst.bonus * 0.65, {
          damageType: "physical",
          penetration: 1,
          shatterDepth: (packet.shatterDepth || 0) + 1,
        });
  }
  breakArmor(e, amount) {
    if (e.armor <= 0 || amount <= 0) return;
    e.armor = Math.max(0, e.armor - amount);
    if (!e.armor) this.emit("armorBreak", { enemy: e });
  }
  bossPhase(e) {
    const phase =
      e.health <= e.maxHealth * 0.3
        ? 3
        : e.health <= e.maxHealth * 0.66
          ? 2
          : 1;
    if (phase <= e.phase) return;
    e.phase = phase;
    if (phase === 2) {
      e.armor = this.campaign.mode
        ? Math.max(850, Math.round(e.maxHealth * 0.08))
        : 850;
      e.maxArmor = e.armor;
    }
    if (phase === 3) {
      e.speed = 41;
      e.abilityPeriod = 5;
    }
    this.emit("phase", { enemy: e, radius: 110 });
  }
  chill(e, slow, duration, freeze = 0) {
    const resist = e.controlResistance || 0;
    e.slow = Math.min(e.slow, slow + (1 - slow) * resist);
    e.slowLeft = Math.max(e.slowLeft, duration);
    if (freeze && e.freezeImmunity <= 0) {
      e.frozen = Math.max(e.frozen, freeze * (1 - resist));
      e.freezeImmunity = e.boss ? 4 : freeze + 0.6;
    }
  }
  applyHit(p, e) {
    if (!e.alive) return;
    this.damage(e, p.stats.damage, p.stats);
    if (!e.alive) return;
    if (p.type === "frost" || p.stats.slow) {
      this.chill(
        e,
        p.stats.slow || 0.75,
        p.stats.duration,
        p.freeze ? p.stats.freeze : 0,
      );
      if (p.stats.brittle) {
        e.brittle = p.stats.brittle;
        e.brittleLeft = p.stats.duration;
      }
      if (p.stats.shatter) {
        e.shatter = Math.max(e.shatter, p.stats.shatter);
        e.shatterRadius = p.stats.shatterRadius || 0;
      }
    }
    if (p.stats.knockback && e.pushCooldown <= 0) {
      e.progress = Math.max(
        0,
        e.progress - p.stats.knockback * (1 - (e.controlResistance || 0)),
      );
      Object.assign(e, this.trail.onPath(e.progress));
      e.pushCooldown = e.boss ? 3 : 1.2;
    }
    if (p.type === "fire") {
      // Strongest burn wins. Repeated hits refresh rather than infinitely stack.
      if (p.stats.burn >= e.burn) e.burnSource = p.type;
      e.burn = Math.max(e.burn, p.stats.burn);
      e.burnLeft = Math.max(e.burnLeft, p.stats.duration);
      e.melt = Math.max(e.melt, p.stats.melt || 0);
      e.spread = Math.max(e.spread, p.stats.spread || 0);
    }
  }
  area(center, radius, amount, stats, type) {
    for (const e of this.enemies.filter(
      (e) => e.alive && distance(e, center) <= radius,
    ))
      this.damage(e, amount, stats);
    this.emit("impact", { ...center, attack: type, radius });
  }
  impact(p) {
    if (!p.target.alive) return;
    const center = { x: p.target.x, y: p.target.y };
    let victims = p.stats.splash
      ? this.enemies.filter(
          (e) => e.alive && distance(e, center) <= p.stats.splash,
        )
      : [p.target];
    const blastVictims = p.stats.splash ? victims : [];
    if (p.stats.pierce) {
      const dx = center.x - p.origin.x,
        dy = center.y - p.origin.y,
        len = Math.hypot(dx, dy) || 1;
      victims = this.enemies
        .filter((e) => {
          const along =
            ((e.x - p.origin.x) * dx + (e.y - p.origin.y) * dy) / len;
          const across =
            Math.abs((e.x - p.origin.x) * dy - (e.y - p.origin.y) * dx) / len;
          return e.alive && along >= 0 && along < len + 180 && across < 24;
        })
        .sort((a, b) => distance(a, p.origin) - distance(b, p.origin))
        .slice(0, p.stats.pierce);
      // A legal Seed crosspath keeps its small impact blast alongside thorns.
      // Each enemy receives one hit even when it lies inside both areas.
      victims = [...new Set([...victims, ...blastVictims])];
    }
    for (const e of victims) this.applyHit(p, e);
    if (p.stats.trap && this.zones.length < 32)
      this.zones.push({
        x: center.x,
        y: center.y,
        radius: p.stats.trap,
        left: p.stats.trapDuration,
        damage: p.stats.trapDamage,
        trap: true,
        armDelay: 0.3,
        towerId: p.towerId,
        source: p.type,
        armor: p.stats.armorDamage || 0,
      });
    this.emit("impact", {
      ...center,
      attack: p.type,
      radius: p.stats.splash || 16,
    });
    if (p.stats.bounces && !p.bounced) {
      // One bounded chain per shot, with distinct victims; no recursive impact.
      const visited = new Set(victims);
      let previous = p.target;
      for (let i = 1; i < p.stats.bounces; i++) {
        const next = this.enemies
          .filter(
            (e) =>
              e.alive &&
              !visited.has(e) &&
              distance(e, previous) <= p.stats.bounceRange,
          )
          .sort(
            (a, b) =>
              distance(a, previous) - distance(b, previous) || a.id - b.id,
          )[0];
        if (!next) break;
        this.emit("seedBounce", {
          from: { x: previous.x, y: previous.y },
          to: { x: next.x, y: next.y },
        });
        visited.add(next);
        this.applyHit(
          {
            ...p,
            stats: { ...p.stats, damage: p.stats.damage * Math.pow(0.8, i) },
          },
          next,
        );
        previous = next;
      }
    }
    if (p.stats.clusters)
      for (let i = 0; i < p.stats.clusters; i++) {
        const a = (i * Math.PI * 2) / p.stats.clusters;
        this.area(
          { x: center.x + Math.cos(a) * 42, y: center.y + Math.sin(a) * 42 },
          32,
          p.stats.clusterDamage,
          { ...p.stats, armorDamage: p.stats.armorDamage * 0.25 },
          p.type,
        );
      }
    if (p.stats.pool) {
      this.zones.push({
        ...center,
        towerId: p.towerId,
        radius: p.stats.pool,
        left: p.stats.poolDuration || 3,
        damage: p.stats.poolDamage,
        melt: p.stats.melt || 0,
        type: p.type,
        source: p.type,
        slow: p.stats.rootSlow || p.stats.slow || 0,
      });
      if (this.zones.length > 32) this.zones.shift();
    }
  }
  attack(t, targets, stats) {
    t.shots++;
    const hitStats = { ...stats, source: t.type };
    if (stats.critical && t.shots % stats.critEvery === 0)
      hitStats.damage *= stats.critical;
    if (stats.beam) {
      t.heat =
        t.focusId === targets[0].id
          ? Math.min(stats.focusMax, (t.heat || 1) + stats.focusRamp)
          : 1;
      t.focusId = targets[0].id;
      hitStats.damage *= t.heat;
      hitStats.burn *= t.heat;
      this.applyHit({ type: t.type, stats: hitStats }, targets[0]);
      this.emit("jet", { tower: t, target: targets[0], heat: t.heat });
    } else if (t.type === "lightning") {
      const chain = [targets[0]];
      while (chain.length < stats.chains) {
        const last = chain.at(-1);
        const next = this.enemies
          .filter(
            (e) =>
              e.alive &&
              !chain.includes(e) &&
              distance(e, last) < (stats.chainRange || 115),
          )
          .sort(
            (a, b) => distance(a, last) - distance(b, last) || a.id - b.id,
          )[0];
        if (!next) break;
        chain.push(next);
      }
      this.emit("bolt", {
        tower: t,
        points: chain.map((e) => ({ x: e.x, y: e.y })),
        heavy: stats.shock,
      });
      chain.forEach((e, i) =>
        this.damage(e, hitStats.damage * Math.pow(0.88, i), hitStats),
      );
      if (stats.shock)
        this.area(targets[0], stats.shock, stats.damage * 0.15, stats, t.type);
    } else
      for (const target of targets.slice(0, stats.targets || 1))
        this.projectiles.push({
          id: ++this.id,
          towerId: t.id,
          type: t.type,
          x: t.x,
          y: t.y - 15,
          origin: { x: t.x, y: t.y },
          target,
          stats: hitStats,
          visual: attackVisual(t),
          freeze: stats.freeze && t.shots % 3 === 0,
          speed: stats.arc
            ? 210
            : t.type === "cannon"
              ? 280
              : stats.pierce
                ? 650
                : 410,
        });
    if (stats.rain && t.shots % 6 === 0) {
      this.area(targets[0], stats.rain, stats.damage * 2, stats, t.type);
      this.emit("rain", {
        x: targets[0].x,
        y: targets[0].y,
        radius: stats.rain,
      });
    }
    if (stats.flare && t.shots % 5 === 0)
      this.area(targets[0], stats.flare, stats.damage, stats, t.type);
    if (stats.pulse && t.shots % (stats.pulseEvery || 5) === 0) {
      for (const e of this.enemies.filter(
        (e) => e.alive && distance(e, t) <= stats.pulse,
      )) {
        this.damage(e, stats.damage, stats);
        if (t.type === "frost" || stats.slow)
          this.chill(e, stats.slow, stats.duration, stats.freeze || 0.4);
      }
      this.emit("impact", {
        x: t.x,
        y: t.y,
        attack: t.type,
        radius: stats.pulse,
      });
      if (stats.storm) {
        const stormTargets = this.targets(t, stats).slice(0, stats.storm);
        stormTargets.forEach((e) => this.damage(e, stats.damage * 1.5, stats));
        this.emit("bolt", {
          tower: t,
          points: stormTargets.map((e) => ({ x: e.x, y: e.y })),
        });
      }
    }
    this.emit("attack", { tower: t, target: targets[0] });
  }
  abilities(e, dt) {
    e.abilityTime -= dt;
    if (e.abilityTime > 0) return;
    e.abilityTime = e.abilityPeriod || 1;
    if (e.heal) {
      for (const ally of this.enemies)
        if (ally.alive && ally !== e && distance(ally, e) <= e.abilityRange)
          ally.health = Math.min(ally.maxHealth, ally.health + e.heal);
      this.emit("heal", { enemy: e, radius: e.abilityRange });
    }
    if (
      e.boss &&
      e.summons < 12 &&
      this.enemies.filter((a) => a.alive).length < 100
    ) {
      e.summons++;
      for (const type of [
        e.phase === 3 ? "warden" : "armored",
        "runner",
        "sprout",
      ]) {
        const ally = this.spawn(type);
        ally.progress = Math.max(0, e.progress - 30);
        Object.assign(ally, this.trail.onPath(ally.progress));
        // Finite summons grant small bounties; the boss cannot farm a stalled wave.
        ally.reward = Math.min(ally.reward, 6);
      }
    }
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
    stepHero(this, dt);
    if (!this.active) return;
    this.waveTime += dt;
    while (this.queue.length && this.queue[0].at <= this.waveTime) {
      const entry = this.queue.shift();
      this.spawn(entry.type, entry);
    }
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.burnLeft > 0) {
        const burnTime = Math.min(e.burnLeft, dt);
        e.burnLeft -= dt;
        this.damage(e, e.burn * burnTime, {
          damageType: "magic",
          bypass: 0.65,
          source: e.burnSource,
          tick: true,
        });
        this.breakArmor(e, e.melt * burnTime);
        e.spreadTime -= dt;
        if (e.spread && e.spreadTime <= 0) {
          e.spreadTime = 1;
          for (const other of this.enemies
            .filter((a) => a !== e && a.alive && distance(a, e) <= e.spread)
            .slice(0, 2)) {
            if (e.burn * 0.6 >= other.burn) other.burnSource = e.burnSource;
            other.burn = Math.max(other.burn, e.burn * 0.6);
            other.burnLeft = Math.max(other.burnLeft, 2);
          }
        }
        if (!e.alive) continue;
        if (e.burnLeft <= 0) {
          e.burn = 0;
          e.melt = 0;
          e.spread = 0;
        }
      }
      this.abilities(e, dt);
      e.pushCooldown = Math.max(0, e.pushCooldown - dt);
      e.freezeImmunity = Math.max(0, e.freezeImmunity - dt);
      e.brittleLeft = Math.max(0, e.brittleLeft - dt);
      e.slowLeft = Math.max(0, e.slowLeft - dt);
      if (!e.slowLeft) e.slow = 1;
      const stopped = Math.min(dt, e.frozen);
      e.frozen = Math.max(0, e.frozen - dt);
      e.progress += e.speed * e.slow * (dt - stopped);
      Object.assign(e, this.trail.onPath(e.progress));
      if (e.progress >= this.trail.PATH_LENGTH) {
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
    this.zones = this.zones.filter((z) => {
      z.left -= dt;
      if (z.trap) {
        z.armDelay -= dt;
        if (
          z.armDelay <= 0 &&
          this.enemies.some((e) => e.alive && distance(e, z) <= z.radius)
        ) {
          this.area(
            z,
            z.radius,
            z.damage,
            {
              damageType: "physical",
              penetration: 1,
              armorDamage: z.armor,
              source: z.source,
            },
            z.source,
          );
          z.left = 0;
        }
        return z.left > 0;
      }
      for (const e of this.enemies.filter(
        (e) => e.alive && distance(e, z) <= z.radius,
      )) {
        this.damage(e, z.damage * dt, {
          damageType: "magic",
          bypass: 0.65,
          tick: true,
          source: z.source || "fire",
        });
        if (z.slow) this.chill(e, z.slow, 0.15);
        this.breakArmor(e, z.melt * dt);
      }
      return z.left > 0;
    });
    for (const t of this.towers) {
      const aura = this.baseStats(t);
      if (aura.aura)
        for (const e of this.enemies.filter(
          (e) => e.alive && distance(e, t) <= aura.aura,
        ))
          this.chill(e, aura.auraSlow, 0.1);
      this.participation[t.type].time += dt;
      if (["frost", "grove", "wind", "rune"].includes(t.type))
        this.participation[t.type].control +=
          this.enemies.filter(
            (e) => e.alive && distance(e, t) <= aura.range && e.slow < 1,
          ).length * dt;
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      const stats = this.effectiveStats(t);
      const targets = this.targets(t, stats);
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
      this.zones = [];
      const bonus = 20 + this.wave * 3;
      this.gold += bonus;
      this.earned += bonus;
      this.emit("clear", { bonus });
      if (this.wave === this.totalWaves) this.finish("victory");
    }
  }
  finish(result) {
    this.ended = result;
    this.active = false;
    this.queue = [];
    this.projectiles = [];
    this.zones = [];
    this.emit("end", { result });
  }
}
