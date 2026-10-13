import Phaser from "phaser";
import { textures, battlefield } from "./art.js";
import { TOWERS } from "../data/towers.js";
export class GameScene extends Phaser.Scene {
  constructor(model, ui) {
    super("Game");
    this.model = model;
    this.ui = ui;
    this.towerSprites = new Map();
    this.enemySprites = new Map();
    this.effects = [];
  }
  create() {
    textures(this);
    battlefield(this);
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
    this.input.on("pointerdown", (p) => {
      if (
        this.ui.inMenu ||
        this.ui.helpOpen ||
        this.model.paused ||
        this.model.ended
      )
        return;
      if (this.ui.placing) {
        const tower = this.model.place(this.ui.placing, p.x, p.y);
        if (tower) {
          this.ui.placing = null;
          this.ui.selected = tower.id;
          this.ui.refresh(true);
        }
      } else {
        const tower = this.model.towers.find(
          (t) => Math.hypot(t.x - p.x, t.y - p.y) < 30,
        );
        this.ui.selected = tower?.id || null;
        this.ui.refresh(true);
      }
    });
    this.input.keyboard.on("keydown", (e) => {
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
      if (index >= 0 && index < 5) this.ui.choose(Object.keys(TOWERS)[index]);
    });
    this.ui.scene = this;
    this.ui.refresh(true);
  }
  effect(event) {
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
      this.particles[tower.type].explode(15, tower.x, tower.y - 20);
    }
    if (type === "attack") {
      const sprite = this.towerSprites.get(tower.id);
      if (sprite && !this.tweens.isTweening(sprite))
        this.tweens.add({
          targets: sprite,
          scaleX: 1.1,
          scaleY: 0.92,
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
        event.attack === "cannon" ? 16 : 6,
        event.x,
        event.y,
      );
      if (event.attack === "cannon" && event.radius > 70)
        this.cameras.main.shake(90, 0.0015);
    }
    if (type === "bolt")
      this.effects.push({
        type: "bolt",
        points: [{ x: tower.x, y: tower.y - 20 }, ...event.points],
        age: 0,
        life: 0.18,
        color: TOWERS.lightning.color,
      });
    if (type === "hit") {
      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) sprite.setData("hitLeft", 0.1);
    }
    if (type === "death") {
      this.particles.archer.explode(7, enemy.x, enemy.y);
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
    for (const t of this.model.towers) {
      let sprite = this.towerSprites.get(t.id);
      if (!sprite) {
        sprite = this.add.image(t.x, t.y - 13, `tower-${t.type}-${t.level}`);
        this.towerSprites.set(t.id, sprite);
      }
      sprite.setTexture(`tower-${t.type}-${t.level}`).setDepth(t.y + 40);
      if (t.id === this.ui.selected) {
        g.lineStyle(2, 0xe8deaa, 0.85);
        g.strokeEllipse(t.x, t.y + 8, 54, 23);
        g.lineStyle(1, TOWERS[t.type].color, 0.45);
        g.strokeCircle(t.x, t.y, TOWERS[t.type].levels[t.level - 1].range);
        g.fillStyle(TOWERS[t.type].color, 0.05);
        g.fillCircle(t.x, t.y, TOWERS[t.type].levels[t.level - 1].range);
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
      sprite
        .setPosition(e.x, e.y - 7 + Math.sin(e.progress * 0.12) * 1.5)
        .setDepth(e.y + 30)
        .setFlipX(Math.cos(e.angle) < 0);
      const hitLeft = Math.max(0, (sprite.getData("hitLeft") || 0) - dt);
      sprite.setData("hitLeft", hitLeft);
      sprite.setAlpha(hitLeft > 0 ? 0.6 : 1);
      sprite.setTint(
        e.frozen > 0
          ? 0x91e4ff
          : e.slowLeft > 0
            ? 0xb6e8f7
            : e.burnLeft > 0
              ? 0xffb797
              : 0xffffff,
      );
      const w = e.type === "boss" ? 64 : 26;
      g.fillStyle(0x223e38, 0.8);
      g.fillRoundedRect(e.x - w / 2, e.y - e.radius - 18, w, 4, 2);
      g.fillStyle(e.type === "boss" ? 0xc2a4ed : 0xd5e891);
      g.fillRoundedRect(
        e.x - w / 2,
        e.y - e.radius - 18,
        w * Math.max(0, e.health / e.maxHealth),
        4,
        2,
      );
      if (e.burnLeft > 0) {
        g.fillStyle(0xffb65a, 0.7);
        g.fillCircle(e.x + Math.sin(time * 0.02) * 8, e.y - e.radius - 4, 3);
      }
      if (e.frozen > 0) {
        g.lineStyle(2, 0xd5faff, 0.6);
        g.strokeCircle(e.x, e.y - 5, e.radius + 4);
      }
    }
    for (const p of this.model.projectiles) {
      const c = TOWERS[p.type].color,
        a = Math.atan2(p.target.y - p.y, p.target.x - p.x);
      g.lineStyle(p.type === "archer" ? 2 : 4, c, 0.32);
      g.lineBetween(p.x, p.y, p.x - Math.cos(a) * 20, p.y - Math.sin(a) * 20);
      g.fillStyle(c, 0.18);
      g.fillCircle(p.x, p.y, p.type === "cannon" ? 11 : 8);
      g.fillStyle(c);
      g.fillCircle(
        p.x,
        p.y,
        p.type === "cannon" ? 6 : p.type === "archer" ? 2 : 4,
      );
      if (p.type === "archer") {
        g.lineStyle(2, 0xffecb1);
        g.lineBetween(
          p.x - 8 * Math.cos(a),
          p.y - 8 * Math.sin(a),
          p.x + 3 * Math.cos(a),
          p.y + 3 * Math.sin(a),
        );
      }
      if (p.type === "frost") {
        g.lineStyle(1, 0xecffff);
        g.lineBetween(p.x - 5, p.y, p.x + 5, p.y);
        g.lineBetween(p.x, p.y - 5, p.x, p.y + 5);
      }
    }
    this.effects = this.effects.filter((e) => {
      e.age += dt;
      const alpha = 1 - e.age / e.life;
      if (alpha <= 0) {
        if (e.text) e.text.destroy();
        return false;
      }
      if (e.type === "ring") {
        g.lineStyle(2, e.color, alpha);
        g.strokeCircle(e.x, e.y, 5 + ((e.radius - 5) * e.age) / e.life);
        g.fillStyle(e.color, alpha * 0.12);
        g.fillCircle(e.x, e.y, (e.radius * e.age) / e.life);
      }
      if (e.type === "bolt") {
        for (let i = 1; i < e.points.length; i++) {
          const a = e.points[i - 1],
            b = e.points[i];
          g.lineStyle(5, e.color, alpha * 0.25);
          g.lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(2, 0xf2e6ff, alpha);
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
      const p = this.input.activePointer;
      if (p.x > 0 && p.x < 960 && p.y > 0 && p.y < 640) {
        const invalid = this.model.canPlace(this.ui.placing, p.x, p.y),
          c = invalid ? 0xec867c : 0xd4efb0;
        this.preview.fillStyle(c, 0.1);
        this.preview.fillCircle(
          p.x,
          p.y,
          TOWERS[this.ui.placing].levels[0].range,
        );
        this.preview.lineStyle(2, c, 0.75);
        this.preview.strokeCircle(
          p.x,
          p.y,
          TOWERS[this.ui.placing].levels[0].range,
        );
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
