import { HEROES } from "../data/heroes.js";
import { ARCHER_STATES, towerArtwork } from "../towerArtwork.js";
import Phaser from "phaser";
import { textures, battlefield } from "./art.js";
import {
  TOWERS,
  towerStats,
  towerTexture,
  attackVisual,
} from "../data/towers.js";
export class GameScene extends Phaser.Scene {
  constructor(model, ui) {
    super("Game");
    this.model = model;
    this.ui = ui;
    this.towerSprites = new Map();
    this.enemySprites = new Map();
    this.effects = [];
  }
  preload() {
    const base = import.meta.env.BASE_URL;
    for (const state of ARCHER_STATES)
      this.load.image(
        `v5-archer-${state}`,
        base +
          towerArtwork(
            { type: "archer", paths: state.split("-").map(Number) },
            "battlefield_256",
          ),
      );
    for (const type of ["wind", "rune"]) {
      for (const level of [1, 2, 3])
        this.load.svg(
          `tower-${type}-${level}`,
          `${base}portraits/${type}-${level === 1 ? "base" : "tier1-0"}.svg`,
          { width: 84, height: 88 },
        );
      for (const path of [0, 1, 2])
        for (const tier of [2, 3])
          this.load.svg(
            `evolution-${type}-${path}-${tier}`,
            `${base}portraits/${type}-${tier === 2 ? "tier2-" + path : path}.svg`,
            { width: 96, height: 100 },
          );
    }
    for (const type of Object.keys(HEROES))
      this.load.svg(`hero-${type}`, `${base}heroes/${type}.svg`, {
        width: 80,
        height: 84,
      });
  }
  create() {
    textures(this);
    this.battlefieldObjects = battlefield(
      this,
      this.model.trail,
      this.model.campaign.biome,
    );
    this.currentMap = this.model.campaign.id;
    this.dynamic = this.add.graphics().setDepth(900);
    this.preview = this.add.graphics().setDepth(1000);
    this.particles = {};
    for (const [type, def] of Object.entries(TOWERS))
      this.particles[type] = this.add
        .particles(0, 0, "spark", {
          color: [def.color, 0xffedbc],
          speed: { min: 18, max: 95 },
          scale: { start: 0.85, end: 0 },
          lifespan: 420,
          quantity: 8,
          maxParticles: 160,
          maxAliveParticles: 100,
          frequency: -1,
          alpha: { start: 0.85, end: 0 },
          gravityY: 50,
        })
        .setDepth(950);
    const pointerDown = (event) => {
      if (
        event.isPrimary === false ||
        (event.pointerType === "mouse" && event.button !== 0)
      )
        return;
      if (
        this.ui.drag?.moving ||
        this.ui.inMenu ||
        this.ui.helpOpen ||
        this.model.ended
      )
        return;
      // Native pointer events avoid Phaser's cached transform immediately after
      // the DOM panel changes the canvas size. Both touch and mouse use the same
      // world coordinates and simulation placement validator, once per gesture.
      const point = this.ui.worldPoint(event.clientX, event.clientY);
      if (!point || point.inside === false) return;
      if (this.ui.placing) {
        const tower = this.model.place(this.ui.placing, point.x, point.y);
        if (tower) {
          this.ui.placing = null;
          this.ui.selected = tower.id;
          this.ui.upgradeOpen = true;
          this.ui.refresh(true);
        }
      } else if (
        this.model.hero &&
        (this.ui.heroMoving ||
          Math.hypot(point.x - this.model.hero.x, point.y - this.model.hero.y) <
            38)
      ) {
        if (
          this.ui.heroMoving &&
          Math.hypot(
            point.x - this.model.hero.x,
            point.y - this.model.hero.y,
          ) >= 38
        ) {
          if (this.model.moveHero(point.x, point.y)) this.ui.heroMoving = false;
          else this.ui.toast("Choose clear ground for your hero.");
        } else {
          this.ui.heroMoving = true;
          this.ui.closeUpgrades();
          this.ui.toast("Tap clear ground to move your hero.");
        }
      } else {
        const tower = this.towerAt(point);
        if (tower) this.ui.selectTower(tower);
        else if (this.ui.upgradeOpen) this.ui.closeUpgrades();
        else this.ui.cancel();
      }
    };
    this.game.canvas.addEventListener("pointerdown", pointerDown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.game.canvas.removeEventListener("pointerdown", pointerDown),
    );
    this.input.keyboard.on("keydown", (e) => {
      if (!document.getElementById("modal").hidden) return;
      if (e.code === "Escape") {
        this.ui.cancel();
        return;
      }
      if (this.ui.inMenu || this.ui.helpOpen) return;
      if (e.code === "Space") {
        if (e.target?.closest?.("button, a, input, textarea")) return;
        e.preventDefault();
        if (this.model.active) this.ui.togglePause();
        else this.ui.beginWave();
      }
      const index = Number(e.key) - 1;
      if (index >= 0 && index < Object.keys(TOWERS).length)
        this.ui.choose(Object.keys(TOWERS)[index]);
    });
    this.ui.scene = this;
    this.ui.hydrateShop();
    this.ui.refresh(true);
  }
  towerAt(point) {
    // Hit the illustrated building, including roofs and tall evolved weapons,
    // rather than a tiny circle around its ground anchor. Opaque foreground
    // artwork wins in clusters; padding makes empty-edge taps forgiving.
    const candidates = this.model.towers
      .map((t) => {
        const sprite = this.towerSprites.get(t.id),
          frame = this.textures.getFrame(towerTexture(t));
        const illustrated = t.type === "archer";
        const x = sprite?.x ?? t.x,
          y = sprite?.y ?? t.y - (illustrated ? 0 : 13);
        const width = sprite?.displayWidth || (illustrated ? 80 : frame.width),
          height = sprite?.displayHeight || (illustrated ? 80 : frame.height);
        const originX = sprite?.originX ?? 0.5,
          originY = sprite?.originY ?? (illustrated ? 0.96 : 0.5);
        const localX = ((point.x - x) / width + originX) * frame.width;
        const localY = ((point.y - y) / height + originY) * frame.height;
        const inside =
          point.x >= x - width * originX - 8 &&
          point.x <= x + width * (1 - originX) + 8 &&
          point.y >= y - height * originY - 8 &&
          point.y <= y + height * (1 - originY) + 8;
        const opaque =
          inside &&
          localX >= 0 &&
          localY >= 0 &&
          localX < frame.width &&
          localY < frame.height &&
          this.textures.getPixelAlpha(
            Math.floor(localX),
            Math.floor(localY),
            towerTexture(t),
          ) > 20;
        return {
          t,
          inside,
          opaque,
          score: Math.hypot(point.x - x, point.y - y),
        };
      })
      .filter((c) => c.inside);
    const opaque = candidates
      .filter((c) => c.opaque)
      .sort((a, b) => b.t.y - a.t.y || b.t.id - a.t.id);
    return (
      opaque[0]?.t ||
      candidates.sort((a, b) => a.score - b.score || a.t.id - b.t.id)[0]?.t ||
      null
    );
  }
  effect(event) {
    if (event.type === "reset" && this.currentMap !== this.model.campaign.id) {
      this.battlefieldObjects?.forEach((o) => o.destroy());
      this.battlefieldObjects = battlefield(
        this,
        this.model.trail,
        this.model.campaign.biome,
      );
      this.currentMap = this.model.campaign.id;
    }
    if (!this.dynamic) return;
    const { type, tower, enemy } = event;
    if (type === "reset") {
      this.tweens.killAll();
      this.cameras.main.resetFX();
      for (const sprite of this.towerSprites.values()) sprite.destroy();
      for (const sprite of this.enemySprites.values()) sprite.destroy();
      this.towerSprites.clear();
      this.enemySprites.clear();
      this.effects.forEach((e) => e.text?.destroy());
      this.effects = [];
      Object.values(this.particles).forEach((p) => p.killAll());
      return;
    }
    if (type === "heroAttack") {
      const h = event.hero,
        c = HEROES[h.type].color;
      this.effects.push({
        type: "ring",
        x: event.target.x,
        y: event.target.y,
        color: c,
        age: 0,
        life: 0.45,
        radius: event.radius,
      });
      this.effects.push({
        type:
          h.type === "dragon" ? "jet" : h.type === "tiger" ? "claws" : "tail",
        heat: event.ability ? 2 : 1,
        points: [
          { x: h.x, y: h.y - 20 },
          { x: event.target.x, y: event.target.y },
        ],
        color: c,
        age: 0,
        life: 0.22,
      });
      if (this.heroSprite)
        this.tweens.add({
          targets: this.heroSprite,
          scaleX: 1.1,
          scaleY: 0.92,
          duration: 90,
          yoyo: true,
        });
    }
    if (type === "build" || type === "upgrade") {
      this.effects.push({
        type: "ring",
        x: tower.x,
        y: tower.y,
        color: TOWERS[tower.type].color,
        age: 0,
        life: 0.6,
        radius: 65,
      });
      this.particles[tower.type].explode(
        this.ui.reducedEffects ? 3 : 15,
        tower.x,
        tower.y - 20,
      );
    }
    if (
      [
        "armorBreak",
        "shieldBreak",
        "shatter",
        "heal",
        "phase",
        "ricochet",
      ].includes(type)
    ) {
      const color =
        type === "heal"
          ? 0x91edab
          : type === "shatter"
            ? 0x9ee9ff
            : type === "phase"
              ? 0xd6acff
              : type === "shieldBreak"
                ? 0x81ceff
                : 0xf4d4a1;
      this.effects.push({
        type: "ring",
        x: enemy.x,
        y: enemy.y,
        color,
        age: 0,
        life: 0.55,
        radius: event.radius || 35,
      });
      if (!this.ui.reducedEffects)
        this.particles[type === "shatter" ? "frost" : "cannon"].explode(
          type === "ricochet" ? 2 : 12,
          enemy.x,
          enemy.y,
        );
      if (type === "armorBreak")
        for (let i = 0; i < 6; i++)
          this.effects.push({
            type: "debris",
            x: enemy.x,
            y: enemy.y,
            dx: Math.cos(i) * 40,
            dy: -30 - i * 5,
            age: 0,
            life: 0.6,
            color: 0xb7c4ca,
          });
    }
    if (type === "attack") {
      const sprite = this.towerSprites.get(tower.id);
      if (sprite && !this.tweens.isTweening(sprite))
        this.tweens.add({
          targets: sprite,
          scaleX: sprite.scaleX * 1.1,
          scaleY: sprite.scaleY * 0.92,
          duration: 80,
          yoyo: true,
        });
    }
    if (type === "impact") {
      this.effects.push({
        type: "ring",
        x: event.x,
        y: event.y,
        color: TOWERS[event.attack].color,
        age: 0,
        life: 0.38,
        radius: event.radius,
      });
      this.particles[event.attack].explode(
        this.ui.reducedEffects ? 2 : event.attack === "cannon" ? 20 : 8,
        event.x,
        event.y,
      );
      if (
        !this.ui.reducedEffects &&
        event.attack === "cannon" &&
        event.radius > 70
      )
        this.cameras.main.shake(90, 0.0015);
    }
    if (type === "jet")
      this.effects.push({
        type: "jet",
        points: [
          { x: tower.x, y: tower.y - 35 },
          { x: event.target.x, y: event.target.y },
        ],
        heat: event.heat,
        age: 0,
        life: 0.28,
      });
    if (type === "rain")
      this.effects.push({
        type: "rain",
        x: event.x,
        y: event.y,
        radius: event.radius,
        age: 0,
        life: 0.45,
      });
    if (type === "seedBounce")
      this.effects.push({
        type: "seedBounce",
        points: [event.from, event.to],
        age: 0,
        life: 0.28,
        color: 0xffd66d,
      });
    if (type === "bolt")
      this.effects.push({
        type: "bolt",
        points: [{ x: tower.x, y: tower.y - 20 }, ...event.points],
        age: 0,
        life: 0.18,
        color: attackVisual(tower).color,
        tier: attackVisual(tower).tier,
        heavy: event.heavy,
      });
    if (type === "hit") {
      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) sprite.setData("hitLeft", 0.1);
    }
    if (type === "death") {
      this.particles[
        enemy.type === "wraith"
          ? "lightning"
          : enemy.type === "brute"
            ? "fire"
            : enemy.type === "shard"
              ? "frost"
              : "archer"
      ].explode(this.ui.reducedEffects ? 2 : 7, enemy.x, enemy.y);
      if (this.effects.length < 70) {
        const ghost = this.add
          .image(enemy.x, enemy.y - 7, `enemy-${enemy.type}`)
          .setDepth(enemy.y + 30);
        this.effects.push({ type: "death", text: ghost, age: 0, life: 0.24 });
      }
      if (this.effects.filter((e) => e.type === "gold").length < 20) {
        const text = this.add
          .text(enemy.x, enemy.y - 16, `+${enemy.reward}`, {
            fontFamily: "sans-serif",
            fontSize: "13px",
            color: "#fff1ad",
            fontStyle: "bold",
            stroke: "#395940",
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(990);
        this.effects.push({ type: "gold", text, age: 0, life: 0.7 });
      }
    }
    if (this.effects.length > 100) {
      this.effects
        .splice(0, this.effects.length - 100)
        .forEach((e) => e.text?.destroy());
    }
  }
  update(time, delta) {
    const stopped = this.model.paused || this.ui.inMenu || this.ui.helpOpen;
    this.tweens.timeScale = stopped ? 0 : this.model.speed;
    Object.values(this.particles).forEach(
      (p) => (p.timeScale = stopped ? 0 : this.model.speed),
    );
    if (!stopped) this.model.update(Math.min(delta / 1000, 0.08));
    const dt = stopped ? 0 : Math.min(delta / 1000, 0.08) * this.model.speed;
    const g = this.dynamic;
    g.clear();
    const towerIds = new Set(this.model.towers.map((t) => t.id));
    for (const [id, sprite] of this.towerSprites)
      if (!towerIds.has(id)) {
        sprite.destroy();
        this.towerSprites.delete(id);
      }
    const hero = this.model.hero;
    if (hero) {
      if (!this.heroSprite)
        this.heroSprite = this.add.image(
          hero.x,
          hero.y - 15,
          `hero-${hero.type}`,
        );
      this.heroSprite
        .setTexture(`hero-${hero.type}`)
        .setPosition(
          hero.x,
          hero.y - 15 + (this.model.paused ? 0 : Math.sin(time * 0.004) * 2),
        )
        .setDepth(hero.y + 45)
        .setVisible(true);
      if (this.ui.heroMoving) {
        g.lineStyle(2, HEROES[hero.type].color, 0.8);
        g.strokeCircle(hero.x, hero.y, HEROES[hero.type].range);
        g.lineStyle(2, 0xffe39a, 0.45);
        g.strokeCircle(
          hero.x,
          hero.y,
          HEROES[hero.type].buffRange *
            (this.model.relics.includes("banner") ? 1.2 : 1),
        );
      }
      if (hero.destination) {
        g.lineStyle(2, 0xffe39a, 0.7);
        g.lineBetween(hero.x, hero.y, hero.destination.x, hero.destination.y);
        g.strokeCircle(hero.destination.x, hero.destination.y, 15);
      }
    } else this.heroSprite?.setVisible(false);
    for (const t of this.model.towers) {
      let sprite = this.towerSprites.get(t.id);
      if (!sprite) {
        sprite = this.add.image(t.x, t.y - 13, towerTexture(t));
        if (t.type === "archer")
          sprite.setDisplaySize(80, 80).setOrigin(0.5, 0.96).setY(t.y);
        this.towerSprites.set(t.id, sprite);
      }
      sprite.setTexture(towerTexture(t)).setDepth(t.y + 40);
      if (!this.model.paused)
        sprite.y =
          t.y -
          (t.type === "archer" ? 0 : 13) +
          Math.sin(time * 0.002 + t.id) * 0.7;
      // Individual path ornaments change on every purchase, including crosspaths.
      for (let path = 0; path < 3; path++)
        if (t.type !== "archer" && t.paths[path]) {
          const v = attackVisual({
            ...t,
            paths: [0, 0, 0].map((n, p) => (p === path ? t.paths[path] : 0)),
          });
          const x = t.x - 20 + path * 20,
            y = t.y - 42;
          g.lineStyle(2, v.color, 0.9);
          g.lineBetween(x, t.y - 18, x, y);
          g.fillStyle(v.color, 0.95);
          g.fillTriangle(
            x,
            y - 4 - t.paths[path] * 2,
            x - 4,
            y + 3,
            x + 4,
            y + 3,
          );
          g.fillStyle(0xfff5d8, 0.9);
          g.fillCircle(x, y, 1.5);
        }
      if (t.paths.some((n) => n === 3)) {
        const stats = towerStats(t);
        g.lineStyle(1, TOWERS[t.type].color, 0.2);
        if (stats.aura) g.strokeCircle(t.x, t.y, stats.aura);
        g.fillStyle(
          TOWERS[t.type].color,
          0.06 + Math.sin(time * 0.002) * 0.025,
        );
        g.fillEllipse(t.x, t.y + 8, 65, 20);
      }
      if (t.id === this.ui.selected) {
        g.lineStyle(2, 0xe8deaa, 0.85);
        g.strokeEllipse(t.x, t.y + 8, 54, 23);
        const stroke = Math.max(2, 1920 / this.scale.displaySize.width);
        g.lineStyle(stroke + 2, 0x274c3e, 0.65);
        g.strokeCircle(t.x, t.y, towerStats(t).range);
        g.lineStyle(stroke, 0xffebb7, 0.9);
        g.strokeCircle(t.x, t.y, towerStats(t).range);
        g.fillStyle(TOWERS[t.type].color, 0.07);
        g.fillCircle(t.x, t.y, towerStats(t).range);
      }
    }
    const enemyIds = new Set(this.model.enemies.map((e) => e.id));
    for (const [id, sprite] of this.enemySprites)
      if (!enemyIds.has(id)) {
        sprite.destroy();
        this.enemySprites.delete(id);
      }
    for (const e of this.model.enemies) {
      let sprite = this.enemySprites.get(e.id);
      if (!sprite) {
        sprite = this.add.image(e.x, e.y, `enemy-${e.type}`);
        this.enemySprites.set(e.id, sprite);
      }
      const special = [
        "sprout",
        "shard",
        "healer",
        "warden",
        "wraith",
        "armored",
      ].includes(e.type);
      const pool = e.type === "warden" ? e.shield : e.armor,
        max = e.type === "warden" ? e.maxShield : e.maxArmor;
      const state =
        pool <= 0 ? "broken" : pool < max * 0.55 ? "cracked" : "intact";
      if (special) sprite.setTexture(`enemy-${e.type}-${state}`);
      if (e.elite) {
        sprite.setScale(1.3);
        g.lineStyle(2, 0xe7be75);
        g.strokeCircle(e.x, e.y - 8, 23);
      }
      if (e.boss) {
        sprite.setScale(1 + (e.phase - 1) * 0.12);
        if (e.armor > 0) {
          g.lineStyle(3, 0xafd791, 0.85);
          g.strokeEllipse(e.x, e.y, 77, 60);
          g.fillStyle(0x80ae71);
          for (let i = 0; i < 7; i++) {
            const a = (i * Math.PI * 2) / 7,
              tx = e.x + Math.cos(a) * 39,
              ty = e.y + Math.sin(a) * 29;
            g.fillTriangle(
              tx,
              ty,
              tx + Math.cos(a) * 13,
              ty + Math.sin(a) * 13,
              tx + Math.sin(a) * 7,
              ty - Math.cos(a) * 7,
            );
          }
        }
      }
      sprite
        .setPosition(e.x, e.y - 7 + Math.sin(e.progress * 0.12) * 1.5)
        .setDepth(e.y + 30)
        .setFlipX(Math.cos(e.angle) < 0);
      const hitLeft = Math.max(0, (sprite.getData("hitLeft") || 0) - dt);
      sprite.setData("hitLeft", hitLeft);
      sprite.setAlpha(
        hitLeft > 0
          ? 0.6
          : e.type === "wraith"
            ? 0.7 + Math.sin(time * 0.003) * 0.12
            : 1,
      );
      sprite.setTint(
        e.frozen > 0
          ? 0x91e4ff
          : e.slowLeft > 0
            ? 0xb6e8f7
            : e.burnLeft > 0
              ? 0xffb797
              : e.boss && e.phase === 3
                ? 0xffc791
                : 0xffffff,
      );
      const w = e.boss ? 64 : 26;
      g.fillStyle(0x223e38, 0.8);
      g.fillRoundedRect(e.x - w / 2, e.y - e.radius - 18, w, 4, 2);
      g.fillStyle(e.boss ? 0xc2a4ed : 0xd5e891);
      g.fillRoundedRect(
        e.x - w / 2,
        e.y - e.radius - 18,
        w * Math.max(0, e.health / e.maxHealth),
        4,
        2,
      );
      if (e.armor > 0 || e.shield > 0) {
        g.fillStyle(0x30474f);
        g.fillRoundedRect(e.x - w / 2, e.y - e.radius - 24, w, 4, 2);
        g.fillStyle(e.shield > 0 ? 0x84c7ee : 0xb1bcc4);
        g.fillRoundedRect(
          e.x - w / 2,
          e.y - e.radius - 24,
          w * (e.shield > 0 ? e.shield / e.maxShield : e.armor / e.maxArmor),
          4,
          2,
        );
      }
      if (e.protection && e.shield > 0) {
        g.lineStyle(1, 0x9bdcff, 0.3);
        g.strokeCircle(e.x, e.y, e.abilityRange);
      }
      if (e.brittleLeft > 0) {
        g.lineStyle(1, 0xd6faff, 0.7);
        g.strokeEllipse(e.x, e.y, 32, 25);
      }
      if (e.burnLeft > 0) {
        g.fillStyle(0xffb65a, 0.7);
        g.fillCircle(e.x + Math.sin(time * 0.02) * 8, e.y - e.radius - 4, 3);
      }
      if (e.frozen > 0) {
        g.lineStyle(2, 0xd5faff, 0.6);
        g.strokeCircle(e.x, e.y - 5, e.radius + 4);
      }
    }
    for (const z of this.model.zones) {
      const kind = z.source || z.type;
      const color =
        kind === "wind"
          ? 0x82dcd6
          : kind === "rune"
            ? 0xb293eb
            : kind === "grove"
              ? 0x4ba875
              : 0xed6d35;
      g.fillStyle(color, 0.22);
      g.fillEllipse(z.x, z.y, z.radius * 2, z.radius * 1.35);
      g.lineStyle(2, kind === "grove" ? 0xb0efa1 : color, 0.6);
      g.strokeEllipse(z.x, z.y, z.radius * 1.65, z.radius);
      if (kind === "wind") {
        for (let i = 0; i < 3; i++) {
          const angle = time * 0.004 + (i * Math.PI * 2) / 3;
          g.beginPath();
          g.arc(
            z.x,
            z.y - i * 7,
            z.radius * (0.35 + i * 0.2),
            angle,
            angle + Math.PI,
          );
          g.strokePath();
        }
      } else if (kind === "rune") {
        const r = z.radius * 0.6;
        g.strokeTriangle(
          z.x,
          z.y - r,
          z.x - r,
          z.y + r * 0.5,
          z.x + r,
          z.y + r * 0.5,
        );
        g.strokeCircle(z.x, z.y, r * 0.75);
      }
    }
    for (const p of this.model.projectiles) {
      const v = p.visual || {
          color: TOWERS[p.type].color,
          tier: 0,
          size: 1,
          trail: 16,
        },
        c = v.color,
        a = Math.atan2(p.target.y - p.y, p.target.x - p.x),
        dx = Math.cos(a),
        dy = Math.sin(a);
      g.lineStyle((p.type === "archer" ? 2 : 4) * v.size, c, 0.35);
      g.lineBetween(p.x, p.y, p.x - dx * v.trail, p.y - dy * v.trail);
      g.fillStyle(c, 0.15);
      g.fillCircle(p.x, p.y, 7 * v.size);
      if (
        p.type === "archer" ||
        (p.type === "grove" && !p.stats.splash && !p.stats.slow)
      ) {
        const length = (p.stats.pierce ? 17 : 10) * v.size,
          tip = 5 * v.size;
        g.lineStyle(p.stats.pierce ? 4 : 2, 0xffedbf);
        g.lineBetween(p.x - dx * length, p.y - dy * length, p.x, p.y);
        g.fillStyle(c);
        g.fillTriangle(
          p.x + dx * tip,
          p.y + dy * tip,
          p.x - dy * tip,
          p.y + dx * tip,
          p.x + dy * tip,
          p.y - dx * tip,
        );
        g.lineStyle(2, c);
        g.lineBetween(
          p.x - dx * length,
          p.y - dy * length,
          p.x - dx * (length - 4) + dy * 4,
          p.y - dy * (length - 4) - dx * 4,
        );
      } else if (p.type === "wind") {
        g.lineStyle(3 * v.size, c, 0.95);
        g.beginPath();
        g.arc(p.x, p.y, 7 * v.size, time * 0.008, time * 0.008 + 4.8);
        g.strokePath();
        g.lineStyle(2, 0xf4ffff, 0.8);
        g.lineBetween(p.x - 8 * v.size, p.y + 3, p.x + 8 * v.size, p.y - 3);
      } else if (p.type === "rune") {
        g.fillStyle(c, 0.7);
        g.fillTriangle(
          p.x,
          p.y - 8 * v.size,
          p.x - 7 * v.size,
          p.y + 6 * v.size,
          p.x + 7 * v.size,
          p.y + 6 * v.size,
        );
        g.lineStyle(2, 0xfff1bb, 0.9);
        g.strokeCircle(p.x, p.y, 9 * v.size);
      } else if (p.type === "frost") {
        g.lineStyle(2, c);
        for (let n = 0; n < 3 + v.tier; n++) {
          const angle = a + (n * Math.PI) / (3 + v.tier),
            r = 5 * v.size;
          g.lineBetween(
            p.x - Math.cos(angle) * r,
            p.y - Math.sin(angle) * r,
            p.x + Math.cos(angle) * r,
            p.y + Math.sin(angle) * r,
          );
        }
        g.fillStyle(0xf0ffff);
        g.fillCircle(p.x, p.y, 2 + v.tier);
      } else if (p.type === "fire") {
        g.fillStyle(c, 0.8);
        g.fillTriangle(
          p.x - dx * v.trail,
          p.y - dy * v.trail,
          p.x - dy * 7 * v.size,
          p.y + dx * 7 * v.size,
          p.x + dy * 7 * v.size,
          p.y - dx * 7 * v.size,
        );
        g.fillStyle(0xffc96f);
        g.fillCircle(p.x, p.y, 5 * v.size);
        g.fillStyle(0xfff0c5);
        g.fillCircle(p.x + dx * 2, p.y + dy * 2, 3 * v.size);
      } else if (p.type === "grove") {
        g.fillStyle(c);
        g.fillEllipse(p.x, p.y, 10 * v.size, 7 * v.size);
        g.lineStyle(2, 0xfff4bd);
        g.lineBetween(p.x - 4 * v.size, p.y, p.x + 4 * v.size, p.y);
      } else {
        g.fillStyle(0x465c64);
        g.fillCircle(p.x, p.y, 5 * v.size);
        g.lineStyle(2, c);
        g.strokeCircle(p.x, p.y, 5 * v.size);
        for (let n = 0; n < v.tier; n++) {
          g.fillStyle(c);
          g.fillCircle(p.x - dx * (n + 1) * 8, p.y - dy * (n + 1) * 8, 2);
        }
      }
      if (p.stats.arc) {
        g.lineStyle(2, 0xffeac0, 0.5);
        g.lineBetween(p.x, p.y, p.x - 10, p.y - 15);
      }
    }

    this.effects = this.effects.filter((e) => {
      e.age += dt;
      const alpha = 1 - e.age / e.life;
      if (alpha <= 0) {
        if (e.text) e.text.destroy();
        return false;
      }
      if (e.type === "rain") {
        for (let i = 0; i < (this.ui.reducedEffects ? 3 : 12); i++) {
          const a = i * 2.4,
            r = e.radius * Math.sqrt((i + 1) / 13);
          const x = e.x + Math.cos(a) * r,
            y = e.y + Math.sin(a) * r - 55 * alpha;
          g.lineStyle(2, 0xffe4a1, alpha);
          g.lineBetween(x - 5, y - 14, x + 4, y + 8);
          g.fillStyle(0xffefc2, alpha);
          g.fillTriangle(x + 4, y + 8, x, y + 3, x + 6, y + 1);
        }
      }
      if (e.type === "debris") {
        e.x += e.dx * dt;
        e.y += e.dy * dt;
        e.dy += 130 * dt;
        g.fillStyle(e.color, alpha);
        g.fillTriangle(e.x, e.y, e.x + 5, e.y - 4, e.x + 7, e.y + 3);
      }
      if (e.type === "ring") {
        g.lineStyle(2, e.color, alpha);
        g.strokeCircle(e.x, e.y, 5 + ((e.radius - 5) * e.age) / e.life);
        g.fillStyle(e.color, alpha * 0.12);
        g.fillCircle(e.x, e.y, (e.radius * e.age) / e.life);
      }
      if (e.type === "jet") {
        const [a, b] = e.points;
        g.lineStyle(11 * e.heat, 0xe35b36, alpha * 0.18);
        g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(5, 0xffad54, alpha * 0.7);
        g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(2, 0xffe4a1, alpha);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      if (e.type === "seedBounce") {
        const [a, b] = e.points;
        g.lineStyle(3, e.color, alpha * 0.8);
        g.lineBetween(a.x, a.y, b.x, b.y);
        g.fillStyle(0xfff2a2, alpha);
        g.fillCircle(
          a.x + (b.x - a.x) * (1 - alpha),
          a.y + (b.y - a.y) * (1 - alpha),
          5,
        );
      }
      if (e.type === "claws" || e.type === "tail") {
        const [a, b] = e.points;
        g.lineStyle(e.type === "tail" ? 7 : 3, e.color, alpha);
        if (e.type === "tail") {
          g.beginPath();
          g.arc(
            a.x,
            a.y,
            Math.hypot(b.x - a.x, b.y - a.y),
            Math.atan2(b.y - a.y, b.x - a.x) - 0.4,
            Math.atan2(b.y - a.y, b.x - a.x) + 0.4,
          );
          g.strokePath();
        } else {
          for (let i = -1; i <= 1; i++)
            g.lineBetween(
              b.x - 14 + i * 6,
              b.y - 16,
              b.x + 8 + i * 6,
              b.y + 14,
            );
          g.lineStyle(2, 0xfff2a2, alpha * 0.5);
          g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
      if (e.type === "bolt") {
        for (let i = 1; i < e.points.length; i++) {
          const a = e.points[i - 1],
            b = e.points[i];
          g.lineStyle(
            e.heavy ? 12 : 4 + (e.tier || 0) * 2,
            e.color,
            alpha * 0.25,
          );
          g.lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(
            2 + (e.tier || 0) * 0.5,
            e.tier >= 2 ? 0xfff0ad : 0xf2e6ff,
            alpha,
          );
          g.beginPath();
          g.moveTo(a.x, a.y);
          for (let j = 1; j <= 6; j++)
            g.lineTo(
              a.x +
                ((b.x - a.x) * j) / 6 +
                (j < 6 ? Math.sin(j * 8 + i) * 9 : 0),
              a.y + ((b.y - a.y) * j) / 6,
            );
          g.strokePath();
        }
      }
      if (e.type === "death") {
        e.text.setAlpha(alpha).setScale(0.75 + 0.25 * alpha);
      }
      if (e.type === "gold") {
        e.text.y -= dt * 35;
        e.text.setAlpha(alpha);
      }
      return true;
    });
    this.preview.clear();
    if (this.ui.placing && !stopped && !this.model.ended) {
      const p = this.ui.drag?.moving
        ? this.ui.drag.point
        : this.input.activePointer;
      if (p && p.x > 0 && p.x < 960 && p.y > 0 && p.y < 640) {
        const invalid = this.model.canPlace(this.ui.placing, p.x, p.y),
          c = invalid ? 0xec867c : 0xd4efb0;
        this.preview.fillStyle(c, 0.1);
        this.preview.fillCircle(p.x, p.y, TOWERS[this.ui.placing].base.range);
        this.preview.lineStyle(2, c, 0.75);
        this.preview.strokeCircle(p.x, p.y, TOWERS[this.ui.placing].base.range);
        this.preview.fillStyle(c, 0.3);
        this.preview.fillCircle(p.x, p.y, 23);
        this.preview.lineStyle(2, c);
        this.preview.strokeCircle(p.x, p.y, 23);
        this.preview.lineBetween(p.x - 6, p.y, p.x + 6, p.y);
        this.preview.lineBetween(p.x, p.y - 6, p.x, p.y + 6);
      }
    }
    this.ui.refresh();
  }
}
