import { TOWERS } from "./data/towers.js";
import { WAVE_HINTS } from "./data/waves.js";
const $ = (id) => document.getElementById(id);
export class UI {
  constructor(model) {
    this.model = model;
    this.inMenu = true;
    this.helpOpen = false;
    this.placing = null;
    this.selected = null;
    this.sound = false;
    this.last = "";
    $("tower-shop").innerHTML = Object.entries(TOWERS)
      .map(
        ([key, t], i) =>
          `<button class="tower-card" data-tower="${key}" style="--tower-color:${t.hex}" aria-label="Buy ${t.name}, ${t.cost} gold"><span class="key">${i + 1}</span><span class="tower-icon">${t.icon}</span><span><b>${t.name}</b><small>${t.subtitle}</small></span><span class="tower-cost"><span>◈</span>${t.cost}</span></button>`,
      )
      .join("");
    document
      .querySelectorAll("[data-tower]")
      .forEach((b) => (b.onclick = () => this.choose(b.dataset.tower)));
    $("start-wave").onclick = () => this.beginWave();
    $("pause").onclick = () => this.togglePause();
    $("speed").onclick = () => {
      this.model.speed = this.model.speed === 1 ? 2 : 1;
      this.refresh(true);
    };
    $("restart").onclick = () => this.restart();
    $("help-button").onclick = () => this.help();
    document.querySelector(".brand").onclick = (e) => {
      e.preventDefault();
      this.menu();
    };
    $("mute").onclick = () => {
      this.sound = !this.sound;
      this.resumeAudio();
      $("mute").innerHTML = this.sound
        ? "♫ <span>Sound on</span>"
        : "♫ <span>Sound off</span>";
    };
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.helpOpen) this.closeHelp();
    });
    this.menu();
    this.refresh(true);
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
      this.toast(`Wave ${this.model.wave} cleared · +${event.bonus} gold`);
    if (event.type === "escape")
      this.toast(
        `A visitor got through! −${event.enemy.lives} ${event.enemy.lives === 1 ? "life" : "lives"}`,
      );
    if (event.type === "end") {
      this.placing = null;
      this.result(event.result);
    }
    if (event.type === "sell") this.selected = null;
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
    this.placing = this.placing === type ? null : type;
    this.selected = null;
    this.refresh(true);
  }
  cancel() {
    this.placing = null;
    this.selected = null;
    this.refresh(true);
  }
  beginWave() {
    if (this.inMenu || this.helpOpen) return;
    if (this.model.startWave()) {
      this.resumeAudio();
      this.refresh(true);
    }
  }
  togglePause() {
    if (this.inMenu || this.model.ended || this.helpOpen) return;
    this.model.paused = !this.model.paused;
    this.refresh(true);
  }
  restart() {
    clearTimeout(this.toastTimer);
    $("toast").classList.remove("visible");
    $("toast").textContent = "";
    this.inMenu = false;
    this.helpOpen = false;
    this.placing = null;
    this.selected = null;
    this.model.reset();
    $("modal").hidden = true;
    $("app").inert = false;
    this.refresh(true);
    this.resumeAudio();
  }
  modal(html) {
    $("app").inert = true;
    $("modal").innerHTML = `<div class="modal-card">${html}</div>`;
    $("modal").hidden = false;
    requestAnimationFrame(() => $("modal").querySelector("button")?.focus());
  }
  menu() {
    this.inMenu = true;
    this.helpOpen = false;
    this.placing = null;
    this.modal(
      `<div class="crest">♜</div><div class="eyebrow">A LITTLE KINGDOM NEEDS A HERO</div><h1 id="modal-title">Tiny <span>Siege</span></h1><p>Five towers. Twenty waves. One little kingdom.<br>Build a mighty defense along the Emerald Trail.</p><button id="play" class="primary">PLAY CAMPAIGN <span>→</span></button><button id="menu-help" class="secondary">How to play</button><span class="modal-note">NO DOWNLOADS. JUST A LITTLE STRATEGY.</span>`,
    );
    $("play").onclick = () => this.restart();
    $("menu-help").onclick = () => this.help();
    this.refresh(true);
  }
  help() {
    this.helpOpen = true;
    this.modal(
      `<div class="eyebrow">THE KINGDOM'S FIELD GUIDE</div><h1 id="modal-title" style="font-size:38px">Small towers.<br><span>Big possibilities.</span></h1><ul class="help-list"><li>Choose a tower, then click on grass to build. Keep the trail clear. Start with an Archer near a bend.</li><li>Defeat enemies to earn gold. Click a built tower to upgrade or sell it for 70% of your investment.</li><li>Mix splash damage, fire, and lightning with Frost to slow the march. Magic ignores armor.</li><li>Start each wave when you're ready. Protect your 20 lives through wave 20 and defeat the Thorn King.</li><li>Keys <b>1–5</b> choose towers. <b>Esc</b> cancels placement. <b>Space</b> starts a wave or pauses combat.</li></ul><button id="close-help" class="primary">GOT IT <span>→</span></button>`,
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
      $("help-button").focus();
    }
    this.refresh(true);
  }
  result(result) {
    const win = result === "victory";
    this.modal(
      `<div class="crest">${win ? "♛" : "♜"}</div><div class="eyebrow">${win ? "THE KINGDOM STANDS" : "EVERY HERO GETS ANOTHER CHANCE"}</div><h1 id="modal-title">${win ? "A tiny" : "A brave"}<br><span>${win ? "triumph." : "defense."}</span></h1><p>${win ? "The Thorn King has fallen. Your little towers became legends." : "The trail was overrun. Try covering the bends and upgrading before the next rush."}</p><div class="result-stats"><div><b>${this.model.wave - (win ? 0 : 1)}</b><small>WAVES CLEARED</small></div><div><b>${this.model.kills}</b><small>ENEMIES DEFEATED</small></div><div><b>${this.model.earned}</b><small>GOLD EARNED</small></div></div><button id="again" class="primary">${win ? "PLAY AGAIN" : "TRY AGAIN"} <span>→</span></button><button id="main-menu" class="secondary">Main menu</button>`,
    );
    $("again").onclick = () => this.restart();
    $("main-menu").onclick = () => this.menu();
    this.refresh(true);
  }
  refresh(force = false) {
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
        this.placing,
        this.inMenu,
      ].join("|");
    // Boss health changes even when no counters change.
    const boss = m.enemies.find((e) => e.type === "boss" && e.alive);
    $("boss-bar").hidden = !boss;
    if (boss)
      $("boss-bar").querySelector("i").style.width =
        `${(boss.health / boss.maxHealth) * 100}%`;
    if (!force && key === this.last) return;
    this.last = key;
    $("gold").textContent = m.gold;
    $("lives").textContent = m.lives;
    $("wave").textContent = m.wave;
    $("remaining").textContent = m.remaining;
    $("pause").disabled = this.inMenu || !!m.ended;
    $("speed").disabled = this.inMenu || !!m.ended;
    $("restart").disabled = this.inMenu;
    $("pause").innerHTML = m.paused
      ? "▶ <span>Resume</span>"
      : "Ⅱ <span>Pause</span>";
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
          : WAVE_HINTS[Math.min(m.active ? m.wave - 1 : m.wave, 19)];
    document.querySelectorAll("[data-tower]").forEach((b) => {
      b.disabled =
        this.inMenu ||
        m.paused ||
        !!m.ended ||
        m.gold < TOWERS[b.dataset.tower].cost;
      b.classList.toggle("selected", this.placing === b.dataset.tower);
      b.setAttribute("aria-pressed", String(this.placing === b.dataset.tower));
    });
    const t = m.towers.find((t) => t.id === this.selected),
      panel = $("selection-panel");
    if (t) {
      const def = TOWERS[t.type],
        stats = def.levels[t.level - 1],
        cost = def.upgrades[t.level - 1];
      panel.innerHTML = `<div class="panel-title"><b>${def.name}</b><span>LEVEL ${t.level} / 3</span></div><div class="stats"><div><small>DAMAGE</small><b>${stats.damage}</b></div><div><small>RANGE</small><b>${stats.range}</b></div><div><small>SHOTS / S</small><b>${(1 / stats.cooldown).toFixed(1)}</b></div></div><div class="upgrade-description">${t.level === 3 ? "A masterwork. Your kingdom is in good hands." : def.descriptions[t.level - 1]}</div><button id="upgrade" class="upgrade-button" ${t.level === 3 || m.gold < cost || m.ended || m.paused ? "disabled" : ""}>${t.level === 3 ? "FULLY UPGRADED" : `✧ Upgrade · ${cost} gold`}</button><button id="sell" class="sell-button" ${m.ended || m.paused ? "disabled" : ""}>Sell tower · ${Math.floor(t.invested * 0.7)} gold</button>`;
      $("upgrade").onclick = () => {
        m.upgrade(t.id);
        this.refresh(true);
      };
      $("sell").onclick = () => {
        m.sell(t.id);
        this.refresh(true);
      };
    } else if (this.placing) {
      const def = TOWERS[this.placing];
      panel.innerHTML = `<div class="empty-selection"><span style="color:${def.hex}">${def.icon}</span><b>Place your ${def.name}</b>Click the grass beside the trail.<br>Green is good. Red means try elsewhere.</div><button id="cancel" class="cancel-button">Cancel placement · Esc</button>`;
      $("cancel").onclick = () => this.cancel();
    } else
      panel.innerHTML =
        '<div class="empty-selection"><span>⌖</span><b>Every great defense starts small.</b>Choose a tower above to build.<br>Click a tower on the map to upgrade.</div>';
  }
}
