// Hidden cheat codes and Easter eggs.
// Access: tap the Tiny Siege logo 5x on the main menu, or tap the gold
// pill 5x during a battle. Never visible in normal play.
// Reliability notes (owner's phone report, 2026-10-17): the old trigger
// counted only taps landing exactly on the gold NUMBER (not the coin,
// label or pill), used delayed click events, and required all five
// taps inside one strict 3s window with no feedback — sequences kept
// expiring invisibly. Now: the whole pill counts, taps are counted on
// pointerdown, each tap only has to follow the previous within a
// rolling gap, and every counted tap pulses the target so the player
// can see the gesture registering.
// Owner's rule (2026-10-15): codes are just for fun and carry NO penalty —
// the 5-tap gesture is the safeguard, codes apply the moment they are
// tapped (no warning/confirmation screen), and a gold code leaves the run
// fully real: XP, Crowns, achievements, completion and checkpoints all
// count exactly as if the gold had been earned. The one exception is the
// wave skip: skipped waves themselves earn nothing, while every wave the
// player actually plays counts in full.
const TAP_GAP = 2500;
const TAPS_NEEDED = 5;

export function initCheats(ui, getGame) {
  // One delegated listener: elements are re-rendered often, so count taps
  // centrally. Rolling window: each tap must follow the previous one
  // within TAP_GAP — a natural tapping pace never expires mid-gesture.
  const counters = new Map();
  const count = (key, el) => {
    const now = Date.now();
    const c = counters.get(key);
    if (!c || now - c.last > TAP_GAP) counters.set(key, { n: 1, last: now });
    else {
      c.n++;
      c.last = now;
    }
    const n = counters.get(key).n;
    if (el) {
      el.classList.remove("cheat-pulse");
      void el.offsetWidth;
      el.style.setProperty("--cheat-n", n);
      el.classList.add("cheat-pulse");
    }
    if (n >= TAPS_NEEDED) {
      counters.delete(key);
      showCheatPanel(ui, getGame);
    }
  };
  document.addEventListener("pointerdown", (e) => {
    const logo = e.target.closest(".menu-icon");
    if (logo) return count("logo", logo);
    const pill = e.target.closest(".resource.gold") || e.target.closest("#gold");
    if (pill) count("gold", pill);
  });
}

function showCheatPanel(ui, getGame) {
  const game = getGame();
  const inBattle = game && !ui.inMenu && !game.ended;
  const paused = game.paused;
  const helpOpen = ui.helpOpen;
  game.paused = true;
  ui.helpOpen = true;
  const close = () => {
    game.paused = paused;
    ui.helpOpen = helpOpen;
    if (ui.inMenu) ui.menu();
    else ui.closeModal();
  };
  const applyGold = () => {
    game.gold += 10000;
    close();
    ui.toast("+10,000 gold — and the adventure still counts!");
  };
  const applyWaves = () => {
    // Skip a full 10 waves: the wave counter advances by 10 and the player
    // plays the wave after that. Near the end the skip lands ON the final
    // wave instead, so the player always plays the ending themselves.
    const target = Math.min(
      game.wave + 10,
      Math.max(game.wave, game.totalWaves - 1),
    );
    const skipped = Math.max(0, target - game.wave);
    if (!skipped) {
      close();
      ui.toast("You are already at the final wave — finish it!");
      return;
    }
    // Skipped waves are recorded so reward math only ever credits waves
    // the player actually played.
    game.skippedWaves = (game.skippedWaves || 0) + skipped;
    game.enemies = [];
    game.projectiles = [];
    game.queue = [];
    game.zones = [];
    game.active = false;
    game.waveTime = 0;
    game.wave = target;
    close();
    ui.toast(
      `Skipped ahead ${skipped} ${skipped === 1 ? "wave" : "waves"} — played waves still count.`,
    );
  };
  ui.modal(`<div class="eyebrow">A LITTLE SECRET</div><h1 id="modal-title">Fun codes</h1>
    <p>Codes work right away, and your progress still counts. Only skipped waves earn nothing.</p>
    <button id="cheat-gold" class="primary" ${inBattle ? "" : "disabled"}>+10,000 Gold</button>
    <button id="cheat-waves" class="primary" ${inBattle ? "" : "disabled"}>+10 Waves</button>
    <button id="cheat-jackson" class="secondary">🎆 Jackson</button>
    <button id="cheat-luke" class="secondary">🎆 Luke</button>
    <button id="cheat-close" class="secondary">Close</button>`);
  ui.overlayClose = close;
  document.getElementById("cheat-gold").onclick = applyGold;
  document.getElementById("cheat-waves").onclick = applyWaves;
  for (const [id, name] of [["jackson", "JACKSON"], ["luke", "LUKE"]])
    document.getElementById(`cheat-${id}`).onclick = () => { close(); skyWrite(name); };
  document.getElementById("cheat-close").onclick = close;
}

// Golden firework letters across the sky, temporary.
export function skyWrite(name) {
  const overlay = document.createElement("div");
  overlay.className = "skywriting";
  overlay.innerHTML = name
    .split("")
    .map((c, i) => `<span style="animation-delay:${i * 0.15}s">${c}</span>`)
    .join("");
  const old = document.querySelectorAll(".skywriting");
  if (old.length >= 2) old[0].remove();
  document.body.appendChild(overlay);
  // Firework sparkles
  for (let i = 0; i < 40; i++) {
    const s = document.createElement("div");
    s.className = "sky-spark";
    s.style.left = `${10 + Math.random() * 80}%`;
    s.style.top = `${20 + Math.random() * 40}%`;
    s.style.animationDelay = `${Math.random() * 1.5}s`;
    overlay.appendChild(s);
  }
  setTimeout(() => overlay.remove(), 6000);
}
