import {
  freshProfile,
  validateProfile,
  TYPES,
} from "../progression/profiles.js";
import { HEROES } from "../data/heroes.js";
import { CAMPAIGNS } from "../data/waves.js";
import { validateBattle } from "../systems/checkpoint.js";
export const MAP_IDS = Object.keys(CAMPAIGNS).filter((k) => k !== "classic");
export const COMPONENTS = [
  ...TYPES.map((k) => "towers/" + k),
  ...Object.keys(HEROES).map((k) => "heroes/" + k),
  ...MAP_IDS.map((k) => "maps/" + k),
  "relics/loadout",
];
const blankMap = () => ({
  easy: 0,
  medium: 0,
  hard: 0,
  easyClaims: 0,
  mediumClaims: 0,
  hardClaims: 0,
});
export function profileDocuments(p, stamp, status = "active") {
  if (!validateProfile(p) || p.schemaVersion !== 3)
    throw Error("Invalid v4 profile.");
  const { ledger, ...statistics } = p.statistics;
  const documents = {
    core: {
      schemaVersion: 3,
      nickname: p.nickname,
      avatar: p.avatar,
      crowns: p.crowns,
      statistics,
      settings: p.settings,
      achievements: p.achievements,
      status,
      updatedAt: stamp,
    },
  };
  for (const type of TYPES)
    documents["towers/" + type] = {
      ...p.towerXP[type],
      unlocked: p.unlockedTowers.includes(type),
      paths: p.unlockedUpgrades[type],
      updatedAt: stamp,
    };
  for (const type of Object.keys(HEROES))
    documents["heroes/" + type] = {
      xp: p.heroes.xp[type],
      unlocked: p.heroes.unlocked.includes(type),
      equipped: p.heroes.equipped === type,
      updatedAt: stamp,
    };
  for (const map of MAP_IDS)
    documents["maps/" + map] = {
      completed: p.completedMaps.includes(map),
      stars: p.mapStars[map] || 0,
      ...(p.mapProgress[map] || blankMap()),
      updatedAt: stamp,
    };
  documents["relics/loadout"] = { ...p.relics, updatedAt: stamp };
  return documents;
}
export function assembleProfile(core, components) {
  if (
    core.schemaVersion !== 3 ||
    !["active", "migrating"].includes(core.status)
  )
    throw Error("Unsupported cloud profile.");
  const p = freshProfile(core.nickname, core.avatar);
  Object.assign(p, {
    crowns: core.crowns,
    statistics: { ...core.statistics, ledger: "" },
    settings: core.settings,
    achievements: core.achievements,
    updatedAt: core.updatedAt?.toMillis?.() || 0,
  });
  p.unlockedTowers = [];
  p.completedMaps = [];
  p.mapStars = {};
  p.mapProgress = {};
  p.heroes.unlocked = [];
  let equipped = 0;
  for (const type of TYPES) {
    // A tower launched after this cloud save was written has no document
    // yet; it starts at zero progress rather than blocking the whole load,
    // and the next save writes its document. Only the expansion-era tower
    // is optional this way — a missing older document still means the
    // cloud save is incomplete. (Extend this list when content ships.)
    const d =
      components["towers/" + type] ||
      (type === "tidecaller"
        ? {
            earned: 0,
            spent: 0,
            paths: [1, 1, 1],
            unlocked: ["archer", "cannon", "frost"].includes(type),
          }
        : null);
    if (!d)
      throw Error("Cloud migration is incomplete; original save retained.");
    p.towerXP[type] = { earned: d.earned, spent: d.spent };
    p.unlockedUpgrades[type] = d.paths;
    if (d.unlocked) p.unlockedTowers.push(type);
  }
  for (const type of Object.keys(HEROES)) {
    const d = components["heroes/" + type];
    if (!d) throw Error("Cloud hero progress is missing.");
    p.heroes.xp[type] = d.xp;
    if (d.unlocked) p.heroes.unlocked.push(type);
    if (d.equipped) {
      p.heroes.equipped = type;
      equipped++;
    }
  }
  if (equipped !== 1) throw Error("Choose one cloud hero.");
  for (const map of MAP_IDS) {
    // Maps launched after this cloud save was written have no document
    // yet; they start blank rather than blocking the whole load. Only the
    // expansion-era maps are optional this way. (Extend when maps ship.)
    const EXPANSION_MAPS = [
      "twinponds",
      "roundabout",
      "switchbacks",
      "twofronts",
      "spiral",
      "riverbend",
    ];
    const d =
      components["maps/" + map] ||
      (EXPANSION_MAPS.includes(map)
        ? { completed: false, stars: 0, ...blankMap() }
        : null);
    if (!d) throw Error("Cloud map progress is missing.");
    if (d.completed) {
      p.completedMaps.push(map);
      p.mapStars[map] = d.stars;
    }
    p.mapProgress[map] = Object.fromEntries(
      Object.keys(blankMap()).map((k) => [k, d[k]]),
    );
  }
  const relics = components["relics/loadout"];
  if (!relics) throw Error("Cloud relics are missing.");
  p.relics = { unlocked: relics.unlocked, equipped: relics.equipped };
  if (!validateProfile(p))
    throw Error("Cloud save failed validation. Original save retained.");
  return p;
}
export function battleDocuments(b, stamp, revision) {
  if (b && !validateBattle(b)) throw Error("Invalid battle checkpoint.");
  if (!b)
    return {
      "battles/current": { present: false, revision, updatedAt: stamp },
    };
  const { towers, hero, participation, ...rest } = b;
  const documents = {
    "battles/current": {
      present: true,
      revision,
      updatedAt: stamp,
      checkpoint: {
        ...rest,
        hero: hero
          ? Object.fromEntries(
              [
                "type",
                "x",
                "y",
                "level",
                "cooldown",
                "abilityLeft",
                "attacks",
                "damage",
              ].map((k) => [k, hero[k]]),
            )
          : null,
        towerSlots: towers.map((_, i) => String(i)),
      },
    },
  };
  for (const type of TYPES)
    documents["battleProgress/" + type] = {
      ...participation[type],
      updatedAt: stamp,
    };
  towers.forEach(
    (t, i) =>
      (documents["placements/" + i] = {
        ...Object.fromEntries(
          [
            "id",
            "type",
            "x",
            "y",
            "paths",
            "targeting",
            "invested",
            "cooldown",
            "shots",
          ].map((k) => [k, t[k]]),
        ),
        heat: t.heat || 0,
        updatedAt: stamp,
      }),
  );
  return documents;
}
export function assembleBattle(core, placements, progress = {}) {
  if (!core?.present) return null;
  const { towerSlots, ...b } = core.checkpoint;
  b.participation = Object.fromEntries(
    TYPES.map((type) => {
      const { updatedAt, ...p } = progress[type] || {};
      return [type, p];
    }),
  );
  b.towers = towerSlots.map((id) => {
    const { updatedAt, ...t } = placements[id] || {};
    return { ...t, level: Math.min(3, 1 + Math.max(...(t.paths || [0]))) };
  });
  if (b.hero)
    Object.assign(b.hero, { route: [], destination: null, moveLeft: 0 });
  if (!validateBattle(b))
    throw Error("Cloud checkpoint failed validation. Local checkpoint kept.");
  return b;
}
