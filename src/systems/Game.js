import { HEROES } from "../data/heroes.js";
import { heroStage } from "../heroArtwork.js";
import { heroStart, moveHero, heroAttack, stepHero } from "./Hero.js";
import {
  TOWERS,
  towerStats,
  upgradeState,
  attackVisual,
  isAscended,
  towerVisualMuzzle,
  ASCENSIONS,
} from "../data/towers.js";
import { ENEMIES } from "../data/enemies.js";
import { waveQueue, CAMPAIGNS } from "../data/waves.js";
import { campaignFor } from "../data/difficulties.js";
import { MAP, TRAILS, TRAIL_SETS, OBSTACLES, inPond } from "../data/map.js";
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
    this.trails = TRAIL_SETS[this.campaign.id] || [TRAILS[this.campaign.id]];
    this.trail = this.trails[0];
    this.profile = profile;
  }
  get totalWaves() {
    return this.campaign.waves.length;
  }
  available(type) {
    return (
      this.campaign.id === "classic" ||
      this.campaign.mode === "freeplay" ||
      !this.profile ||
      this.profile.unlockedTowers.includes(type)
    );
  }
  pathAvailable(type, path, tier) {
    return (
      this.campaign.id === "classic" ||
      this.campaign.mode === "freeplay" ||
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
      // Sim time left in the update() currently running (set by
      // update itself; 0 outside it). A projectile spawned mid-update
      // pins its rendered position at the muzzle for this span.
      frameRemainder: 0,
      skippedWaves: 0,
      trailCursor: 0,
      goldenSpawned: false,
      autoWave: false,
      autoTimer: 0,
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
    // Water rules: the Tidecaller sails only on pond/lake water, and land
    // towers may not stand in it. Everywhere else the usual rules apply.
    if (TOWERS[type].waterOnly) {
      if (!inPond(this.campaign.id, x, y, 8))
        return "The Tidecaller needs open water — place it in a pond or lake.";
    } else if (inPond(this.campaign.id, x, y))
      return "Only the Tidecaller can sail there.";
    if (
      Math.min(...this.trails.map((t) => t.distanceToPath(x, y))) <
      MAP.pathWidth / 2 + MAP.towerRadius
    )
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
  // Ascension partners for a Tier-3 tower: one same-type Tier-3 evolved
  // on each OTHER path, and no Ascended tower of this type yet.
  ascensionPartners(t) {
    if (
      this.campaign.mode !== "freeplay" ||
      !t ||
      isAscended(t) ||
      !t.paths.some((n) => n === 3) ||
      this.towers.some((o) => o.type === t.type && isAscended(o))
    )
      return null;
    const partners = [];
    for (let q = 0; q < 3; q++) {
      if (t.paths[q] === 3) continue;
      const partner = this.towers.find(
        (o) => o.id !== t.id && o.type === t.type && o.paths[q] === 3,
      );
      if (!partner) return null;
      partners.push(partner);
    }
    return partners;
  }
  canAscend(t) {
    return !!this.ascensionPartners(t);
  }
  ascend(id) {
    const t = this.towers.find((t) => t.id === id);
    const partners = t && this.ascensionPartners(t);
    if (!t || !partners || this.ended || this.paused) return false;
    // The three evolutions are consumed; the Ascended tower's book value
    // is the ordinary [3,3,3] investment so every save validator agrees.
    const def = TOWERS[t.type];
    const consumed = partners.map((p) => ({ ...p }));
    this.towers = this.towers.filter((o) => !partners.includes(o));
    this.projectiles = this.projectiles.filter(
      (p) => !partners.some((o) => o.id === p.towerId),
    );
    this.zones = this.zones.filter(
      (z) => !partners.some((o) => o.id === z.towerId),
    );
    t.paths = [3, 3, 3];
    t.level = 3;
    t.invested =
      def.cost +
      def.prices.reduce((a, c) => a + c, 0) * 3;
    t.cooldown = Math.min(t.cooldown, 0.2);
    t.novaLeft = 2;
    this.emit("ascend", { tower: t, consumed });
    return true;
  }
  // Ascension novas: each Ascended tower periodically unleashes its
  // signature effect. Damage scales from its merged damage stat so the
  // novas stay relevant as Free Play health compounds.
  nova(t, stats) {
    const foes = this.enemies.filter((e) => e.alive && !e.burrowed);
    if (!foes.length) return;
    const leaders = [...foes].sort((a, b) => b.progress - a.progress);
    const hit = (e, mult, opts = {}) =>
      this.damage(e, stats.damage * mult, {
        damageType: stats.damageType || "magic",
        armorDamage: (stats.armorDamage || 0) * mult,
        bypass: 0.5,
        area: true,
        source: t.type,
        ...opts,
      });
    const push = (e, amount) => {
      if (e.pushCooldown > 0 || e.stationary) return;
      e.progress = Math.max(
        0,
        e.progress - amount * (1 - (e.controlResistance || 0)),
      );
      e.pushCooldown = e.boss ? 3 : 1.2;
    };
    switch (t.type) {
      case "archer":
        for (const e of leaders.slice(0, 10)) hit(e, 7);
        break;
      case "cannon": {
        const target = leaders[0];
        this.area(target, 130, stats.damage * 8, { ...stats, area: true }, t.type);
        break;
      }
      case "frost":
        for (const e of foes) this.chill(e, 0.35, 1.6, 1.4);
        break;
      case "fire":
        for (const e of leaders.slice(0, 12)) {
          hit(e, 4);
          e.burn = Math.max(e.burn, stats.damage * 0.9);
          e.burnLeft = Math.max(e.burnLeft, 3);
          e.burnSource = t.type;
        }
        break;
      case "lightning": {
        const struck = new Set();
        for (let i = 0; i < 8; i++) {
          const e = leaders[Math.floor((i * leaders.length) / 8)];
          if (!e || struck.has(e.id)) continue;
          struck.add(e.id);
          hit(e, 7);
        }
        break;
      }
      case "grove": {
        let rooted = 0;
        for (const e of leaders.slice(0, 10)) {
          if (e.boss) continue;
          this.chill(e, 0.05, 2.2);
          rooted++;
        }
        if (rooted) {
          this.gold += rooted * 12;
          this.earned += rooted * 12;
        }
        break;
      }
      case "wind":
        for (const e of foes) push(e, 130);
        break;
      case "rune": {
        for (let i = 0; i < 6 && this.zones.length < 32; i++) {
          const a = (i * Math.PI * 2) / 6;
          this.zones.push({
            x: t.x + Math.cos(a) * 95,
            y: t.y + Math.sin(a) * 95,
            radius: 62,
            left: 9,
            damage: stats.damage * 2.2,
            trap: true,
            armDelay: 0.3,
            towerId: t.id,
            source: t.type,
            armor: (stats.armorDamage || 0) * 2,
          });
        }
        break;
      }
      case "tidecaller":
        for (const e of leaders.slice(0, 14)) {
          push(e, 85);
          hit(e, 2.5);
        }
        break;
    }
    this.emit("nova", { tower: t });
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
      // Teen and Adult heroes (level 4+) project a stronger aura.
      const grown = heroStage(this.hero.level) !== "baby";
      if (this.hero.type === "dragon" && t.type === "fire") {
        damage += grown ? 0.2 : 0.15;
        stats.burn = (stats.burn || 0) * 1.15;
      }
      if (this.hero.type === "dinosaur" && t.type === "cannon")
        armor += grown ? 0.3 : 0.25;
      if (this.hero.type === "tiger" && t.type === "archer")
        rate = Math.min(0.32, rate + (grown ? 0.16 : 0.12));
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
      .filter(
        (e) => e.alive && !e.burrowed && distance(e, t) <= stats.range,
      )
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
    // The Golden Sproutling: a rare bonus runner, at most once per run,
    // never in the first ten waves and never on a boss or final wave.
    // Pure upside — popping it pays 250 gold, escaping costs no life.
    if (
      !this.goldenSpawned &&
      this.wave >= 10 &&
      this.wave < this.totalWaves &&
      this.wave % 20 !== 0 &&
      Math.random() < 0.05
    ) {
      this.goldenSpawned = true;
      this.queue.push({
        type: "sprout",
        at: 2 + Math.random() * 8,
        golden: true,
      });
      this.queue.sort((a, b) => a.at - b.at);
    }
    this.waveTime = 0;
    this.active = true;
    this.emit("wave");
    return true;
  }
  get remaining() {
    return this.queue.length + this.enemies.filter((e) => e.alive).length;
  }
  // Adventure runs advance in 20-wave stages (waves 1-20 = stage 0,
  // 21-40 = stage 1, ...). Each new stage the enemies grow a little:
  // +15% health, +3% speed (capped +12%), +7% display size (capped +28%),
  // plus a warmer tint in the renderer. Bosses keep their own scaling.
  get stage() {
    return this.campaign.mode
      ? Math.floor(Math.max(0, this.wave - 1) / 20)
      : 0;
  }
  spawn(type, traits = {}) {
    const config = ENEMIES[type],
      stage = this.stage,
      scale =
        (config.boss
          ? 1
          : this.campaign.mode
            ? this.wave <= 3
              ? 1
              : this.campaign.difficulty.health *
                (1 +
                  (this.wave - 1) *
                    (this.campaign.mode === "hard" ||
                    this.campaign.mode === "freeplay"
                      ? 0.04
                      : 0.028) +
                  (this.campaign.mode === "hard" ||
                  this.campaign.mode === "freeplay"
                    ? Math.max(0, this.wave - 20) * 0.14
                    : 0))
            : 1 + Math.max(0, this.wave - 1) * 0.055) *
        (this.campaign.mode && !config.boss ? 1 + stage * 0.15 : 1) *
        // Free Play's endgame: past wave 100 health compounds ~3.4%
        // per wave (stiffened 2026-10-18 — a real player's optimized
        // board walked through the original 2.8%), so the board and
        // its Ascensions decide the run (see FREEPLAY in difficulties).
        (this.campaign.mode === "freeplay" && this.wave > 100
          ? Math.pow(1.034, this.wave - 100)
          : 1);
    // Each enemy walks one trail. Queue spawns are dealt round-robin across
    // the map's trails by step(); children/summons inherit their parent's.
    const trail = traits.trail || this.trails[0];
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
      trail,
      burrowTimer: config.burrowPeriod
        ? (config.burrowGrace ?? 1) + config.burrowPeriod
        : 0,
      burrowLeft: 0,
      burrowed: false,
      hatchLeft: config.hatchTime || 0,
      slipX: 0,
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
        config.reward *
          (1 + Math.max(0, this.wave - 1) * 0.01) *
          // Free Play income decay (owner balance pass, 2026-10-18):
          // kill gold holds through wave 50, then shrinks toward a 25%
          // floor at wave 150 so late gold stays a real decision.
          (this.campaign.mode === "freeplay"
            ? this.wave <= 50
              ? 1
              : Math.max(0.25, 1 - (this.wave - 50) * 0.0075)
            : 1),
      ),
      progress: 0,
      alive: true,
      burn: 0,
      burnLeft: 0,
      slow: 1,
      slowLeft: 0,
      frozen: 0,
      ...trail.onPath(0),
    };
    if (this.campaign.mode && e.heal) e.heal *= Math.sqrt(scale);
    e.stage = stage;
    e.displayScale = config.boss
      ? 1
      : 1 + Math.min(stage * 0.07, 0.28);
    if (!config.boss)
      e.speed = config.speed * (1 + Math.min(stage * 0.03, 0.12));
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
    if (traits.golden) {
      e.golden = true;
      e.name = "Golden Sproutling";
      e.reward = 250;
      e.lives = 0;
      e.health *= 3;
      e.maxHealth *= 3;
      e.speed = Math.max(e.speed, 115);
      e.displayScale = (e.displayScale || 1) * 1.15;
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
    // Burrowed enemies are underground: nothing new can hit them. Damage
    // already burning keeps ticking — it arrives as tick packets.
    if (e.burrowed && !packet.tick) return;
    // Shade Slip (Shadowhart): direct hits can be dodged; ticks and area
    // damage cannot, and the dodge switches off while slowed or burning.
    if (
      e.dodge &&
      !packet.tick &&
      !packet.area &&
      e.slowLeft <= 0 &&
      e.burnLeft <= 0 &&
      Math.random() < e.dodge
    ) {
      e.slipX = Math.random() * 12 - 6;
      this.emit("dodge", { enemy: e });
      return;
    }
    const beforeHealth = e.health,
      beforeArmor = e.armor;
    const magic = packet.damageType === "magic";
    let healthDamage = amount * (magic ? 1 - (e.magicResistance || 0) : 1);
    if (
      this.enemies.some(
        (w) =>
          w !== e &&
          w.alive &&
          !w.burrowed &&
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
      if (e.golden) this.emit("goldenPop", { enemy: e });
      if (e.split)
        for (let i = 0; i < e.split; i++) {
          const child = this.spawn(e.splitType || "sprout", {
            trail: e.trail,
          });
          child.progress = Math.max(0, e.progress - i * 10);
          child.speed *= e.splitSpeed ?? 1.25;
          // Legacy splits (Shardling) pay a flat 3g per sprout; typed splits
          // keep their own config bounty unless splitReward overrides it.
          if (e.splitReward != null) child.reward = e.splitReward;
          else if (!e.splitType) child.reward = 3;
          child.split = 0;
          Object.assign(child, e.trail.onPath(child.progress));
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
      Object.assign(e, e.trail.onPath(e.progress));
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
      this.damage(e, amount, { ...stats, area: true });
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
    const blastSet = new Set(blastVictims);
    for (const e of victims)
      // Splash victims take area damage, which cannot be dodged; pierce and
      // direct victims take a normal dodgeable hit.
      this.applyHit(
        blastSet.has(e) ? { ...p, stats: { ...p.stats, area: true } } : p,
        e,
      );
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
    // The VISUAL muzzle (mirrored with the sprite while a
    // mirror-facing tower's weapon points the other way). It only
    // ever feeds projectile `draw` below — never the logical
    // spawn, damage or targeting.
    const muzzle = towerVisualMuzzle(t);
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
          // The logical flight still starts at the classic point: the
          // homing chase is balance-tuned around it (moving the start
          // flipped a whole progression route in the balance report).
          // `draw` carries the muzzle for the renderer only: it stays
          // pinned there for the rest of the update that spawned it
          // (drawPin — at 4x the substeps would otherwise drag it off
          // the weapon before the first render), then flies a pursuit
          // curve onto the logical position (see the projectile step).
          x: t.x,
          y: t.y - 15,
          draw: { x: muzzle.x, y: muzzle.y },
          drawPin: this.frameRemainder,
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
    if (e.burrowed) return;
    if (e.heal) {
      for (const ally of this.enemies)
        if (
          ally.alive &&
          !ally.burrowed &&
          ally !== e &&
          distance(ally, e) <= e.abilityRange
        )
          ally.health = Math.min(ally.maxHealth, ally.health + e.heal);
      this.emit("heal", { enemy: e, radius: e.abilityRange });
    }
    if (e.laysEggs) {
      const live = this.enemies.filter(
        (a) => a.alive && a.type === "eggsac" && a.layerId === e.id,
      ).length;
      if (live < (e.eggCap || 12)) {
        const sac = this.spawn("eggsac", { trail: e.trail });
        sac.progress = e.progress;
        Object.assign(sac, e.trail.onPath(sac.progress));
        sac.layerId = e.id;
        // Egg sacs keep their flat paper-thin health at every wave.
        sac.health = sac.maxHealth = ENEMIES.eggsac.health;
        this.emit("egg", { enemy: sac, layer: e });
      }
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
        const ally = this.spawn(type, { trail: e.trail });
        ally.progress = Math.max(0, e.progress - 30);
        Object.assign(ally, e.trail.onPath(ally.progress));
        // Finite summons grant small bounties; the boss cannot farm a stalled wave.
        ally.reward = Math.min(ally.reward, 6);
      }
    }
  }
  // The same fixed-sized steps drive 1x, 2x, 3x, and accelerated test simulations.
  update(realDelta) {
    if (this.paused || this.ended) return;
    // Auto-start: after a short between-wave beat, begin the next wave.
    // The beat leaves room for the wave-clear checkpoint to land first.
    if (this.autoWave && !this.active && this.wave < this.totalWaves) {
      this.autoTimer += realDelta;
      if (this.autoTimer >= 1) {
        this.autoTimer = 0;
        this.startWave();
      }
    } else this.autoTimer = 0;
    let remaining = realDelta * this.speed;
    while (remaining > 1e-8 && !this.ended) {
      const dt = Math.min(remaining, 0.025);
      // Sim time left in this update, the step about to run
      // included: a projectile spawned during the step pins its
      // rendered position at the muzzle for exactly this span, so
      // the first rendered frame shows the shot at the weapon even
      // at 4x (whose substeps would otherwise drag it away before
      // any render). Direct step()/attack() callers see 0 — no pin.
      this.frameRemainder = remaining;
      this.step(dt);
      remaining -= dt;
    }
    this.frameRemainder = 0;
  }
  step(dt) {
    stepHero(this, dt);
    if (!this.active) return;
    this.waveTime += dt;
    while (this.queue.length && this.queue[0].at <= this.waveTime) {
      const entry = this.queue.shift();
      // Deal queue spawns round-robin across the map's trails (only
      // Two Fronts has more than one; single-trail maps are unaffected).
      entry.trail = this.trails[this.trailCursor++ % this.trails.length];
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
      // Diving (Dustdiver): alternate marching on the surface with
      // burrowing underground, where it cannot be targeted or hit.
      if (e.burrowPeriod) {
        if (e.burrowed) {
          e.burrowLeft -= dt;
          if (e.burrowLeft <= 0) {
            e.burrowed = false;
            e.burrowTimer = e.burrowPeriod;
            this.emit("surface", { enemy: e });
          }
        } else {
          e.burrowTimer -= dt;
          if (e.burrowTimer <= 0 && e.frozen <= 0) {
            e.burrowed = true;
            e.burrowLeft = e.burrowTime;
            this.emit("dive", { enemy: e });
          }
        }
      }
      // Egg sacs hatch where they were laid; freezing pauses the countdown.
      if (e.hatchTime && e.frozen <= 0) {
        e.hatchLeft -= dt;
        if (e.hatchLeft <= 0) {
          e.alive = false;
          for (let i = 0; i < (e.hatchCount || 2); i++) {
            const chick = this.spawn(e.hatchType || "sprout", {
              trail: e.trail,
            });
            chick.progress = Math.max(0, e.progress - i * 8);
            Object.assign(chick, e.trail.onPath(chick.progress));
          }
          this.emit("hatch", { enemy: e });
          continue;
        }
      }
      const stopped = Math.min(dt, e.frozen);
      e.frozen = Math.max(0, e.frozen - dt);
      e.progress += e.speed * e.slow * (dt - stopped);
      Object.assign(e, e.trail.onPath(e.progress));
      if (e.progress >= e.trail.PATH_LENGTH) {
        e.alive = false;
        const livesBefore = this.lives;
        this.lives = Math.max(0, this.lives - e.lives);
        this.emit("escape", { enemy: e });
        // Auto waves are a convenience, not autopilot through a leak: the
        // first lost life switches auto off so the player can reconsider.
        if (this.lives < livesBefore && this.autoWave) {
          this.autoWave = false;
          this.emit("autoOff", { enemy: e });
        }
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
      if (isAscended(t) && this.active && !this.ended) {
        if (t.novaLeft === undefined) t.novaLeft = 2 + (t.id % 5);
        t.novaLeft -= dt;
        if (t.novaLeft <= 0) {
          t.novaLeft = 11;
          this.nova(t, aura);
        }
      }
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
      // The rendered shot flies a pursuit curve from the muzzle onto
      // the logical position. While drawPin lasts (the remainder of
      // the update that spawned it) it stays exactly at the muzzle.
      // After that it chases the logical point at 2.4x flight speed
      // plus two closing terms: one proportional to the gap over
      // the remaining flight (d, the distance to the target
      // computed above — it dominates as the shot closes in, so
      // the gap always reaches zero before impact, even
      // point-blank) and one proportional to the gap itself (it
      // dominates at long range, where a tall tower's muzzle can
      // sit ~100px from the spawn point). The gap therefore
      // reaches zero well inside ~60px of travel at any range,
      // and the chase clamps at the logical point — no overshoot.
      if (p.draw) {
        if (p.drawPin > 0) p.drawPin -= dt;
        else {
          const gx = p.x - p.draw.x,
            gy = p.y - p.draw.y,
            gap = Math.hypot(gx, gy),
            dm = move * (2.4 + gap / Math.max(d, move)) + gap * 0.14;
          if (gap <= dm) {
            p.draw.x = p.x;
            p.draw.y = p.y;
          } else {
            p.draw.x += (gx * dm) / gap;
            p.draw.y += (gy * dm) / gap;
          }
        }
      }
      return true;
    });
    // Leftover egg sacs are cleared unhatched once nothing else remains:
    // a wave never waits on eggs alone.
    if (
      !this.queue.length &&
      this.enemies.every((e) => !e.alive || e.stationary)
    )
      for (const e of this.enemies) if (e.stationary) e.alive = false;
    this.enemies = this.enemies.filter((e) => e.alive);
    if (!this.remaining) {
      this.active = false;
      this.projectiles = [];
      this.zones = [];
      const bonus =
        20 +
        (this.campaign.mode === "freeplay"
          ? Math.min(this.wave, 100)
          : this.wave) *
          3;
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
