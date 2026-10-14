// Reference-only: read the actual sampled routes/rules, never alter game source.
import { TRAILS, MAP, OBSTACLES } from "../src/data/map.js";
import { Game } from "../src/systems/Game.js";
import { CAMPAIGNS } from "../src/data/waves.js";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const output = "docs/artwork/map-art-reference";
mkdirSync(output, { recursive: true });
const art = readFileSync("src/scenes/art.js", "utf8");
const strokeBlock = art.slice(
  art.indexOf("const line = (width, color, offset = 0)"),
  art.indexOf("for (let i = 5; i < PATH.length"),
);
const strokes = [
  ...strokeBlock.matchAll(/line\((\d+), (0x[0-9a-f]+)(?:, (\d+))?\);/g),
].map((m) => ({
  width: Number(m[1]),
  color: parseInt(m[2]),
  offset: Number(m[3] || 0),
}));
assert.deepEqual(
  strokes.map((s) => [s.width, s.offset]),
  [
    [56, 4],
    [51, 0],
    [43, 0],
    [33, 0],
  ],
  "Review changed renderer widths before exporting",
);
const hash = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const data = {
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  sources: Object.fromEntries(
    ["src/data/map.js", "src/systems/Game.js", "src/scenes/art.js"].map((p) => [
      p,
      hash(p),
    ]),
  ),
  world: MAP,
  strokes,
  placement: {
    bounds: [30, 60, 930, 610],
    pathClearance: MAP.pathWidth / 2 + MAP.towerRadius,
    obstaclePadding: MAP.towerRadius,
    towerSpacing: 52,
  },
  maps: {},
};
for (const [id, trail] of Object.entries(TRAILS)) {
  const game = new Game(() => {}, { map: id });
  assert.equal(game.trail, trail);
  const samples = [];
  // Cross-check exported vector masks against the real validator, at both raster scales.
  for (const scale of [1, 2])
    for (let y = 0; y < 640 * scale; y += 17)
      for (let x = 0; x < 960 * scale; x += 19) {
        const worldX = (x + 0.5) / scale,
          worldY = (y + 0.5) / scale;
        samples.push({
          scale,
          x,
          y,
          valid: game.canPlace("archer", worldX, worldY) === null,
        });
      }
  const arrows = [];
  for (let d = 60; d < trail.PATH_LENGTH; d += 140)
    arrows.push(trail.onPath(d));
  data.maps[id] = {
    name: CAMPAIGNS[id].name,
    points: trail.PATH,
    segments: trail.SEGMENTS,
    length: trail.PATH_LENGTH,
    spawn: trail.PATH[0],
    end: trail.PATH.at(-1),
    obstacles: OBSTACLES[id] || [],
    arrows,
    validatorSamples: samples,
  };
}
writeFileSync(output + "/geometry.json", JSON.stringify(data, null, 2) + "\n");
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_USE_BUNDLED
    ? {}
    : { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] },
);
try {
  const page = await browser.newPage();
  await page.setContent('<div id="renderer"></div>');
  await page.addScriptTag({ path: "node_modules/phaser/dist/phaser.js" });
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        new Phaser.Game({
          type: Phaser.CANVAS,
          width: 960,
          height: 640,
          transparent: true,
          parent: "renderer",
          audio: { noAudio: true },
          banner: false,
          scene: {
            create() {
              window.guideScene = this;
              resolve();
            },
          },
        });
      }),
  );
  for (const [id, map] of Object.entries(data.maps))
    for (const scale of [1, 2]) {
      const png = await page.evaluate(
        ({ points, strokes, scale, id }) => {
          const scene = window.guideScene,
            g = scene.make.graphics({ x: 0, y: 0, add: false });
          g.scaleCanvas(scale, scale);
          for (const s of strokes) {
            g.lineStyle(s.width, s.color, 1);
            g.beginPath();
            g.moveTo(points[0].x, points[0].y + s.offset);
            for (const p of points.slice(1)) g.lineTo(p.x, p.y + s.offset);
            g.strokePath();
          }
          const key = `guide-${id}-${scale}`;
          g.generateTexture(key, 960 * scale, 640 * scale);
          const url = scene.textures
            .get(key)
            .getSourceImage()
            .toDataURL("image/png");
          g.destroy();
          scene.textures.remove(key);
          return url.split(",")[1];
        },
        { points: map.points, strokes, scale, id },
      );
      writeFileSync(
        `${output}/${id}-painted-path-${960 * scale}x${640 * scale}.png`,
        Buffer.from(png, "base64"),
      );
    }
} finally {
  await browser.close();
}
execFileSync("python", ["scripts/render-map-art-guides.py"], {
  stdio: "inherit",
});
