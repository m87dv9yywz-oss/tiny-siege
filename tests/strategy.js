import { Game } from "../src/systems/Game.js";
import { TOWERS, upgradeState } from "../src/data/towers.js";
import { PATH } from "../src/data/map.js";
export const STRATEGIES = {
  mixed: [
    ["archer", 1],
    ["archer", 0],
    ["cannon", 1],
    ["frost", 1],
    ["fire", 2],
    ["lightning", 1],
    ["archer", 2],
    ["cannon", 2],
    ["lightning", 0],
    ["fire", 0],
    ["frost", 2],
    ["cannon", 0],
  ],
  physical: [
    ["archer", 1],
    ["archer", 0],
    ["cannon", 0],
    ["frost", 1],
    ["archer", 2],
    ["cannon", 1],
    ["archer", 0],
    ["cannon", 2],
    ["archer", 1],
    ["fire", 2],
  ],
  magic: [
    ["archer", 0],
    ["fire", 1],
    ["frost", 2],
    ["lightning", 0],
    ["cannon", 0],
    ["lightning", 1],
    ["fire", 0],
    ["archer", 2],
    ["lightning", 2],
    ["fire", 2],
  ],
  control: [
    ["archer", 0],
    ["cannon", 0],
    ["frost", 1],
    ["fire", 2],
    ["frost", 0],
    ["lightning", 1],
    ["cannon", 2],
    ["archer", 1],
    ["frost", 2],
    ["fire", 0],
  ],
  beginner: [
    ["archer", 0],
    ["archer", 1],
    ["cannon", 0],
    ["frost", 0],
    ["fire", 0],
    ["lightning", 0],
    ["cannon", 1],
    ["archer", 2],
    ["fire", 2],
    ["lightning", 1],
  ],
};
// No free gold or altered combat. Buy at legal positions using trail coverage,
// then specialize between waves; every decision and escape is recorded.
export function runCampaign(strategy = "mixed") {
  const events = [],
    model = new Game((e) => {
      if (e.type === "escape") events.push(e.enemy.type);
    }),
    report = [];
  const roster = STRATEGIES[strategy];
  function bestSpot(type) {
    let best = null;
    for (let x = 70; x < 900; x += 32)
      for (let y = 80; y < 590; y += 32) {
        if (model.canPlace(type, x, y)) continue;
        const r = TOWERS[type].base.range;
        const score =
          PATH.reduce(
            (n, p) => n + (Math.hypot(p.x - x, p.y - y) < r ? 1 : 0),
            0,
          ) -
          model.towers.reduce(
            (n, t) =>
              n + Math.max(0, 1 - Math.hypot(t.x - x, t.y - y) / 150) * 15,
            0,
          );
        if (!best || score > best.score) best = { x, y, score };
      }
    return best;
  }
  for (let wave = 1; wave <= 20 && !model.ended; wave++) {
    const before = model.gold,
      earned = model.earned,
      escapes = events.length;
    for (let actions = 0; actions < 50; actions++) {
      const next = roster[model.towers.length];
      const candidates = model.towers
        .map((t, i) => ({ t, p: roster[i][1] }))
        .filter(
          ({ t, p }) =>
            !upgradeState(t, p).locked && upgradeState(t, p).cost <= model.gold,
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
      if (
        next &&
        model.gold >= TOWERS[next[0]].cost &&
        (wantTower || !candidate)
      ) {
        const spot = bestSpot(next[0]);
        if (!spot) break;
        model.place(next[0], spot.x, spot.y);
      } else if (candidate) model.upgrade(candidate.t.id, candidate.p);
      else break;
    }
    const spent = before - model.gold;
    model.startWave();
    let seconds = 0;
    while (model.active && !model.ended && seconds < 220) {
      model.update(0.1);
      seconds += 0.1;
    }
    if (seconds >= 220) throw Error(`Wave ${wave} stalled`);
    report.push({
      wave,
      lives: model.lives,
      gold: model.gold,
      earned: model.earned - earned,
      spent,
      totalEarned: model.earned,
      towers: model.towers.map((t) => ({ type: t.type, paths: [...t.paths] })),
      escaped: events.slice(escapes),
      seconds: Math.round(seconds * 10) / 10,
      result: model.ended,
    });
  }
  return { model, report };
}
