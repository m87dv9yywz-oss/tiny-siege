import { HEROES } from "./data/heroes.js";
import { towerArtwork } from "./towerArtwork.js";
import { TOWERS, towerStats, towerName, upgradeState } from "./data/towers.js";
import { introductionsFor, ENEMY_GUIDE } from "./data/introductions.js";
import { guideHTML } from "./upgradeGuide.js";
import { UNLOCK_COSTS } from "./progression/profiles.js";
import { WAVE_HINTS } from "./data/waves.js";
const $ = (id) => document.getElementById(id);
export class UI {
  constructor(model, kingdom = null) {
    this.kingdom = kingdom;
    if (kingdom) kingdom.ui = this;
    this.model = model;
    this.inMenu = true;
    this.helpOpen = false;
    this.placing = null;
    this.selected = null;
    this.upgradeOpen = false;
    this.sound = false;
    this.reducedEffects = false;
    this.drag = null;
    this.last = "";
    $("tower-shop").innerHTML = Object.entries(TOWERS)
      .map(
        ([key, t], i) =>
          `<button class="tower-card" data-tower="${key}" style="--tower-color:${t.hex}" aria-label="Buy ${t.name}, ${t.cost} gold"><span class="key">${i + 1}</span><span class="tower-icon">${t.icon}</span><span><b>${t.name}</b><small>${t.subtitle}</small></span><span class="tower-cost"><span>◈</span>${t.cost}</span></button>`,
      )
      .join("");
    document.querySelectorAll("[data-tower]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!this.suppressClick) this.choose(b.dataset.tower);
        }),
    );
    this.bindDrag();
    this.heroMoving = false;
    $("hero-move").onclick = () => {
      this.heroMoving = !this.heroMoving;
      this.placing = null;
      this.closeUpgrades();
      this.toast(
        this.heroMoving
          ? "Tap clear ground to move your hero."
          : "Hero movement cancelled.",
      );
    };
    $("hero-ability").onclick = () => {
      if (!this.model.heroAbility())
        this.toast(
          "Bring enemies into hero range, or wait for the ability to recharge.",
        );
    };
    window.addEventListener("pagehide", () =>
      this.kingdom?.safe(() => this.kingdom.saveBattle()),
    );
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !this.inMenu) {
        this.model.paused = true;
        this.kingdom?.safe(() => this.kingdom.saveBattle());
        this.refresh(true);
      }
    });
    $("show-upgrades").onclick = () => this.openUpgrades();
    $("clear-range").onclick = () => this.cancel();
    document.addEventListener(
      "pointerdown",
      (e) => {
        this.canvasPointerDown = e
          .composedPath()
          .some((node) => node.matches?.("#game canvas"));
      },
      true,
    );
    document.addEventListener("click", (e) => {
      if (this.canvasPointerDown && e.detail) {
        this.canvasPointerDown = false;
        return;
      }
      if (
        this.upgradeOpen &&
        !this.inMenu &&
        !this.helpOpen &&
        !e
          .composedPath()
          .some((node) =>
            node.matches?.(
              "#game canvas, #selection-panel, #tower-inspector, #tower-shop, #modal, .battle-controls, .map-footer, .topbar, #hero-controls",
            ),
          )
      )
        this.closeUpgrades();
    });
    $("effects").onclick = () => {
      this.reducedEffects = !this.reducedEffects;
      $("effects").textContent = this.reducedEffects
        ? "Effects: gentle"
        : "Effects: full";
    };
    $("start-wave").onclick = () => this.beginWave();
    $("pause").onclick = () => this.togglePause();
    $("speed").onclick = () => {
      this.model.speed = this.model.speed === 1 ? 2 : 1;
      this.refresh(true);
    };
    $("leave-run").onclick = () => this.leaveRun();
    $("restart").onclick = () => this.restart();
    $("help-button").onclick = () => this.help();
    document.querySelector(".brand").onclick = (e) => {
      e.preventDefault();
      this.leaveRun();
    };
    $("mute").onclick = () => {
      this.sound = !this.sound;
      this.resumeAudio();
      $("mute").innerHTML = this.sound
        ? "♫ <span>Sound on</span>"
        : "♫ <span>Sound off</span>";
    };
    document.addEventListener("keydown", (e) => {
      // Native selects and disclosure widgets own their keyboard actions;
      // don't let Phaser's window-level Space shortcut start/pause a wave.
      if (e.target.closest?.("select") ||
          (e.code === "Space" && e.target.closest?.("summary"))) {
        e.stopPropagation();
        return;
      }
      if (e.key === "Escape" && $("battle-settings").open && $("modal").hidden) {
        e.preventDefault();
        e.stopPropagation();
        $("battle-settings").open = false;
        $("battle-settings").querySelector("summary").focus();
        return;
      }
      if (
        e.key === "Escape" &&
        !$("modal").hidden &&
        (this.helpOpen || this.overlayClose)
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (this.overlayClose) this.overlayClose();
        else this.closeHelp();
      }
    });
    const settings = $("battle-settings");
    document.addEventListener("pointerdown", (e) => {
      if (settings.open && !settings.contains(e.target)) settings.open = false;
    });
    this.menu();
    this.refresh(true);
  }
  hydrateShop() {
    for (const [key, def] of Object.entries(TOWERS))
      document.querySelector(`[data-tower="${key}"] .tower-icon`).innerHTML =
        `<img src="${this.portrait({ type: key, paths: [0, 0, 0] })}" alt="">`;
  }
  portrait(t) {
    const illustrated = towerArtwork(t);
    if (illustrated) return import.meta.env.BASE_URL + illustrated;
    if (this.kingdom) return this.kingdom.portrait(t);
    const p = t.paths.findIndex((n) => n >= 2);
    const key =
      p < 0
        ? `tower-${t.type}-${t.paths.some(Boolean) ? 2 : 1}`
        : `evolution-${t.type}-${p}-${t.paths[p]}`;
    this.portraits ||= {};
    return (this.portraits[key] ||= this.scene?.textures.getBase64(key) || "");
  }
  worldPoint(clientX, clientY, offset = 0) {
    const rect = document
      .querySelector("#game canvas")
      ?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 960,
      y: ((clientY - rect.top - offset) / rect.height) * 640,
      inside:
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY - offset >= rect.top &&
        clientY - offset <= rect.bottom,
    };
  }
  bindDrag() {
    document.querySelectorAll("[data-tower]").forEach((b) => {
      b.addEventListener("pointerdown", (e) => {
        if (b.disabled || this.helpOpen) return;
        this.drag = {
          id: e.pointerId,
          type: b.dataset.tower,
          startX: e.clientX,
          startY: e.clientY,
          moving: false,
        };
        b.setPointerCapture(e.pointerId);
      });
      b.addEventListener("pointermove", (e) => {
        const d = this.drag;
        if (!d || d.id !== e.pointerId) return;
        if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 10)
          d.moving = true;
        if (!d.moving) return;
        this.placing = d.type;
        this.selected = null;
        d.point = this.worldPoint(
          e.clientX,
          e.clientY,
          e.pointerType === "touch" ? 32 : 0,
        );
        this.refresh();
      });
      b.addEventListener("pointerup", (e) => {
        const d = this.drag;
        if (!d) return;
        if (d.moving) {
          this.suppressClick = true;
          const p = this.worldPoint(
            e.clientX,
            e.clientY,
            e.pointerType === "touch" ? 32 : 0,
          );
          if (
            p?.inside &&
            !this.model.paused &&
            !this.inMenu &&
            !this.helpOpen
          ) {
            const tower = this.model.place(d.type, p.x, p.y);
            if (tower) {
              this.placing = null;
              this.selected = tower.id;
              this.upgradeOpen = true;
            }
          } else this.placing = null;
          setTimeout(() => {
            this.suppressClick = false;
          }, 0);
        }
        this.drag = null;
        this.refresh(true);
      });
      b.addEventListener("pointercancel", () => {
        this.drag = null;
        this.cancel();
      });
    });
  }
  resumeAudio() {
    const ctx = this.scene?.sound?.context;
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  }
  tone(event) {
    if (!this.sound || !this.scene?.sound?.context || this.model.paused) return;
    const ctx = this.scene.sound.context;
    if (ctx.state !== "running") return;
    const now = ctx.currentTime;
    if (event.type === "attack" && now - (this.lastTone || 0) < 0.12) return;
    const freq = {
      build: 420,
      upgrade: 660,
      clear: 780,
      end: 520,
      attack: event.tower?.type === "cannon" ? 70 : 240,
    }[event.type];
    if (!freq) return;
    this.lastTone = now;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = event.type === "attack" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + 0.1);
    gain.gain.setValueAtTime(event.type === "attack" ? 0.015 : 0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }
  event(event) {
    this.scene?.effect(event);
    this.tone(event);
    if (event.type === "invalid") this.toast(event.message);
    if (event.type === "clear")
      this.kingdom?.safe(() => {
        this.kingdom.checkpoint();
        this.kingdom.saveBattle();
      });
    if (event.type === "clear")
      this.toast(`Wave ${this.model.wave} cleared · +${event.bonus} gold`);
    if (event.type === "escape")
      this.toast(
        `A visitor got through! −${event.enemy.lives} ${event.enemy.lives === 1 ? "life" : "lives"}`,
      );
    if (event.type === "end") {
      this.placing = null;
      this.result(event.result);
    }
    if (event.type === "sell") {
      this.selected = null;
      this.upgradeOpen = false;
    }
    this.refresh();
  }
  toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("visible");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(
      () => $("toast").classList.remove("visible"),
      2300,
    );
  }
  choose(type) {
    if (this.inMenu || this.model.ended || this.model.paused || this.helpOpen)
      return;
    if (!this.model.available(type)) {
      this.toast("Unlock this tower with Kingdom Crowns.");
      return;
    }
    this.heroMoving = false;
    this.placing = this.placing === type ? null : type;
    this.selected = null;
    this.upgradeOpen = false;
    this.refresh(true);
  }
  selectTower(tower) {
    this.placing = null;
    this.heroMoving = false;
    this.upgradeOpen = true;
    this.selected = tower.id;
    this.refresh(true);
  }
  openUpgrades() {
    if (!this.model.towers.some((t) => t.id === this.selected)) return;
    this.upgradeOpen = true;
    this.refresh(true);
  }
  closeUpgrades() {
    this.upgradeOpen = false;
    this.refresh(true);
  }
  cancel() {
    this.drag = null;
    this.placing = null;
    this.selected = null;
    this.upgradeOpen = false;
    this.heroMoving = false;
    this.refresh(true);
  }
  leaveRun() {
    if (this.inMenu) return;
    const paused = this.model.paused;
    this.model.paused = true;
    this.helpOpen = true;
    this.modal(
      `<div class="eyebrow">TAKE A LITTLE BREAK</div><h1 id="modal-title">Leave this run?</h1><p>Continue later from the last between-wave checkpoint. An unfinished wave restarts without keeping its kills or gold.</p><button id="confirm-leave" class="primary">Save & main menu</button><button id="abandon-battle" class="danger">Abandon battle</button><button id="keep-playing" class="secondary">Keep playing</button>`,
    );
    $("keep-playing").onclick = () => {
      this.helpOpen = false;
      this.model.paused = paused;
      $("modal").hidden = true;
      $("app").inert = false;
      this.refresh(true);
    };
    this.overlayClose = $("keep-playing").onclick;
    $("confirm-leave").onclick = () => {
      this.kingdom?.safe(() => this.kingdom.saveBattle());
      this.helpOpen = false;
      this.cancel();
      this.inMenu = true;
      this.model.reset();
      this.menu();
    };
    $("abandon-battle").onclick = () => {
      this.kingdom?.safe(() => {
        this.kingdom.finishRun();
        this.kingdom.clearBattle();
      });
      this.helpOpen = false;
      this.cancel();
      this.inMenu = true;
      this.model.reset();
      this.menu();
    };
  }
  showTree(t, path = 0) {
    const paused = this.model.paused;
    this.model.paused = true;
    this.helpOpen = true;
    const draw = (p) => {
      this.modal(
        guideHTML(
          t,
          p,
          this.portrait({
            ...t,
            paths: [0, 0, 0].map((n, i) => (i === p ? 3 : 0)),
          }),
        ),
      );
      $("modal").querySelector(".modal-card").classList.add("tree-card");
      document
        .querySelectorAll("[data-guide-path]")
        .forEach((b) => (b.onclick = () => draw(Number(b.dataset.guidePath))));
      $("close-guide").onclick = () => {
        this.helpOpen = false;
        this.model.paused = paused;
        $("modal").hidden = true;
        $("app").inert = false;
        this.refresh(true);
      };
      this.overlayClose = $("close-guide").onclick;
    };
    draw(path);
  }
  beginWave(skipIntro = false) {
    this.kingdom?.safe(() => this.kingdom.saveBattle());
    if (
      this.inMenu ||
      this.helpOpen ||
      this.model.active ||
      this.model.paused ||
      this.model.ended
    )
      return;
    const types = introductionsFor(
      this.model.campaign,
      this.model.wave + 1,
    ).filter((t) => !this.seenEnemies?.has(t));
    if (!skipIntro && types.length) {
      this.helpOpen = true;
      this.modal(
        `<div class="eyebrow">NEXT WAVE · NEW VISITORS</div><h1 id="modal-title">Meet the newcomers</h1><div class="enemy-introductions">${types
          .map((type) => {
            const d = ENEMY_GUIDE[type];
            const key = this.scene?.textures.exists(`enemy-${type}-intact`)
              ? `enemy-${type}-intact`
              : `enemy-${type}`;
            const art = this.scene?.textures.getBase64(key);
            return `<article>${art ? `<img class="enemy-portrait" src="${art}" alt="${d.name}">` : `<span>${d.icon}</span>`}<div><h2>${d.name}</h2><b>${d.ability}</b><p>${d.tip}</p></div></article>`;
          })
          .join(
            "",
          )}</div><button id="intro-ready" class="primary">Ready · start wave ${this.model.wave + 1}</button><button id="intro-back" class="secondary">Prepare my defense</button>`,
      );
      $("modal").querySelector(".modal-card").classList.add("intro-card");
      const close = () => {
        this.helpOpen = false;
        $("modal").hidden = true;
        $("app").inert = false;
      };
      $("intro-back").onclick = () => {
        close();
        this.refresh(true);
      };
      this.overlayClose = $("intro-back").onclick;
      $("intro-ready").onclick = () => {
        this.seenEnemies ||= new Set();
        types.forEach((t) => this.seenEnemies.add(t));
        close();
        this.beginWave(true);
      };
      return;
    }
    if (this.model.startWave()) {
      this.resumeAudio();
      this.toast(
        (this.model.campaign.hints || WAVE_HINTS)[this.model.wave - 1],
      );
      this.refresh(true);
    }
  }
  togglePause() {
    if (this.inMenu || this.model.ended || this.helpOpen) return;
    this.model.paused = !this.model.paused;
    this.refresh(true);
  }
  restart() {
    this.drag = null;
    clearTimeout(this.toastTimer);
    $("toast").classList.remove("visible");
    $("toast").textContent = "";
    this.inMenu = false;
    this.helpOpen = false;
    this.placing = null;
    this.selected = null;
    this.upgradeOpen = false;
    this.seenEnemies = new Set();
    this.kingdom?.beginRun();
    this.model.reset();
    $("modal").hidden = true;
    $("app").inert = false;
    this.refresh(true);
    this.resumeAudio();
  }
  modal(html) {
    this.overlayClose = null;
    $("app").inert = true;
    $("modal").innerHTML = `<div class="modal-card">${html}</div>`;
    $("modal").hidden = false;
    requestAnimationFrame(() => $("modal").querySelector("button")?.focus());
  }
  menu() {
    if (this.kingdom) {
      this.inMenu = true;
      this.helpOpen = false;
      this.placing = null;
      this.kingdom.menu();
      this.refresh(true);
      return;
    }
    this.inMenu = true;
    this.helpOpen = false;
    this.placing = null;
    this.modal(
      `<img class="menu-icon" src="${import.meta.env.BASE_URL}icons/icon-192.png" alt="A friendly blue dragon on a golden castle"><div class="eyebrow">THE EVOLUTION UPDATE</div><h1 id="modal-title">Tiny <span>Siege</span></h1><p>Six towers. Eighteen evolutions. One little kingdom.<br>Build a mighty defense along the Emerald Trail.</p><button id="play" class="primary">PLAY CAMPAIGN <span>→</span></button><button id="menu-help" class="secondary">How to play</button><span class="modal-note">NO DOWNLOADS. JUST A LITTLE STRATEGY.</span>`,
    );
    $("play").onclick = () => this.restart();
    $("menu-help").onclick = () => this.help();
    this.refresh(true);
  }
  help() {
    this.helpOpen = true;
    this.modal(
      `<div class="eyebrow">THE KINGDOM'S FIELD GUIDE</div><h1 id="modal-title" style="font-size:38px">Small towers.<br><span>Big possibilities.</span></h1><ul class="help-list"><li>Tap a tower, then tap grass to build, or drag its icon onto the map. Landscape gives a larger view. Keep the trail clear. Start with an Archer near a bend.</li><li>Defeat enemies to earn gold. Tap a tower to see its range and upgrades, or sell for 70%. Tap outside the panel to tuck it away. Buy three tiers on one path and one tier on a second; the third locks.</li><li>Begin with Archer, Cannon and Frost. Cannons break armor; Frost slows enemies. Win Crowns to unlock Fire, Lightning and Grove, and spend earned tower XP in your Kingdom to unlock higher upgrade tiers. Gold buys those upgrades during battle. Classic starts fully unlocked. Moon Wraiths resist magic.</li><li>Start each wave when you're ready. Finish your selected trail while protecting your 20 lives. Moonlit Marsh ends with the Thorn King.</li><li>Keys <b>1–8</b> choose towers. <b>Esc</b> cancels placement. <b>Space</b> starts a wave or pauses combat.</li></ul><button id="close-help" class="primary">GOT IT <span>→</span></button>`,
    );
    $("close-help").onclick = () => this.closeHelp();
  }
  closeHelp() {
    this.helpOpen = false;
    if (this.inMenu) this.menu();
    else if (this.model.ended) this.result(this.model.ended);
    else {
      $("modal").hidden = true;
      $("app").inert = false;
      $("battle-settings").querySelector("summary").focus();
    }
    this.refresh(true);
  }
  result(result) {
    const win = result === "victory";
    const rewards = this.kingdom?.finishRun();
    this.modal(
      `<div class="crest">${win ? "♛" : "♜"}</div><div class="eyebrow">${win ? "THE KINGDOM STANDS" : "EVERY HERO GETS ANOTHER CHANCE"}</div><h1 id="modal-title">${win ? "A tiny" : "A brave"}<br><span>${win ? "triumph." : "defense."}</span></h1><p>${win ? this.model.campaign.victoryText || "The Thorn King has fallen. Your little towers became legends." : "The trail was overrun. Try covering the bends and upgrading before the next rush."}</p><div class="result-stats"><div><b>${this.model.wave - (win ? 0 : 1)}</b><small>WAVES CLEARED</small></div><div><b>${this.model.kills}</b><small>ENEMIES DEFEATED</small></div><div><b>${this.model.earned}</b><small>GOLD EARNED</small></div></div><button id="again" class="primary">${win ? "PLAY AGAIN" : "TRY AGAIN"} <span>→</span></button><button id="main-menu" class="secondary">Main menu</button>`,
    );
    if (rewards)
      $("again").insertAdjacentHTML(
        "beforebegin",
        `<div class="reward-summary">${rewards}</div>`,
      );
    $("again").onclick = () => this.restart();
    $("main-menu").onclick = () => this.menu();
    this.refresh(true);
  }
  refresh(force = false) {
    if (force) this.fitBattlefield?.();
    const m = this.model,
      key = [
        m.gold,
        m.lives,
        m.wave,
        m.remaining,
        m.active,
        m.paused,
        m.speed,
        m.ended,
        this.selected,
        this.upgradeOpen,
        this.placing,
        this.inMenu,
        m.profile?.unlockedTowers.join(","),
        m.profile
          ? Object.values(m.profile.unlockedUpgrades).flat().join(",")
          : "",
      ].join("|");
    // Boss health changes even when no counters change.
    const boss = m.enemies.find((e) => e.boss && e.alive);
    $("boss-bar").hidden = !boss;
    if (boss)
      $("boss-bar").querySelector("span").textContent =
        `THE THORN KING · PHASE ${boss.phase}`;
    if (boss)
      $("boss-bar").querySelector("i").style.width =
        `${(boss.health / boss.maxHealth) * 100}%`;
    if (!force && key === this.last) return;
    this.last = key;
    $("gold").textContent = m.gold;
    $("lives").textContent = m.lives;
    $("wave").textContent = m.wave;
    document.querySelector(".wave-counter em").textContent =
      ` / ${m.totalWaves}`;
    document.querySelector(".map-label").textContent = m.campaign.name;
    if (this.kingdom) this.kingdom.hud();
    $("remaining").textContent = m.remaining;
    $("pause").disabled = this.inMenu || !!m.ended;
    $("speed").disabled = this.inMenu || !!m.ended;
    $("restart").disabled = this.inMenu;
    $("pause").innerHTML = m.paused
      ? "▶ <span>Resume</span>"
      : "II <span>Pause</span>";
    $("speed").innerHTML = `${m.speed}× <span>Speed</span>`;
    $("pause-shade").hidden = !m.paused;
    $("start-wave").disabled = m.active || m.paused || !!m.ended || this.inMenu;
    $("start-wave").innerHTML = m.ended
      ? "BATTLE COMPLETE"
      : m.active
        ? "WAVE IN PROGRESS"
        : `START WAVE ${m.wave + 1} <span>→</span>`;
    $("wave-hint").textContent =
      m.ended === "victory"
        ? "The little kingdom stands."
        : m.ended === "defeat"
          ? "Regroup. Rebuild. Return."
          : (m.campaign.hints || WAVE_HINTS)[
              Math.min(m.active ? m.wave - 1 : m.wave, m.totalWaves - 1)
            ];
    document.querySelectorAll("[data-tower]").forEach((b) => {
      const type = b.dataset.tower,
        def = TOWERS[type],
        unlocked = m.available(type),
        crowns = UNLOCK_COSTS[type];
      b.querySelector(".tower-cost").textContent = unlocked
        ? def.cost
        : `♛ ${crowns}`;
      b.title = unlocked
        ? `${def.name}: ${def.subtitle}`
        : `Unlock ${def.name} in Kingdom for ${crowns} Crowns`;
      b.setAttribute(
        "aria-label",
        unlocked
          ? `Buy ${def.name}, ${def.cost} gold`
          : `${def.name}, locked · ${crowns} Kingdom Crowns`,
      );
      b.disabled =
        !m.available(b.dataset.tower) ||
        this.inMenu ||
        m.paused ||
        !!m.ended ||
        m.gold < TOWERS[b.dataset.tower].cost;
      b.classList.toggle("selected", this.placing === b.dataset.tower);
      b.setAttribute("aria-pressed", String(this.placing === b.dataset.tower));
    });
    const h = m.hero;
    $("hero-controls").hidden = !h || this.inMenu;
    if (h) {
      $("hero-icon").src = `${import.meta.env.BASE_URL}heroes/${h.type}.svg`;
      $("hero-icon").alt = HEROES[h.type].name;
      $("hero-move").textContent = this.heroMoving
        ? "Cancel move"
        : `${HEROES[h.type].short} · Move`;
      $("hero-ability").textContent =
        h.abilityLeft > 0
          ? `${HEROES[h.type].ability} · ${Math.ceil(h.abilityLeft)}s`
          : HEROES[h.type].ability;
      $("hero-ability").disabled =
        !m.active || m.paused || h.abilityLeft > 0 || !!m.ended;
    }
    const t = m.towers.find((t) => t.id === this.selected),
      panel = $("selection-panel");
    $("tower-inspector").hidden = true;
    if (t) $("range-tower-name").textContent = towerName(t);
    const panelKey = t
      ? [
          t.id,
          ...t.paths,
          ...(m.profile?.unlockedUpgrades[t.type] || []),
          t.targeting,
          m.paused,
          m.ended,
          this.upgradeOpen,
        ].join("|")
      : [this.placing, m.paused, m.ended].join("|");
    const updateAffordability = () => {
      if (t && this.upgradeOpen)
        panel.querySelectorAll("[data-upgrade]").forEach((b) => {
          const u = upgradeState(t, Number(b.dataset.upgrade));
          b.disabled =
            !m.pathAvailable(
              t.type,
              Number(b.dataset.upgrade),
              t.paths[Number(b.dataset.upgrade)] + 1,
            ) ||
            !!u.locked ||
            m.gold < u.cost ||
            !!m.ended ||
            m.paused;
        });
    };
    if (!force && this.lastPanel === panelKey) {
      updateAffordability();
      return;
    }
    const sameTower = panel.dataset.towerId === String(t?.id);
    const scroll = sameTower ? panel.scrollTop : 0;
    const detailsOpen = sameTower && !!panel.querySelector(".properties")?.open;
    this.lastPanel = panelKey;
    panel.dataset.towerId = t?.id || "";
    const visible = (!!t && this.upgradeOpen) || !!this.placing;
    const sizeChanged =
      panel.classList.contains("open") !== visible ||
      panel.classList.contains("placing") !== !!this.placing;
    panel.classList.toggle("open", visible);
    panel.classList.toggle("placing", !!this.placing);
    panel.hidden = !visible;
    if (sizeChanged && this.scene) {
      // refresh() fits against Phaser’s stored parentSize; read the new DOM
      // bounds first so closing/opening a panel never crops the battlefield.
      this.scene.scale.getParentBounds();
      this.scene.scale.refresh();
      this.fitBattlefield?.();
    }
    if (t) {
      const def = TOWERS[t.type],
        stats = towerStats(t);
      panel.innerHTML = `<div class="panel-title"><b>${towerName(t)}</b><button id="close-panel" aria-label="Close tower panel">×</button></div>
        <div class="tower-summary"><img class="tower-portrait" alt="${towerName(t)}" src="${this.portrait(t)}"><div class="stats"><div><small>DAMAGE</small><b>${stats.damage}</b></div><div><small>RANGE</small><b>${stats.range}</b></div><div><small>SHOTS/S</small><b>${(1 / stats.cooldown).toFixed(1)}</b></div></div></div>
        <label class="target-label">Target <select id="targeting" aria-label="Target priority">${["FIRST", "LAST", "STRONG", "WEAK", ...(stats.supportTarget ? ["SUPPORT"] : [])].map((v) => `<option ${t.targeting === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <button id="full-tree" class="tree-link">Full upgrade tree</button>
        <details class="properties"><summary>Armor & special attacks</summary><p>Damage ${stats.damage} · Range ${stats.range} · ${(1 / stats.cooldown).toFixed(1)} attacks/s · ${stats.damageType === "physical" ? "Physical" : "Magic"} · Armor damage ${stats.armorDamage || 0} · Bypass ${Math.round((stats.penetration || stats.bypass || 0) * 100)}%${stats.burn ? ` · Burn ${stats.burn}/s` : ""}${stats.slow ? ` · Slow ${Math.round((1 - stats.slow) * 100)}%` : ""}${stats.pierce ? ` · Pierce ${stats.pierce}` : ""}${stats.chains ? ` · Chain ${stats.chains}` : ""}</p></details>
        <div class="upgrade-paths">${def.paths
          .map((path, p) => {
            const u = upgradeState(t, p);
            const description =
              u.tier?.description ||
              path.tiers[Math.max(0, t.paths[p] - 1)].description;
            return `<div class="path path-${p}"><div class="path-heading"><button class="path-info" data-tree="${p}" aria-label="View ${path.name} full tree"><img class="path-icon" src="${this.portrait({ ...t, paths: [0, 0, 0].map((n, i) => (i === p ? 3 : 0)) })}" alt=""><span>${path.name} (i)</span></button><span aria-label="${t.paths[p]} tiers purchased">${[1, 2, 3].map((n) => `<i class="${t.paths[p] >= n ? "bought" : ""}">${n}</i>`).join("")}</span></div><small class="path-description">${description}</small><button data-upgrade="${p}" class="upgrade-button" ${u.locked || !m.pathAvailable(t.type, p, t.paths[p] + 1) || m.gold < u.cost || m.ended || m.paused ? "disabled" : ""} aria-label="${u.tier?.name || path.name} · ${u.cost || 0} gold">${u.locked || (!m.pathAvailable(t.type, p, t.paths[p] + 1) ? `Unlock Tier ${t.paths[p] + 1} in Kingdom · XP` : `${u.tier.name} · ${u.cost} ◈`)}</button></div>`;
          })
          .join(
            "",
          )}</div><button id="sell" class="sell-button" ${m.ended || m.paused ? "disabled" : ""}>Sell tower · ${Math.floor(t.invested * 0.7)} gold</button>`;
      $("full-tree").onclick = () => this.showTree(t);
      panel
        .querySelectorAll("[data-tree]")
        .forEach(
          (b) => (b.onclick = () => this.showTree(t, Number(b.dataset.tree))),
        );
      $("close-panel").onclick = () => this.closeUpgrades();
      $("targeting").onchange = (e) => {
        m.setTargeting(t.id, e.target.value);
        this.refresh(true);
      };
      panel.querySelectorAll("[data-upgrade]").forEach(
        (b) =>
          (b.onclick = () => {
            m.upgrade(t.id, Number(b.dataset.upgrade));
            this.refresh(true);
          }),
      );
      $("sell").onclick = () => {
        m.sell(t.id);
        this.refresh(true);
      };
      panel.querySelector(".properties").open = detailsOpen;
      panel.scrollTop = scroll;
    } else if (this.placing) {
      const def = TOWERS[this.placing];
      panel.innerHTML = `<div class="empty-selection"><span style="color:${def.hex}">${def.icon}</span><b>Place your ${def.name}</b>Tap grass or drag an icon onto the trail’s green surroundings.<br>Green is good. Red means try elsewhere.</div><button id="cancel" class="cancel-button">Cancel placement · Esc</button>`;
      $("cancel").onclick = () => this.cancel();
    } else
      panel.innerHTML =
        '<div class="empty-selection"><span>⌖</span><b>Every great defense starts small.</b>Choose a tower above to build.<br>Click a tower on the map to upgrade.</div>';
    if (force || sizeChanged) this.fitBattlefield?.(true);
  }
}
