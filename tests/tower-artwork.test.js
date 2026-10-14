import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  ARCHER_STATES,
  artworkState,
  towerArtwork,
} from "../src/towerArtwork.js";
import { towerTexture, towerStats } from "../src/data/towers.js";
test("all 25 legal Archer combinations map to the 16 supplied images, without changing gameplay", () => {
  let legal = 0,
    fallbacks = 0;
  for (let a = 0; a <= 3; a++)
    for (let b = 0; b <= 3; b++)
      for (let c = 0; c <= 3; c++) {
        const paths = [a, b, c];
        if (
          paths.filter((n) => n > 0).length > 2 ||
          paths.filter((n) => n > 1).length > 1
        )
          continue;
        legal++;
        const state = artworkState(paths);
        assert(ARCHER_STATES.includes(state));
        if (paths.includes(3)) {
          fallbacks++;
          assert.equal(state, paths.map((n) => Math.min(n, 2)).join("-"));
          assert.notDeepEqual(
            towerStats({ type: "archer", paths }),
            towerStats({
              type: "archer",
              paths: paths.map((n) => Math.min(n, 2)),
            }),
          );
        }
        for (const use of ["card_512", "battlefield_256"])
          assert(
            existsSync(
              "public/" + towerArtwork({ type: "archer", paths }, use),
            ),
          );
        assert.equal(
          towerTexture({ type: "archer", paths }),
          "v5-archer-" + state,
        );
      }
  assert.equal(legal, 25);
  assert.equal(fallbacks, 9);
});
test("invalid or unsupported artwork states fall back safely; other towers keep V4 textures", () => {
  for (const p of [null, [], [1, 1, 1], [2, 2, 0], [4, 0, 0], ["1", 0, 0]])
    assert.equal(artworkState(p), "0-0-0");
  assert.equal(towerArtwork({ type: "cannon", paths: [2, 1, 0] }), null);
  assert.equal(
    towerTexture({ type: "cannon", paths: [2, 1, 0] }),
    "evolution-cannon-0-2",
  );
  const m = JSON.parse(
    readFileSync("public/assets/v5/towers/archer/manifest.json"),
  );
  for (const state of ARCHER_STATES)
    for (const [folder, size] of [
      ["card_512", 512],
      ["battlefield_256", 256],
    ]) {
      const png = readFileSync(
        `public/assets/v5/towers/archer/${folder}/archer_${state}.png`,
      );
      assert.equal(png.readUInt32BE(16), size);
      assert.equal(png.readUInt32BE(20), size);
      assert.equal(png[25], 6);
      assert(m.states[state]);
    }
});
