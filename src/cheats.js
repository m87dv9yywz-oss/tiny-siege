// Hidden cheat codes and Easter eggs.
// Access: tap the Tiny Siege logo 5x on the main menu, or tap the gold
// counter 5x during a battle. Never visible in normal play.
const TAP_WINDOW = 3000;
const TAPS_NEEDED = 5;

function trackTaps(el, callback) {
  let taps = 0, timer = null;
  el.addEventListener("click", () => {
    taps++;
    clearTimeout(timer);
    timer = setTimeout(() => (taps = 0), TAP_WINDOW);
    if (taps >= TAPS_NEEDED) {
      taps = 0;
      callback();
    }
  });
}

export function initCheats(ui, getGame) {
  // Logo taps on main menu (event delegation — modal re-renders)
  document.addEventListener("click", (e) => {
    if (e.target.closest(".menu-icon")) {
      const el = e.target.closest(".menu-icon");
      if (!el.dataset.cheatWired) {
        el.dataset.cheatWired = "1";
        trackTaps(el, () => showCheatPanel(ui, getGame));
      }
    }
    if (e.target.closest("#gold")) {
      const el = e.target.closest("#gold");
      if (!el.dataset.cheatWired) {
        el.dataset.cheatWired = "1";
        trackTaps(el, () => showCheatPanel(ui, getGame));
      }
    }
  });
}

function showCheatPanel(ui, getGame) {
  const game = getGame();
  const inBattle = game && !game.ended;
  ui.modal(`
    <div class="eyebrow">SHHH… SECRET</div>
    <h1 id="modal-title">Cheat Codes</h1>
    <p>For testing and for fun. Nobody will tell.</p>
    <button id="cheat-gold" class="primary" ${inBattle ? "" : "disabled"}>+10,000 Gold</button>
    <button id="cheat-waves" class="primary" ${inBattle ? "" : "disabled"}>+10 Waves</button>
    <button id="cheat-jackson" class="secondary">🎆 Jackson</button>
    <button id="cheat-luke" class="secondary">🎆 Luke</button>
    <button id="cheat-close" class="secondary">Close</button>
  `);
  if (inBattle) {
    document.getElementById("cheat-gold").onclick = () => {
      game.gold += 10000;
      ui.refresh(true);
      ui.toast("+10,000 gold ✨");
      ui.closeModal();
    };
    document.getElementById("cheat-waves").onclick = () => {
      const target = Math.min(game.wave + 10, game.totalWaves);
      // Clear the battlefield and park just before the target wave.
      game.enemies = [];
      game.projectiles = [];
      game.queue = [];
      game.active = false;
      game.wave = target - 1;
      ui.refresh(true);
      ui.toast(
        target >= game.totalWaves
          ? `Jumped to the final wave!`
          : `Jumped to wave ${target}!`
      );
      ui.closeModal();
    };
  }
  document.getElementById("cheat-jackson").onclick = () => {
    ui.closeModal();
    skyWrite("JACKSON");
  };
  document.getElementById("cheat-luke").onclick = () => {
    ui.closeModal();
    skyWrite("LUKE");
  };
  document.getElementById("cheat-close").onclick = () => ui.closeModal();
}

// Golden firework letters across the sky, temporary.
export function skyWrite(name) {
  const overlay = document.createElement("div");
  overlay.className = "skywriting";
  overlay.innerHTML = name
    .split("")
    .map((c, i) => `<span style="animation-delay:${i * 0.15}s">${c}</span>`)
    .join("");
  document.getElementById("app").appendChild(overlay);
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
