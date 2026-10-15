import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  ARCHER_STATES,
  TOWER_STATES,
  TOWER_TYPES,
  artworkState,
  towerArtwork,
} from "../src/towerArtwork.js";
import { towerTexture, towerStats } from "../src/data/towers.js";

test("all 25 legal states map to real illustrated art for every tower, without changing gameplay", () => {
  let legal = 0;
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
        assert(TOWER_STATES.includes(state));
        // No fallbacks: Tier 3 has real art now.
        assert.equal(state, paths.join("-"));
        for (const type of TOWER_TYPES) {
          for (const use of ["card_512", "battlefield_256"])
            assert(
              existsSync("public/" + towerArtwork({ type, paths }, use)),
              `${type} ${state} ${use}`,
            );
          assert.equal(
            towerTexture({ type, paths }),
            `v5-${type}-` + state,
          );
        }
      }
  assert.equal(legal, 25);
});

test("invalid or unsupported artwork states fall back safely", () => {
  for (const p of [null, [], [1, 1, 1], [2, 2, 0], [4, 0, 0], ["1", 0, 0]])
    assert.equal(artworkState(p), "0-0-0");
  assert.equal(towerArtwork({ type: "unknown", paths: [2, 1, 0] }), null);
  // Every registered tower has an illustrated texture.
  for (const type of TOWER_TYPES)
    assert.equal(
      towerTexture({ type, paths: [2, 1, 0] }),
      `v5-${type}-2-1-0`,
    );
  for (const type of TOWER_TYPES) {
    const m = JSON.parse(
      readFileSync(`public/assets/v5/towers/${type}/manifest.json`),
    );
    for (const state of TOWER_STATES)
      for (const [folder, size] of [
        ["card_512", 512],
        ["battlefield_256", 256],
      ]) {
        const png = readFileSync(
          `public/assets/v5/towers/${type}/${folder}/${type}_${state}.png`,
        );
        assert.equal(png.readUInt32BE(16), size);
        assert.equal(png.readUInt32BE(20), size);
        assert.equal(png[25], 6);
        assert(m.states[state]);
      }
  }
});
