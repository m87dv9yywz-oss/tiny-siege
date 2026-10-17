// Free Play balance check (owner design: strong play should fall
// somewhere in waves 120-170; only a near-perfect board clears 200).
// Mirrors the funded strategy harness of expansion-balance.mjs — no
// free gold, towers bought and upgraded from earned gold only.
// Read results RELATIVELY: the same harness also loses shipping Hard
// maps (see expansion-balance.mjs), so treat the death wave as a
// comparison point, not an absolute prediction of human play.
import { Game } from "../src/systems/Game.js";
import { TOWERS, upgradeState } from "../src/data/towers.js";
import { STRATEGIES } from "../tests/strategy.js";

const wide = [
  ...STRATEGIES.mixed,
  ...STRATEGIES.mixed.map(([t, p]) => [t, (p + 1) % 3]),
];

function run(map, difficulty, roster, hero = null) {
  const model = new Game(() => {}, { map, difficulty, hero });
  const bestSpot = (type) => {
    let best = null;
    for (let x = 70; x < 900; x += 32)
      for (let y = 80; y < 590; y += 32) {
        if (model.canPlace(type, x, y)) continue;
        const r = TOWERS[type].base.range;
        const score =
          model.trails.reduce(
            (s, t) =>
              s +
              t.PATH.reduce(
                (n, p) => n + (Math.hypot(p.x - x, p.y - y) < r ? 1 : 0),
                0,
              ),
            0,
          ) -
          model.towers.reduce(
            (n, t) => n + Math.max(0, 1 - Math.hypot(t.x - x, t.y - y) / 150) * 15,
            0,
          );
        if (!best || score > best.score) best = { x, y, score };
      }
    return best;
  };
  for (let wave = 1; wave <= model.totalWaves && !model.ended; wave++) {
    for (let actions = 0; actions < 60; actions++) {
      const next = roster[model.towers.length];
      const candidates = model.towers
        .map((t, i) => ({ t, p: roster[i]?.[1] ?? 0 }))
        .filter(
          ({ t, p }) =>
            model.pathAvailable(t.type, p, t.paths[p] + 1) &&
            !upgradeState(t, p).locked &&
            upgradeState(t, p).cost <= model.gold,
        );
      const candidate = candidates.sort(
        (a, b) =>
          (wave >= 10
            ? b.t.paths[b.p] - a.t.paths[a.p]
            : a.t.paths[a.p] - b.t.paths[b.p]) || a.t.id - b.t.id,
      )[0];
      const wantTower =
        model.towers.length < 6 ||
        (wave >= 12 &&
          model.towers.length <
            Math.min(roster.length, 6 + Math.floor((wave - 10) / 2)));
      if (next && model.gold >= TOWERS[next[0]].cost && (wantTower || !candidate)) {
        const spot = bestSpot(next[0]);
        if (!spot) break;
        model.place(next[0], spot.x, spot.y);
      } else if (candidate) model.upgrade(candidate.t.id, candidate.p);
      else break;
    }
    model.startWave();
    let seconds = 0;
    while (model.active && !model.ended && seconds < 500) {
      model.update(0.1);
      seconds += 0.1;
    }
    if (seconds >= 500)
      return { result: "stalled", wave, lives: model.lives, towers: model.towers.length };
  }
  return {
    result: model.ended || "unfinished",
    wave: model.wave,
    lives: model.lives,
    towers: model.towers.length,
  };
}

for (const [label, roster] of [
  ["mixed-12", STRATEGIES.mixed],
  ["wide-24", wide],
]) {
  for (const map of ["emerald", "spiral"]) {
    const r = run(map, "freeplay", roster, "dragon");
    console.log(
      `freeplay ${map} ${label}: ${r.result} at wave ${r.wave} (lives ${r.lives}, towers ${r.towers})`,
    );
  }
}
const base = run("emerald", "hard", STRATEGIES.mixed, "dragon");
console.log(
  `baseline hard emerald mixed-12: ${base.result} at wave ${base.wave} (lives ${base.lives})`,
);
