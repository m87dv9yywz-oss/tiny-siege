import Phaser from "phaser";
import "./style.css";
import { Game } from "./systems/Game.js";
import { GameScene } from "./scenes/GameScene.js";
import { ProfileStore } from "./progression/profiles.js";
import { KingdomUI } from "./progression/KingdomUI.js";
import { UI } from "./ui.js";
import { fitBattlefield } from "./viewport.js";
import { initCheats } from "./cheats.js";
// The game is played at a fixed scale: swallow browser zoom gestures
// (iOS pinch "gesture" events, double-tap double-clicks, two-finger moves)
// so frantic tapping mid-round can never zoom the page and strand the player.
for (const ev of ["gesturestart", "gesturechange", "gestureend"])
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener("dblclick", (e) => e.preventDefault(), {
  passive: false,
});
document.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);
let ui;
const model = new Game((event) => ui?.event(event));
const profiles = new ProfileStore(localStorage);
const kingdom = new KingdomUI(model, profiles);
ui = new UI(model, kingdom);
ui.fitBattlefield = fitBattlefield(ui);
for (const id of ["mute", "effects"])
  document
    .getElementById(id)
    .addEventListener("click", () => kingdom.saveSettings());
// Restore a parent session once; no per-frame database reads.
setTimeout(() => kingdom.loadCloud().catch(() => {}), 1000);
const game = new Phaser.Game({
  // The illustrated scene uses Canvas-supported primitives and particles.
  // Canvas avoids slow/blank software WebGL frames and keeps touch rendering
  // consistent without changing Phaser or the simulation.
  type: Phaser.CANVAS,
  parent: "game",
  width: 960,
  height: 640,
  backgroundColor: "#76a77a",
  render: { antialias: true, roundPixels: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [new GameScene(model, ui)],
});
initCheats(ui, () => model);
 // Local browser tests can inspect the simulation without shipping a production cheat API.
if (import.meta.env.DEV)
  window.__tinySiege = { model, ui, game, profiles, kingdom };
