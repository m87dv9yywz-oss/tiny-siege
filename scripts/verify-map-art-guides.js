// Validate the committed reference package without changing game/guide files.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { createServer } from "node:http";
import assert from "node:assert/strict";
import { TRAILS, OBSTACLES } from "../src/data/map.js";
import { Game } from "../src/systems/Game.js";
import { chromium } from "@playwright/test";
const root = "docs/artwork/map-art-reference";
const data = JSON.parse(readFileSync(root + "/geometry.json"));
const manifest = JSON.parse(readFileSync(root + "/manifest.json"));
assert.deepEqual(Object.keys(data.maps).sort(), Object.keys(TRAILS).sort());
assert.equal(Object.keys(data.maps).length, 7);
for (const [file, hash] of Object.entries(manifest.sources))
  assert.equal(
    createHash("sha256").update(readFileSync(file)).digest("hex"),
    hash,
  );
let samples = 0,
  pngs = 0;
const base = resolve(root);
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url, "http://localhost").pathname,
  );
  const file = resolve(
    base,
    "." + (pathname === "/" ? "/gallery.html" : pathname),
  );
  if (!file.startsWith(base + "/")) {
    response.writeHead(403).end();
    return;
  }
  try {
    const bytes = readFileSync(file);
    response.setHeader(
      "Content-Type",
      file.endsWith(".png")
        ? "image/png"
        : file.endsWith(".html")
          ? "text/html; charset=utf-8"
          : "text/plain",
    );
    response.end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_USE_BUNDLED
    ? {}
    : { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] },
);
try {
  const page = await browser.newPage();
  for (const [id, geometry] of Object.entries(data.maps)) {
    assert.deepEqual(geometry.points, TRAILS[id].PATH);
    assert.deepEqual(geometry.segments, TRAILS[id].SEGMENTS);
    assert.deepEqual(geometry.obstacles, OBSTACLES[id] || []);
    const game = new Game(() => {}, { map: id });
    for (const [file, meta] of Object.entries(manifest.maps[id].files)) {
      const bytes = readFileSync(root + "/" + file);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        meta.sha256,
      );
      assert.deepEqual(
        [bytes.readUInt32BE(16), bytes.readUInt32BE(20)],
        meta.dimensions,
      );
      pngs++;
    }
    for (const scale of [1, 2]) {
      const file = `${root}/${id}-valid-centers-${960 * scale}x${640 * scale}.png`;
      const grid = await page.evaluate(
        async ({ png, scale }) => {
          const image = new Image();
          image.src = "data:image/png;base64," + png;
          await image.decode();
          const c = document.createElement("canvas");
          c.width = image.width;
          c.height = image.height;
          c.getContext("2d").drawImage(image, 0, 0);
          const rgba = c
              .getContext("2d")
              .getImageData(0, 0, c.width, c.height).data,
            result = [];
          for (let y = 0; y < c.height; y += 17)
            for (let x = 0; x < c.width; x += 19) {
              const value = rgba[(y * c.width + x) * 4];
              if (value !== 0 && value !== 255)
                throw Error("Mask must be binary");
              result.push({ x, y, valid: value === 255 });
            }
          return result;
        },
        { png: readFileSync(file).toString("base64"), scale },
      );
      for (const p of grid) {
        assert.equal(
          p.valid,
          game.canPlace("archer", (p.x + 0.5) / scale, (p.y + 0.5) / scale) ===
            null,
          `${id} ${scale}x pixel ${p.x},${p.y}`,
        );
        samples++;
      }
    }
  }
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const layer of ["guide", "painted-path", "valid-centers"])
    for (const resolution of ["960x640", "1920x1280"]) {
      await page.locator("#layer").selectOption(layer);
      await page.locator("#resolution").selectOption(resolution);
      const sizes = await page
        .locator("article img")
        .evaluateAll(async (imgs) => {
          await Promise.all(imgs.map((i) => i.decode()));
          return imgs.map((i) => [i.naturalWidth, i.naturalHeight]);
        });
      assert.equal(sizes.length, 7);
      for (const size of sizes)
        assert.deepEqual(size, resolution.split("x").map(Number));
    }
  assert.deepEqual(errors, []);
  assert.equal(pngs, 42);
  console.log(
    `Verified seven exact map geometries, ${pngs} PNG dimensions/checksums, ${samples} actual Game.canPlace pixel samples, and every offline gallery layer/resolution.`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
