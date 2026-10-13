import { Game } from "../src/systems/Game.js";
import { TOWERS } from "../src/data/towers.js";
import { PATH } from "../src/data/map.js";
// A reproducible mixed build strategy spends only earned gold between manual waves.
export function runCampaign() {
  const model = new Game(),
    report = [];
  const roster = [
    "archer",
    "archer",
    "cannon",
    "frost",
    "fire",
    "lightning",
    "archer",
    "cannon",
    "lightning",
    "fire",
    "frost",
    "cannon",
    "lightning",
    "archer",
    "fire",
  ];
  function bestSpot(type) {
    let best = null;
    for (let x = 70; x < 900; x += 32)
      for (let y = 80; y < 590; y += 32) {
        if (model.canPlace(type, x, y)) continue;
        const r = TOWERS[type].levels[0].range;
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
    let spent = true;
    while (spent) {
      spent = false;
      const next = roster[model.towers.length];
      // Invest in stronger towers regularly, while keeping a varied early defense.
      const candidate = model.towers
        .filter(
          (t) =>
            t.level < 3 && TOWERS[t.type].upgrades[t.level - 1] <= model.gold,
        )
        .sort((a, b) => a.level - b.level || a.id - b.id)[0];
      if (candidate && (model.towers.length >= 6 || wave % 3 === 0)) {
        model.upgrade(candidate.id);
        spent = true;
      } else if (next && model.gold >= TOWERS[next].cost) {
        const spot = bestSpot(next);
        if (spot) {
          model.place(next, spot.x, spot.y);
          spent = true;
        }
      } else if (candidate) {
        model.upgrade(candidate.id);
        spent = true;
      }
    }
    model.startWave();
    let seconds = 0;
    while (model.active && !model.ended && seconds < 200) {
      model.update(0.1);
      seconds += 0.1;
    }
    report.push({
      wave,
      lives: model.lives,
      gold: model.gold,
      towers: model.towers.length,
      seconds: Math.round(seconds),
      result: model.ended,
    });
    if (seconds >= 200) throw new Error(`Wave ${wave} stalled`);
  }
  return { model, report };
}
