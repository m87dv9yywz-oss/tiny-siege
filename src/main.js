import Phaser from "phaser";
import "./style.css";
import { Game } from "./systems/Game.js";
import { GameScene } from "./scenes/GameScene.js";
import { UI } from "./ui.js";
let ui;
const model = new Game((event) => ui?.event(event));
ui = new UI(model);
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
// Local browser tests can inspect the simulation without shipping a production cheat API.
if (import.meta.env.DEV) window.__tinySiege = { model, ui, game };
