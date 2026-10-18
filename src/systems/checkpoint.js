import { TOWERS, towerStats } from "../data/towers.js";
import { CAMPAIGNS } from "../data/waves.js";
import { HEROES } from "../data/heroes.js";
import { RELICS } from "../data/relics.js";
import { DIFFICULTIES, FREEPLAY } from "../data/difficulties.js";
import { TRAILS, OBSTACLES } from "../data/map.js";
const finite = (n, max = 1e9) => Number.isFinite(n) && n >= 0 && n <= max;
export function battleCheckpoint(model, run) {
  if (
    model.active ||
    model.ended ||
    model.wave >= model.totalWaves ||
    !run ||
    run.finished
  )
    return null;
  return {
    version: 1,
    map: model.campaign.id,
    difficulty: model.campaign.mode || null,
    wave: model.wave,
    skippedWaves: model.skippedWaves || 0,
    lives: model.lives,
    gold: model.gold,
    kills: model.kills,
    earned: model.earned,
    id: model.id,
    speed: model.speed,
    towers: model.towers.map((t) => ({
      ...structuredClone(t),
      cooldown: Math.max(0, t.cooldown),
    })),
    hero: structuredClone(model.hero),
    relics: [...model.relics],
    participation: structuredClone(model.participation),
    run: structuredClone(run),
    savedAt: Date.now(),
  };
}
export function validateBattle(b) {
  if (
    !b ||
    ![16, 17].includes(Object.keys(b).length) ||
    (b.skippedWaves !== undefined &&
      (!Number.isInteger(b.skippedWaves) ||
        b.skippedWaves < 0 ||
        b.skippedWaves > 1000)) ||
    b.version !== 1 ||
    !Object.hasOwn(CAMPAIGNS, b.map) ||
    // The classic map never checkpoints as an adventure — but Free
    // Play may be played on any map, classic included.
    (b.map === "classic" && b.difficulty !== "freeplay") ||
    (b.difficulty !== "freeplay" && !Object.hasOwn(DIFFICULTIES, b.difficulty)) ||
    !Number.isInteger(b.wave) ||
    b.wave < 0 ||
    b.wave >=
      (b.difficulty === "freeplay"
        ? FREEPLAY.waves
        : DIFFICULTIES[b.difficulty].waves) ||
    ![1, 2, 3, 4].includes(b.speed) ||
    !Number.isInteger(b.lives) ||
    b.lives < 1 ||
    b.lives > 22 ||
    !["gold", "kills", "earned", "id"].every((k) => finite(b[k])) ||
    !Number.isInteger(b.id) ||
    !finite(b.savedAt, 1e15) ||
    !Array.isArray(b.towers) ||
    b.towers.length > 80
  )
    return false;
  if (
    !Array.isArray(b.relics) ||
    b.relics.length > 2 ||
    new Set(b.relics).size !== b.relics.length ||
    !b.relics.every((k) => Object.hasOwn(RELICS, k))
  )
    return false;
  const seen = new Set();
  for (const t of b.towers) {
    if (
      !Object.hasOwn(TOWERS, t.type) ||
      !Number.isInteger(t.id) ||
      t.id < 1 ||
      t.id > b.id ||
      seen.has(t.id) ||
      !Number.isFinite(t.x) ||
      !Number.isFinite(t.y) ||
      t.x < 30 ||
      t.x > 930 ||
      t.y < 60 ||
      t.y > 610 ||
      TRAILS[b.map].distanceToPath(t.x, t.y) < 45 ||
      !Array.isArray(t.paths) ||
      t.paths.length !== 3 ||
      !t.paths.every((n) => Number.isInteger(n) && n >= 0 && n <= 3) ||
      // An Ascended tower (paths [3,3,3] — three sacrificed evolutions)
      // is legal only in Free Play; everywhere else the ordinary
      // two-path shape rules apply unchanged.
      (b.difficulty === "freeplay" && t.paths.every((n) => n === 3)
        ? false
        : t.paths.filter((n) => n > 0).length > 2 ||
          t.paths.filter((n) => n > 1).length > 1) ||
      !["FIRST", "LAST", "STRONG", "WEAK", "SUPPORT"].includes(t.targeting) ||
      !finite(t.cooldown, 10) ||
      !finite(t.shots) ||
      !finite(t.heat || 0, 10)
    )
      return false;
    const investment =
      TOWERS[t.type].cost +
      t.paths.reduce(
        (n, v) =>
          n + TOWERS[t.type].prices.slice(0, v).reduce((a, c) => a + c, 0),
        0,
      );
    if (
      t.invested !== investment ||
      (t.targeting === "SUPPORT" && !towerStats(t).supportTarget) ||
      (OBSTACLES[b.map] || []).some(
        (o) => Math.hypot(o.x - t.x, o.y - t.y) < o.r + 23,
      )
    )
      return false;
    seen.add(t.id);
  }
  for (let i = 0; i < b.towers.length; i++)
    for (let j = i + 1; j < b.towers.length; j++)
      if (
        Math.hypot(
          b.towers[i].x - b.towers[j].x,
          b.towers[i].y - b.towers[j].y,
        ) < 52
      )
        return false;
  if (b.hero) {
    const h = b.hero;
    if (
      !Object.hasOwn(HEROES, h.type) ||
      !Number.isFinite(h.x) ||
      !Number.isFinite(h.y) ||
      h.x < 0 ||
      h.x > 960 ||
      h.y < 0 ||
      h.y > 640 ||
      !finite(h.abilityLeft, 30) ||
      !finite(h.cooldown, 3) ||
      !Number.isInteger(h.level) ||
      h.level < 1 ||
      h.level > 10 ||
      !finite(h.damage) ||
      !finite(h.attacks) ||
      !Array.isArray(h.route) ||
      h.route.length > 700
    )
      return false;
    if (
      h.route.some(
        (p) =>
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          p.x < 0 ||
          p.x > 960 ||
          p.y < 0 ||
          p.y > 640,
      )
    )
      return false;
  }
  if (!b.participation || typeof b.participation !== "object") return false;
  // A checkpoint written before a tower launched has no entry for it;
  // fill zeros (the tower genuinely earned nothing in that run) instead
  // of discarding the whole run. Unknown towers still reject the save.
  for (const k of Object.keys(TOWERS))
    b.participation[k] ||= { time: 0, damage: 0, armor: 0, control: 0, kills: 0 };
  if (
    Object.keys(b.participation).length !== Object.keys(TOWERS).length ||
    !Object.keys(TOWERS).every(
      (k) =>
        b.participation[k] &&
        ["time", "damage", "armor", "control", "kills"].every((n) =>
          finite(b.participation[k][n]),
        ),
    )
  )
    return false;
  const r = b.run;
  return (
    !!r &&
    typeof r.id === "string" &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(r.id) &&
    typeof r.profileId === "string" &&
    r.profileId.length <= 180 &&
    r.finished === false &&
    Object.keys(TOWERS).every((k) => finite(r.granted?.[k] ?? 0, 800)) &&
    ["waves", "damage", "armor", "kills"].every((k) => finite(r.stats?.[k])) &&
    finite(r.heroGranted || 0, 300)
  );
}
export function restoreBattle(model, b, profile) {
  if (!validateBattle(b))
    throw Error(
      "This checkpoint cannot be restored safely. Export it before starting a new battle.",
    );
  // Free Play boards may use anything, so unlock checks don't apply;
  // adventure checkpoints still need their original progress.
  if (
    b.difficulty !== "freeplay" &&
    (b.towers.some(
      (t) =>
        !profile.unlockedTowers.includes(t.type) ||
        t.paths.some((n, p) => n > profile.unlockedUpgrades[t.type][p]),
    ) ||
      (b.hero && !profile.heroes.unlocked.includes(b.hero.type)) ||
      !b.relics.every((k) => profile.relics.unlocked.includes(k)))
  )
    throw Error("This battle needs its original unlocked progress.");
  model.configure({
    map: b.map,
    difficulty: b.difficulty,
    profile,
    hero: b.hero?.type,
    relics: b.relics,
  });
  model.reset();
  for (const key of [
    "wave",
    "lives",
    "gold",
    "kills",
    "earned",
    "id",
    "speed",
    "towers",
    "hero",
    "participation",
  ])
    model[key] = structuredClone(b[key]);
  model.skippedWaves = b.skippedWaves || 0;
  model.paused = true;
  model.emit("restore");
  return structuredClone(b.run);
}
