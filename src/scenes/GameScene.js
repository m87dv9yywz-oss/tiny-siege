import { requestTexture } from "./illustratedAssets.js";
import { HEROES } from "../data/heroes.js";
import { ENEMIES } from "../data/enemies.js";
import {
  TOWER_STATES,
  TOWER_TYPES,
  artworkTexture,
  towerBaseArtwork,
  towerLayer,
  towerTopArtwork,
  towerTopTexture,
} from "../towerArtwork.js";
import {
  ENEMY_TYPES,
  enemyArtwork,
  enemyDisplaySize,
  enemyTexture,
  goldenArtwork,
  goldenTexture,
  stageTint,
} from "../enemyArtwork.js";
import { mapArtwork, mapTexture, mapThumbnail } from "../mapArtwork.js";
import { heroArtwork, heroTexture, heroStage } from "../heroArtwork.js";
import Phaser from "phaser";
import { textures, battlefield } from "./art.js";
import {
  TOWERS,
  towerStats,
  towerTexture,
  towerVisualMuzzle,
  mirrorDrawnSide,
  mirrorFlipFor,
  towerDisplaySize,
  poseForBearing,
  attackVisual,
  upgradeState,
} from "../data/towers.js";
export class GameScene extends Phaser.Scene {
  constructor(model, ui) {
    super("Game");
    this.model = model;
    this.ui = ui;
    this.towerSprites = new Map();
    this.towerTops = new Map();
    this.towerGlows = new Map();
    this.slips = new Map();
    this.enemySprites = new Map();
    this.effects = [];
  }
  preload() {
    const base = import.meta.env.BASE_URL;
    this.bootFailures = new Map();
    this.load.on("loaderror", file => { if (!this.bootComplete) this.bootFailures.set(file.key, file.url || file.src); });
    this.load.on("filecomplete", key => {
      if (this.bootFailures.delete(key) && this.ui.scene) this.ui.battlefieldReady();
    });
    for (const type of TOWER_TYPES)
      for (const state of ["0-0-0"])
        this.load.image(
          `v5-${type}-${state}`,
          base +
            towerBaseArtwork({ type, paths: state.split("-").map(Number) }),
        );
    for (const type of ENEMY_TYPES)
      this.load.image(enemyTexture(type), base + enemyArtwork(type));
    this.load.image(goldenTexture(), base + goldenArtwork());
    const startMap = mapTexture(this.model.campaign.id);
    if (startMap)
      this.load.image(startMap, base + mapArtwork(this.model.campaign.id));
    for (const type of Object.keys(HEROES)) {
      if (heroTexture(type))
        this.load.image(heroTexture(type, "baby"), base + heroArtwork(type, "baby"));
    }
  }
  create() {
    textures(this);
    if (!this.textures.exists("emitter-glow")) {
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = glowCanvas.height = 64;
      const gtx = glowCanvas.getContext("2d");
      const grad = gtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,0.9)");
      grad.addColorStop(0.4, "rgba(255,255,255,0.35)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      gtx.fillStyle = grad;
      gtx.fillRect(0, 0, 64, 64);
      this.textures.addCanvas("emitter-glow", glowCanvas);
    }
    this.showBattlefield(this.model.campaign.id);
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
    this.bootComplete = true;
    this.ui.scene = this;
    this.ui.hydrateShop();
    this.ui.refresh(true);
    this.ui.battlefieldReady();
  }
  async retryArtwork() {
    await Promise.all([...this.bootFailures].map(([key, url]) => {
      this.artFailures?.delete(key);
      return requestTexture(this, key, url);
    }));
    this.ui.battlefieldReady();
  }
  showBattlefield(id) {
    this.currentMap = id;
    this.battlefieldObjects?.forEach(object => object.destroy());
    const key = mapTexture(id);
    const apply = () => {
      if (this.currentMap !== id || !this.textures.exists(key)) return;
      this.battlefieldObjects?.forEach(object => object.destroy());
      this.battlefieldObjects = [];
      if (!this.mapImage) this.mapImage = this.add.image(480, 320, key).setDepth(-10);
      this.mapImage.setTexture(key).setDisplaySize(960, 640).setVisible(true);
      // A stale request may cache its image, but must never paint another map.
    };
    if (key && this.textures.exists(key)) { apply(); this.trimMapTextures(); }
    else {
      this.mapImage?.setVisible(false);
      this.battlefieldObjects = battlefield(this, this.model.trail, this.model.campaign.biome);
      if (key) {
        // While the full art downloads, cover the placeholder with the
        // map's own thumbnail (already cached from the menu cards) so
        // the field reads as this map loading, never a flat stand-in.
        const thumbKey = `${key}-thumb`;
        requestTexture(this, thumbKey, import.meta.env.BASE_URL + mapThumbnail(id)).then(ok => {
          if (!ok || this.currentMap !== id || this.textures.exists(key)) return;
          if (!this.mapImage) this.mapImage = this.add.image(480, 320, thumbKey).setDepth(-10);
          this.mapImage.setTexture(thumbKey).setDisplaySize(960, 640).setVisible(true);
        });
        requestTexture(this, key, import.meta.env.BASE_URL + mapArtwork(id)).then(ok => { if (ok) { apply(); this.trimMapTextures(); } });
      }
    }
  }
  // Start a map's full art downloading early (its prep screen, the
  // home screen) so pressing Begin rarely waits on it at all.
  warmMap(id) {
    const key = mapTexture(id);
    if (key && !this.textures.exists(key))
      requestTexture(this, key, import.meta.env.BASE_URL + mapArtwork(id));
  }
  heroArt(hero) {
    const stage = heroStage(hero.level), key = heroTexture(hero.type, stage);
    if (!this.textures.exists(key)) requestTexture(this, key, import.meta.env.BASE_URL + heroArtwork(hero.type, stage));
    return this.textures.exists(key) ? key : heroTexture(hero.type, "baby");
  }
  trimMapTextures() {
    const others = this.textures.getTextureKeys().filter(key => key.startsWith("v5-map-") && key !== mapTexture(this.currentMap));
    for (const key of others.slice(0, -1)) this.textures.remove(key);
  }
  towerArt(t) {
    const key = towerTexture(t);
    if (!this.textures.exists(key))
      requestTexture(this, key, import.meta.env.BASE_URL + towerBaseArtwork(t));
    // Poses-mode tops (cannon) need all three drawn poses warmed, so a
    // pose swap mid-fight never waits on the network.
    const poses =
      towerLayer(t)?.mode === "poses" ? ["level", "raised", "down"] : ["level"];
    for (const pose of poses) {
      const topKey = towerTopTexture(t, pose);
      if (topKey && !this.textures.exists(topKey))
        requestTexture(
          this,
          topKey,
          import.meta.env.BASE_URL + towerTopArtwork(t, pose),
        );
    }
    return this.textures.exists(key) ? key : `v5-${t.type}-0-0-0`;
  }
  towerAt(point) {
    // Hit the illustrated building, including roofs and tall evolved weapons,
    // rather than a tiny circle around its ground anchor. Opaque foreground
    // artwork wins in clusters; padding makes empty-edge taps forgiving.
    const candidates = this.model.towers
      .map((t) => {
        const sprite = this.towerSprites.get(t.id),
          frame = this.textures.getFrame(sprite?.texture.key || this.towerArt(t));
        const illustrated = artworkTexture(t) !== null;
        const x = sprite?.x ?? t.x,
          y = sprite?.y ?? t.y - (illustrated ? 0 : 13);
        const width =
            sprite?.displayWidth || (illustrated ? towerDisplaySize(t) : frame.width),
          height =
            sprite?.displayHeight ||
            (illustrated ? towerDisplaySize(t) : frame.height);
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
            sprite?.texture.key || this.towerArt(t),
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
    if (event.type === "reset" && this.currentMap !== this.model.campaign.id)
      this.showBattlefield(this.model.campaign.id);
    if (!this.dynamic) return;
    const { type, tower, enemy } = event;
    if (type === "reset") {
      this.tweens.killAll();
      this.cameras.main.resetFX();
      for (const sprite of this.towerSprites.values()) sprite.destroy();
      for (const sprite of this.enemySprites.values()) sprite.destroy();
      for (const top of this.towerTops.values()) top.destroy();
      for (const glow of this.towerGlows.values()) glow.destroy();
      this.towerSprites.clear();
      this.towerTops.clear();
      this.towerGlows.clear();
      this.enemySprites.clear();
      for (const key of this.textures.getTextureKeys())
        if (TOWER_TYPES.some(type => key.startsWith(`v5-${type}-`)) && !key.endsWith("0-0-0")) this.textures.remove(key);
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
      if (this.heroSprite) {
        this.tweens.killTweensOf(this.heroSprite);
        this.heroSprite.setDisplaySize(72, 72);
        this.tweens.add({
          targets: this.heroSprite,
          scaleX: this.heroSprite.scaleX * 1.1,
          scaleY: this.heroSprite.scaleY * 0.92,
          duration: 90,
          yoyo: true,
        });
      }
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
    if (type === "ascend") {
      // The ascension moment: a great golden ring, a burst of sparks and
      // a small shake — three towers just became a legend.
      this.effects.push({
        type: "ring",
        x: tower.x,
        y: tower.y,
        color: 0xffd76a,
        age: 0,
        life: 1.1,
        radius: 190,
      });
      this.particles[tower.type].explode(
        this.ui.reducedEffects ? 6 : 42,
        tower.x,
        tower.y - 24,
      );
      if (!this.ui.reducedEffects) this.cameras.main.shake(140, 0.0022);
    }
    if (type === "nova") {
      this.effects.push({
        type: "ring",
        x: tower.x,
        y: tower.y,
        color: 0xffd76a,
        age: 0,
        life: 0.7,
        radius:
          tower.type === "frost" || tower.type === "wind" ? 320 : 165,
      });
      this.particles[tower.type].explode(
        this.ui.reducedEffects ? 3 : 18,
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
    if (type === "dodge") {
      this.slips.set(enemy.id, enemy.slipX || 6);
      this.effects.push({
        type: "ring",
        x: enemy.x,
        y: enemy.y,
        color: 0xc9a7ff,
        age: 0,
        life: 0.35,
        radius: 26,
      });
    }
    if (type === "dive" || type === "surface")
      for (let i = 0; i < 7; i++)
        this.effects.push({
          type: "debris",
          x: enemy.x,
          y: enemy.y + 4,
          dx: Math.cos(i * 2.4) * 34,
          dy: -18 - (i % 3) * 9,
          age: 0,
          life: 0.5,
          color: 0xa97d4f,
        });
    if (type === "egg" || type === "hatch")
      this.effects.push({
        type: "ring",
        x: enemy.x,
        y: enemy.y,
        color: 0xffcf7d,
        age: 0,
        life: 0.4,
        radius: 22,
      });
    if (type === "attack") {
      // Layered towers flash the emitter glow on every shot; poses-mode
      // tops (cannon) also kick back along the active pose's barrel
      // (decayed in the per-frame pass). Static crowns do neither beyond
      // the flash.
      if (towerLayer(tower)) {
        if (towerLayer(tower).mode === "poses") tower._recoil = 3;
        tower._glowFlash = 1;
      }
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
          towerVisualMuzzle(tower),
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
        points: [towerVisualMuzzle(tower), ...event.points],
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
          .image(
            enemy.x,
            enemy.y - 7,
            enemy.golden
              ? goldenTexture()
              : enemyTexture(enemy.type) || `enemy-${enemy.type}`,
          )
          .setDepth(enemy.y + 30);
        if (enemy.golden || enemyTexture(enemy.type)) {
          const gd = enemyDisplaySize((ENEMIES[enemy.type] || {}).radius || 12);
          ghost.setDisplaySize(gd, gd);
        }
        // Fade relative to the displayed enemy, not the 256px source PNG.
        this.effects.push({ type: "death", text: ghost, scaleX: ghost.scaleX,
          scaleY: ghost.scaleY, age: 0, life: 0.24 });
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
    const effectLimit = this.ui.reducedEffects ? 36 : 100;
    if (this.effects.length > effectLimit) {
      this.effects
        .splice(0, this.effects.length - effectLimit)
        .forEach((e) => e.text?.destroy());
    }
  }
  // Bake a pure-white silhouette of a texture (cached per key) for the
  // aura coverage wash; drawn over a covered tower it reads as the
  // tower highlighted almost white.
  whiteSilhouette(key) {
    const whiteKey = `${key}__white`;
    if (this.textures.exists(whiteKey)) return whiteKey;
    const frame = this.textures.get(key)?.get();
    if (!frame) return key;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, frame.cutWidth);
    canvas.height = Math.max(1, frame.cutHeight);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      frame.source.image,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      0,
      0,
      frame.cutWidth,
      frame.cutHeight,
    );
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.textures.addCanvas(whiteKey, canvas);
    return whiteKey;
  }
  update(time, delta) {
    this.auraPreview = null;
    this.heroAuraPreview = null;
    this.selectionRings = [];
    if (this.gentleEffects !== this.ui.reducedEffects) {
      this.gentleEffects = this.ui.reducedEffects;
      for (const emitter of Object.values(this.particles))
        emitter.maxAliveParticles = this.gentleEffects ? 30 : 100;
      if (this.gentleEffects && this.effects.length > 36)
        this.effects.splice(0, this.effects.length - 36).forEach(e => e.text?.destroy());
    }
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
        this.towerTops.get(id)?.destroy();
        this.towerTops.delete(id);
        this.towerGlows.get(id)?.destroy();
        this.towerGlows.delete(id);
      }
    const hero = this.model.hero;
    if (hero) {
      if (!this.heroSprite) {
        this.heroSprite = this.add.image(
          hero.x,
          hero.y - 15,
          this.heroArt(hero),
        );
        if (heroTexture(hero.type)) this.heroSprite.setDisplaySize(72, 72);
      }
      this.heroSprite
        .setTexture(this.heroArt(hero))
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
        sprite = this.add.image(t.x, t.y - 13, this.towerArt(t));
        if (artworkTexture(t) !== null)
          sprite
            .setDisplaySize(towerDisplaySize(t), towerDisplaySize(t))
            .setOrigin(0.5, 0.96)
            .setY(t.y);
        this.towerSprites.set(t.id, sprite);
      }
      const wanted = towerTexture(t);
      this.towerArt(t);
      if (this.textures.exists(wanted)) sprite.setTexture(wanted);
      // Per-state display size: ascended towers stand larger, and slim
      // states grow toward the median body width (towerDisplaySize).
      if (artworkTexture(t) !== null) {
        const display = towerDisplaySize(t);
        if (sprite.displayWidth !== display)
          sprite.setDisplaySize(display, display);
      }
      sprite.setDepth(t.y + 40);
      if (t.id === this.ui.selected) {
        for (let p = 0; p < 3; p++) {
          const state = upgradeState(t, p);
          if (!state.locked && t.paths[p] < 3) {
            const next = { ...t, paths: t.paths.map((n, i) => n + (i === p ? 1 : 0)) };
            this.towerArt(next);
          }
        }
      }
      if (!this.model.paused)
        sprite.y =
          t.y -
          (artworkTexture(t) !== null ? 0 : 13) +
          Math.sin(
            time * (TOWERS[t.type].waterOnly ? 0.0011 : 0.002) + t.id,
          ) *
            (TOWERS[t.type].waterOnly ? 1.9 : 0.7);
      // Layered towers (turning proof): the top layer rides the base
      // sprite but NEVER rotates (hybrid aim, 2026-10-19 — Kingdom
      // Rush style: planted static art, aim read from the muzzle).
      // Poses-mode tops (cannon) show the drawn pose for the sim
      // target's elevation band and flip to its side; static tops
      // (wind crowns) just sit planted. Selection, hitboxes and the
      // aura wash keep following the base sprite alone.
      {
        const layer = artworkTexture(t) !== null ? towerLayer(t) : null;
        let top = this.towerTops.get(t.id),
          glow = this.towerGlows.get(t.id);
        if (!layer) {
          if (top) {
            top.destroy();
            this.towerTops.delete(t.id);
          }
          if (glow) {
            glow.destroy();
            this.towerGlows.delete(t.id);
          }
          t._aimPose = undefined;
          t._aimFlip = undefined;
          t._poseDip = undefined;
        } else if (this.textures.exists(towerTopTexture(t))) {
          const display = towerDisplaySize(t);
          const pivotX = sprite.x + (layer.pivot[0] - 0.5) * display,
            pivotY = sprite.y + (layer.pivot[1] - 0.96) * display;
          // The sim's own targeting (same stats, same ordering) names
          // the current target. A poses-mode top tracks it by pose +
          // flip (poseForBearing carries the band hysteresis); with
          // no target it settles back to the level pose and keeps its
          // last flip.
          const stats = this.model.effectiveStats(t),
            target = this.model.targets(t, stats)[0];
          if (layer.mode === "poses") {
            if (target) {
              const aim = poseForBearing(
                target.x - pivotX,
                target.y - pivotY,
                t._aimPose,
              );
              t._aimFlip = aim.flip;
              if (aim.pose !== (t._aimPose ?? "level")) t._poseDip = 0.07;
              t._aimPose = aim.pose;
            } else if ((t._aimPose ?? "level") !== "level") {
              t._aimPose = "level";
              t._poseDip = 0.07;
            }
          }
          const topKey = towerTopTexture(
            t,
            layer.mode === "poses" ? (t._aimPose ?? "level") : "level",
          );
          if (!top) {
            top = this.add.image(0, 0, topKey);
            this.towerTops.set(t.id, top);
          }
          // Swap only once the pose art has arrived; until then the
          // current pose keeps showing (bases behave the same way).
          if (top.texture.key !== topKey && this.textures.exists(topKey))
            top.setTexture(topKey);
          top.setOrigin(layer.pivot[0], layer.pivot[1]);
          top.setDisplaySize(display, display);
          top.rotation = 0;
          top.setFlipX(layer.mode === "poses" ? !!t._aimFlip : false);
          // Pose-swap softening: a ~70ms alpha dip to 0.6 and back
          // hides the pop when the drawn pose changes.
          if ((t._poseDip || 0) > 0 && dt > 0) {
            t._poseDip = Math.max(0, t._poseDip - dt);
            const p = 1 - t._poseDip / 0.07;
            top.setAlpha(p < 0.5 ? 1 - 0.8 * p : 0.2 + 0.8 * p);
          } else top.setAlpha(1);
          // Recoil (poses only): the shot kicks the top ~3px against
          // the active pose's barrel direction, settling over ~120ms
          // (set by the attack event hook).
          t._recoil = Math.max(0, (t._recoil || 0) - dt * 25);
          let offX = 0,
            offY = 0;
          if (layer.mode === "poses" && t._recoil > 0) {
            const emitter = layer.poses[t._aimPose ?? "level"];
            let dirX = emitter[0] - layer.pivot[0],
              dirY = emitter[1] - layer.pivot[1];
            if (t._aimFlip) dirX = -dirX;
            const dirLen = Math.hypot(dirX, dirY) || 1;
            offX = -(dirX / dirLen) * t._recoil;
            offY = -(dirY / dirLen) * t._recoil;
          }
          top.setPosition(pivotX + offX, pivotY + offY);
          top.setDepth(sprite.depth + 2);
          // Emitter glow at the active pose's muzzle point: the
          // model's cooldown is the charge clock, so the glow brightens as the
          // next shot charges, flashes on fire (attack event), and
          // idles at a soft pulse while nothing is in range.
          if (!glow) {
            glow = this.add.image(0, 0, "emitter-glow");
            this.towerGlows.set(t.id, glow);
          }
          const muzzle = towerVisualMuzzle(t);
          t._glowFlash = Math.max(0, (t._glowFlash || 0) - dt * 6);
          const charge = target
            ? 1 -
              Math.max(
                0,
                Math.min(1, t.cooldown / Math.max(stats.cooldown, 0.01)),
              )
            : 0;
          glow
            .setPosition(muzzle.x, muzzle.y + (sprite.y - t.y))
            .setDisplaySize(display * 0.42, display * 0.42)
            .setTint(TOWERS[t.type].color)
            .setAlpha(
              Math.max(
                charge * 0.5,
                (t._glowFlash || 0) * 0.85,
                target
                  ? 0.12
                  : 0.06 + Math.sin(time * 0.003 + t.id) * 0.03,
              ),
            )
            .setDepth(sprite.depth + 3)
            .setVisible(true);
        }
        // Layered but top art still downloading: leave any existing
        // top/glow untouched, like the base keeps its old texture.
      }
      // Mirror-facing weapons (owner, 2026-10-20): flat-art towers
      // whose drawn weapon points to one side flip horizontally so
      // the weapon faces the sim's current target — the flat-art
      // analog of the cannon tops' flip, driven by the same
      // model.targets call. Inside the deadband (or with no
      // target) the last facing holds. Layered towers never land
      // here: mirrorDrawnSide refuses them, their tops aim by
      // pose instead. flipX is separate from the sprite's scale,
      // so the per-state display size and the attack kick tween
      // compose untouched.
      {
        const drawn =
          artworkTexture(t) !== null ? mirrorDrawnSide(t) : null;
        if (drawn != null) {
          const target = this.model.targets(
            t,
            this.model.effectiveStats(t),
          )[0];
          t._mirrorFlip = mirrorFlipFor(t, target ? target.x : null);
          sprite.setFlipX(!!t._mirrorFlip);
        } else if (t._mirrorFlip) {
          t._mirrorFlip = undefined;
          sprite.setFlipX(false);
        }
      }
      // Individual path ornaments change on every purchase, including crosspaths.
      for (let path = 0; path < 3; path++)
        if (artworkTexture(t) === null && t.paths[path]) {
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
        // Aura visibility: when the selected tower empowers nearby towers
        // (the Runesmith's halo), draw the aura ring in pale selection
        // white; the covered towers themselves are washed white by the
        // overlay pass below, the way range previews in Bloons read.
        const stats = towerStats(t);
        if (stats.buffRange) {
          const covered = this.model.towers.filter(
            (o) =>
              o.id !== t.id &&
              Math.hypot(o.x - t.x, o.y - t.y) <= stats.buffRange,
          );
          this.auraPreview = {
            source: t.id,
            range: stats.buffRange,
            covered: covered.map((o) => o.id),
          };
          g.lineStyle(stroke + 2, 0x274c3e, 0.5);
          g.strokeCircle(t.x, t.y, stats.buffRange);
          g.lineStyle(stroke, 0xfff6da, 0.95);
          g.strokeCircle(t.x, t.y, stats.buffRange);
          g.fillStyle(0xffffff, 0.045);
          g.fillCircle(t.x, t.y, stats.buffRange);
          this.selectionRings.push({ kind: "buff", range: stats.buffRange });
        }
        // Enemy-affecting auras (the Frost tower's chill field) get the
        // same selection ring; their targets are enemies, so there are
        // no allied towers to wash.
        if (stats.aura) {
          g.lineStyle(stroke + 2, 0x274c3e, 0.5);
          g.strokeCircle(t.x, t.y, stats.aura);
          g.lineStyle(stroke, 0xfff6da, 0.9);
          g.strokeCircle(t.x, t.y, stats.aura);
          g.fillStyle(0xffffff, 0.04);
          g.fillCircle(t.x, t.y, stats.aura);
          this.selectionRings.push({ kind: "chill", range: stats.aura });
        }
      }
    }
    // Hero aura preview: while the player is moving the hero, show its
    // family aura ring and cover the towers it would empower, exactly
    // like a selected buffing tower. (Banner relic widens the aura,
    // mirroring Game.effectiveStats.)
    if (this.ui.heroMoving && this.model.hero) {
      const hero = this.model.hero,
        family = { dragon: "fire", dinosaur: "cannon", tiger: "archer" }[
          hero.type
        ],
        range =
          HEROES[hero.type].buffRange *
          (this.model.relics.includes("banner") ? 1.2 : 1),
        covered = this.model.towers
          .filter(
            (o) =>
              o.type === family &&
              Math.hypot(o.x - hero.x, o.y - hero.y) <= range,
          )
          .map((o) => o.id);
      this.heroAuraPreview = { range, covered };
      const stroke = Math.max(2, 1920 / this.scale.displaySize.width);
      g.lineStyle(stroke + 2, 0x274c3e, 0.5);
      g.strokeCircle(hero.x, hero.y, range);
      g.lineStyle(stroke, 0xfff6da, 0.95);
      g.strokeCircle(hero.x, hero.y, range);
      g.fillStyle(0xffffff, 0.045);
      g.fillCircle(hero.x, hero.y, range);
    }
    // Aura overlays: while a buffing tower is selected, every tower its
    // aura covers gets a white silhouette wash over its own sprite, so
    // coverage reads at a glance; deselecting restores the normal look.
    // CONVENTION (owner, 2026-10-16): every local effect in the game —
    // tower buffs, hero auras, future towers with any area effect —
    // surfaces through this same selection preview: pale ring for the
    // radius, white wash for affected allied towers. Add producers to
    // auraPreview/heroAuraPreview; do not invent a second style.
    {
      this.auraOverlays ||= new Map();
      const covered = new Set([
        ...(this.auraPreview?.covered || []),
        ...(this.heroAuraPreview?.covered || []),
      ]);
      for (const [id, overlay] of this.auraOverlays)
        if (!covered.has(id) || !this.towerSprites.has(id)) {
          overlay.destroy();
          this.auraOverlays.delete(id);
        }
      const wash = 0.7 + Math.sin(time * 0.006) * 0.08;
      for (const id of covered) {
        const sprite = this.towerSprites.get(id);
        if (!sprite) continue;
        // The wash is a pre-rendered pure-white silhouette of the
        // tower's own texture: the Canvas renderer does not apply
        // tintFill, so the silhouette is baked into a texture instead.
        const whiteKey = this.whiteSilhouette(sprite.texture.key);
        let overlay = this.auraOverlays.get(id);
        if (!overlay) {
          overlay = this.add.image(sprite.x, sprite.y, whiteKey);
          this.auraOverlays.set(id, overlay);
        }
        if (overlay.texture.key !== whiteKey) overlay.setTexture(whiteKey);
        overlay
          .setPosition(sprite.x, sprite.y)
          .setOrigin(sprite.originX, sprite.originY)
          .setDisplaySize(sprite.displayWidth, sprite.displayHeight)
          .setDepth(sprite.depth + 1)
          .setAlpha(wash);
      }
    }
    for (const [id, v] of this.slips) {
      const nv = v * Math.max(0, 1 - dt * 6);
      if (Math.abs(nv) < 0.2) this.slips.delete(id);
      else this.slips.set(id, nv);
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
        const tex = e.golden
          ? goldenTexture()
          : enemyTexture(e.type) || `enemy-${e.type}`;
        sprite = this.add.image(e.x, e.y, tex);
        if (e.golden || enemyTexture(e.type)) {
          const d =
            enemyDisplaySize((ENEMIES[e.type] || {}).radius || 12) *
            (e.displayScale || 1);
          sprite.setDisplaySize(d, d);
        }
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
      if (special)
        if (enemyTexture(e.type))
          sprite
            .setTexture(e.golden ? goldenTexture() : enemyTexture(e.type))
            .setTint(max > 0 && state === "broken" ? 0xbbbbbb : max > 0 && state === "cracked" ? 0xdddddd : stageTint(e.stage));
        else sprite.setTexture(`enemy-${e.type}-${state}`);
      else if (!e.boss) sprite.setTint(stageTint(e.stage));
      if (e.golden) {
        g.lineStyle(2, 0xffbe3c, 0.95);
        g.strokeCircle(e.x, e.y - 8, 17 * (e.displayScale || 1));
      }
      if (e.elite) {
        sprite.setDisplaySize(enemyDisplaySize((ENEMIES[e.type]?.radius || 12) * 1.3 * (e.displayScale || 1)), enemyDisplaySize((ENEMIES[e.type]?.radius || 12) * 1.3 * (e.displayScale || 1)));
        g.lineStyle(2, 0xe7be75);
        g.strokeCircle(e.x, e.y - 8, 23);
      }
      if (e.boss) {
        sprite.setDisplaySize(enemyDisplaySize((ENEMIES[e.type]?.radius || 32) * (1 + (e.phase - 1) * 0.12)), enemyDisplaySize((ENEMIES[e.type]?.radius || 32) * (1 + (e.phase - 1) * 0.12)));
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
      // Direction polish: mirror with hysteresis so hairpins don't make the
      // sprite flicker, lean a few degrees into the direction of travel,
      // and honor the sideways slip when a Shadowhart dodges.
      const cosA = Math.cos(e.angle || 0);
      let flip = sprite.getData("flip");
      if (cosA > 0.35) flip = false;
      else if (cosA < -0.35) flip = true;
      if (flip === undefined) flip = cosA < 0;
      sprite.setData("flip", flip);
      const leanFrom = sprite.getData("lean") || 0,
        leanTo = cosA * 0.1 * (flip ? -1 : 1),
        lean = leanFrom + (leanTo - leanFrom) * Math.min(1, dt * 7);
      sprite.setData("lean", lean);
      const slip = this.slips.get(e.id) || 0;
      sprite
        .setPosition(
          e.x + slip,
          e.y -
            7 +
            Math.sin(e.progress * 0.12) * 1.5 +
            (e.burrowed ? e.radius * 0.62 : 0),
        )
        .setDepth(e.y + 30)
        .setFlipX(flip)
        .setRotation(lean);
      if (e.burrowed) {
        // A travelling dust mound and the lamp glow mark the diver below.
        g.fillStyle(0x8a6a42, 0.85);
        g.fillEllipse(e.x, e.y + 7, e.radius * 2.1, e.radius * 0.8);
        g.fillStyle(0x6e5233, 0.9);
        g.fillEllipse(e.x - 4, e.y + 5, e.radius * 1.1, e.radius * 0.5);
        g.fillStyle(0xffd98a, 0.95);
        g.fillCircle(e.x, e.y + 2, 2.4);
      }
      const hitLeft = Math.max(0, (sprite.getData("hitLeft") || 0) - dt);
      sprite.setData("hitLeft", hitLeft);
      sprite.setAlpha(
        hitLeft > 0
          ? 0.6
          : e.burrowed
            ? 0.5
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
        px = p.draw?.x ?? p.x,
        py = p.draw?.y ?? p.y,
        a = Math.atan2(p.target.y - py, p.target.x - px),
        dx = Math.cos(a),
        dy = Math.sin(a);
      g.lineStyle((p.type === "archer" ? 2 : 4) * v.size, c, 0.35);
      g.lineBetween(px, py, px - dx * v.trail, py - dy * v.trail);
      g.fillStyle(c, 0.15);
      g.fillCircle(px, py, 7 * v.size);
      if (
        p.type === "archer" ||
        (p.type === "grove" && !p.stats.splash && !p.stats.slow)
      ) {
        const length = (p.stats.pierce ? 17 : 10) * v.size,
          tip = 5 * v.size;
        g.lineStyle(p.stats.pierce ? 4 : 2, 0xffedbf);
        g.lineBetween(px - dx * length, py - dy * length, px, py);
        g.fillStyle(c);
        g.fillTriangle(
          px + dx * tip,
          py + dy * tip,
          px - dy * tip,
          py + dx * tip,
          px + dy * tip,
          py - dx * tip,
        );
        g.lineStyle(2, c);
        g.lineBetween(
          px - dx * length,
          py - dy * length,
          px - dx * (length - 4) + dy * 4,
          py - dy * (length - 4) - dx * 4,
        );
      } else if (p.type === "wind") {
        g.lineStyle(3 * v.size, c, 0.95);
        g.beginPath();
        g.arc(px, py, 7 * v.size, time * 0.008, time * 0.008 + 4.8);
        g.strokePath();
        g.lineStyle(2, 0xf4ffff, 0.8);
        g.lineBetween(px - 8 * v.size, py + 3, px + 8 * v.size, py - 3);
      } else if (p.type === "rune") {
        g.fillStyle(c, 0.7);
        g.fillTriangle(
          px,
          py - 8 * v.size,
          px - 7 * v.size,
          py + 6 * v.size,
          px + 7 * v.size,
          py + 6 * v.size,
        );
        g.lineStyle(2, 0xfff1bb, 0.9);
        g.strokeCircle(px, py, 9 * v.size);
      } else if (p.type === "frost") {
        g.lineStyle(2, c);
        for (let n = 0; n < 3 + v.tier; n++) {
          const angle = a + (n * Math.PI) / (3 + v.tier),
            r = 5 * v.size;
          g.lineBetween(
            px - Math.cos(angle) * r,
            py - Math.sin(angle) * r,
            px + Math.cos(angle) * r,
            py + Math.sin(angle) * r,
          );
        }
        g.fillStyle(0xf0ffff);
        g.fillCircle(px, py, 2 + v.tier);
      } else if (p.type === "fire") {
        g.fillStyle(c, 0.8);
        g.fillTriangle(
          px - dx * v.trail,
          py - dy * v.trail,
          px - dy * 7 * v.size,
          py + dx * 7 * v.size,
          px + dy * 7 * v.size,
          py - dx * 7 * v.size,
        );
        g.fillStyle(0xffc96f);
        g.fillCircle(px, py, 5 * v.size);
        g.fillStyle(0xfff0c5);
        g.fillCircle(px + dx * 2, py + dy * 2, 3 * v.size);
      } else if (p.type === "grove") {
        g.fillStyle(c);
        g.fillEllipse(px, py, 10 * v.size, 7 * v.size);
        g.lineStyle(2, 0xfff4bd);
        g.lineBetween(px - 4 * v.size, py, px + 4 * v.size, py);
      } else {
        g.fillStyle(0x465c64);
        g.fillCircle(px, py, 5 * v.size);
        g.lineStyle(2, c);
        g.strokeCircle(px, py, 5 * v.size);
        for (let n = 0; n < v.tier; n++) {
          g.fillStyle(c);
          g.fillCircle(px - dx * (n + 1) * 8, py - dy * (n + 1) * 8, 2);
        }
      }
      if (p.stats.arc) {
        g.lineStyle(2, 0xffeac0, 0.5);
        g.lineBetween(px, py, px - 10, py - 15);
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
        const shrink = 0.75 + 0.25 * alpha;
        e.text.setAlpha(alpha).setScale(e.scaleX * shrink, e.scaleY * shrink);
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
