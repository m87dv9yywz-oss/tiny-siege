// Hidden cheat codes and Easter eggs.
// Access: tap the Tiny Siege logo 5x on the main menu, or tap the gold
// counter 5x during a battle. Never visible in normal play.
const TAP_WINDOW = 3000;
const TAPS_NEEDED = 5;

export function initCheats(ui, getGame) {
  // One delegated listener: elements are re-rendered often, so count taps
  // centrally. All five taps must fit within the deliberate secret gesture.
  const counters = new Map();
  const count = (key) => {
    const now = Date.now();
    const c = counters.get(key);
    if (!c || now - c.started > TAP_WINDOW) counters.set(key, { n: 1, started: now });
    else {
      c.n++;
    }
    if (counters.get(key).n >= TAPS_NEEDED) {
      counters.delete(key);
      showCheatPanel(ui, getGame);
    }
  };
  document.addEventListener("click", (e) => {
    if (e.target.closest(".menu-icon")) count("logo");
    else if (e.target.closest("#gold")) count("gold");
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
  const confirm = kind => {
    ui.modal(`<h1 id="modal-title">${kind === "gold" ? "Add 10,000 gold?" : "Skip ahead 10 waves?"}</h1>
      <p>${game.campaign.id === "classic" ? "Apply this code to your Classic practice battle?" : kind === "gold" ? "Play this adventure just for fun? No Crowns, XP, achievements or new checkpoint will be saved. Your normal checkpoint stays safe. Refreshing returns to that checkpoint." : "Skipped waves earn no gold or XP. Waves you play still count — and if you play the final waves and win, the adventure still completes."}</p>
      <button id="cancel-cheat" class="primary">Cancel</button><button id="confirm-cheat" class="danger">${kind === "gold" ? "Yes, add gold" : "Yes, skip waves"}</button>`);
    ui.overlayClose = close;
    document.getElementById("cancel-cheat").onclick = close;
    document.getElementById("confirm-cheat").onclick = () => {
      if (kind === "gold") {
        if (game.campaign.id !== "classic" && !ui.kingdom.practice) {
          ui.kingdom.safe(() => ui.kingdom.saveBattle());
          ui.kingdom.practice = true;
        }
        game.gold += 10000;
        close();
        ui.toast("Just for fun! Your normal progress stays safe.");
        return;
      }
      // Wave skip: the run stays real. Skipped waves are recorded so reward
      // math only ever credits waves the player actually played.
      const target = Math.min(game.wave + 10, game.totalWaves);
      game.skippedWaves =
        (game.skippedWaves || 0) + Math.max(0, target - 1 - game.wave);
      game.enemies = []; game.projectiles = []; game.queue = []; game.zones = [];
      game.active = false; game.waveTime = 0; game.wave = target - 1;
      close();
      ui.toast(
        game.campaign.id === "classic"
          ? "Skipped ahead!"
          : "Skipped ahead — skipped waves earn nothing.",
      );
    };
  };
  ui.modal(`<div class="eyebrow">A LITTLE SECRET</div><h1 id="modal-title">Fun codes</h1>
    <p>Nothing happens until you choose and confirm a code.</p>
    <button id="cheat-gold" class="primary" ${inBattle ? "" : "disabled"}>+10,000 Gold</button>
    <button id="cheat-waves" class="primary" ${inBattle ? "" : "disabled"}>+10 Waves</button>
    <button id="cheat-jackson" class="secondary">🎆 Jackson</button>
    <button id="cheat-luke" class="secondary">🎆 Luke</button>
    <button id="cheat-close" class="secondary">Close</button>`);
  ui.overlayClose = close;
  document.getElementById("cheat-gold").onclick = () => confirm("gold");
  document.getElementById("cheat-waves").onclick = () => confirm("waves");
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
