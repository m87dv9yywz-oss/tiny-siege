import { validateBattle } from "../systems/checkpoint.js";
import { HEROES } from "../data/heroes.js";
import { RELICS } from "../data/relics.js";
import { DIFFICULTIES } from "../data/difficulties.js";
import { TOWERS } from "../data/towers.js";
import { CAMPAIGNS } from "../data/waves.js";

export const TYPES = Object.keys(TOWERS);
export const AVATARS = ["dragon", "castle", "fox", "owl", "wizard", "unicorn"];
export const AVATAR_ART = {
  dragon: "🐉",
  castle: "🏰",
  fox: "🦊",
  owl: "🦉",
  wizard: "🧙",
  unicorn: "🦄",
};
export const UNLOCK_COSTS = {
  fire: 75,
  lightning: 130,
  grove: 90,
  wind: 100,
  rune: 110,
  tidecaller: 120,
};
const LEGACY_TYPES = ["archer", "cannon", "frost", "fire", "lightning"];
const V31_TYPES = [...LEGACY_TYPES, "grove"];
const profileTypes = (p) =>
  p?.schemaVersion === 1
    ? LEGACY_TYPES
    : p?.schemaVersion === 2
      ? V31_TYPES
      : TYPES;
const MAP_IDS = [
  "emerald",
  "amber",
  "moon",
  "garden",
  "crystal",
  "coast",
  "twinponds",
  "roundabout",
  "switchbacks",
  "twofronts",
  "spiral",
  "riverbend",
];
export const XP_COSTS = { 2: 180, 3: 500 };
export const freshProfile = (
  nickname = "Little Knight",
  avatar = "dragon",
) => ({
  schemaVersion: 3,
  heroes: {
    unlocked: ["dragon", "tiger"],
    equipped: "dragon",
    xp: { dragon: 0, dinosaur: 0, tiger: 0 },
  },
  relics: { unlocked: [], equipped: [] },
  mapProgress: {},
  nickname,
  avatar,
  crowns: 0,
  towerXP: Object.fromEntries(TYPES.map((t) => [t, { earned: 0, spent: 0 }])),
  unlockedTowers: ["archer", "cannon", "frost"],
  unlockedUpgrades: Object.fromEntries(TYPES.map((t) => [t, [1, 1, 1]])),
  completedMaps: [],
  mapStars: {},
  achievements: [],
  statistics: {
    revision: 0,
    ledger: "",
    wins: 0,
    waves: 0,
    damage: 0,
    armor: 0,
    kills: 0,
  },
  settings: { sound: false, reducedEffects: false },
  updatedAt: 0,
});
const PROFILE_FIELDS = new Set(Object.keys(freshProfile()));
const integer = (v, max = 1000000000) =>
  Number.isInteger(v) && v >= 0 && v <= max;
export function validateProfile(p) {
  const types = profileTypes(p);
  const maps =
    p?.schemaVersion === 1
      ? MAP_IDS.slice(0, 3)
      : p?.schemaVersion === 2
        ? MAP_IDS.slice(0, 4)
        : MAP_IDS;
  const fields =
    p?.schemaVersion === 3
      ? PROFILE_FIELDS
      : new Set(
          [...PROFILE_FIELDS].filter(
            (k) => !["heroes", "relics", "mapProgress"].includes(k),
          ),
        );
  if (
    !p ||
    Object.keys(p).length !== fields.size ||
    Object.keys(p).some((k) => !fields.has(k)) ||
    ![1, 2, 3].includes(p.schemaVersion) ||
    typeof p.nickname !== "string" ||
    !p.nickname.trim() ||
    /[\u0000-\u001f\u007f]/.test(p.nickname) ||
    p.nickname.length > 32 ||
    !AVATARS.includes(p.avatar) ||
    !integer(p.crowns)
  )
    return false;
  if (
    !Array.isArray(p.unlockedTowers) ||
    new Set(p.unlockedTowers).size !== p.unlockedTowers.length ||
    !p.unlockedTowers.every((t) => types.includes(t)) ||
    !["archer", "cannon", "frost"].every((t) => p.unlockedTowers.includes(t))
  )
    return false;
  for (const t of types) {
    const xp = p.towerXP?.[t],
      paths = p.unlockedUpgrades?.[t];
    if (
      !xp ||
      Object.keys(xp).length !== 2 ||
      !integer(xp.earned) ||
      !integer(xp.spent) ||
      xp.spent > xp.earned ||
      !Array.isArray(paths) ||
      paths.length !== 3 ||
      !paths.every((n) => Number.isInteger(n) && n >= 1 && n <= 3)
    )
      return false;
  }
  if (
    Object.keys(p.towerXP).length !== types.length ||
    Object.keys(p.unlockedUpgrades).length !== types.length
  )
    return false;
  if (
    !Array.isArray(p.completedMaps) ||
    p.completedMaps.length > maps.length ||
    new Set(p.completedMaps).size !== p.completedMaps.length ||
    !p.completedMaps.every((m) => maps.includes(m))
  )
    return false;
  if (
    !p.mapStars ||
    Array.isArray(p.mapStars) ||
    Object.keys(p.mapStars).some(
      (m) => !p.completedMaps.includes(m) || !integer(p.mapStars[m], 3),
    )
  )
    return false;
  if (
    !Array.isArray(p.achievements) ||
    p.achievements.length > 3 ||
    new Set(p.achievements).size !== p.achievements.length ||
    !p.achievements.every((a) =>
      ["first-clear", "three-kingdoms", "evolution"].includes(a),
    )
  )
    return false;
  if (
    !p.statistics ||
    Object.keys(p.statistics).length !== 7 ||
    !integer(p.statistics.revision) ||
    typeof p.statistics.ledger !== "string" ||
    p.statistics.ledger.length > 194000 ||
    !/^(\|[a-zA-Z0-9_-]{1,96})*\|?$/.test(p.statistics.ledger)
  )
    return false;
  for (const k of ["wins", "waves", "damage", "armor", "kills"])
    if (!integer(p.statistics[k])) return false;
  if (p.schemaVersion === 3) {
    const h = p.heroes,
      r = p.relics;
    if (
      !h ||
      Object.keys(h).length !== 3 ||
      !Array.isArray(h.unlocked) ||
      !h.unlocked.includes("dragon") ||
      new Set(h.unlocked).size !== h.unlocked.length ||
      !h.unlocked.every((k) => Object.hasOwn(HEROES, k)) ||
      !h.unlocked.includes(h.equipped) ||
      !h.xp ||
      Object.keys(h.xp).length !== 3 ||
      !Object.keys(HEROES).every((k) => integer(h.xp[k]))
    )
      return false;
    if (
      !r ||
      Object.keys(r).length !== 2 ||
      ![r.unlocked, r.equipped].every(
        (a) =>
          Array.isArray(a) &&
          new Set(a).size === a.length &&
          a.every((k) => Object.hasOwn(RELICS, k)),
      ) ||
      r.equipped.length > 2 ||
      !r.equipped.every((k) => r.unlocked.includes(k))
    )
      return false;
    if (
      !p.mapProgress ||
      Array.isArray(p.mapProgress) ||
      Object.keys(p.mapProgress).some((k) => !MAP_IDS.includes(k))
    )
      return false;
    for (const m of Object.values(p.mapProgress))
      if (
        !m ||
        Object.keys(m).length !== 6 ||
        !Object.keys(DIFFICULTIES).every(
          (k) => integer(m[k], 3) && integer(m[k + "Claims"], 6),
        )
      )
        return false;
  }
  return (
    p.settings &&
    Object.keys(p.settings).length === 2 &&
    typeof p.settings.sound === "boolean" &&
    typeof p.settings.reducedEffects === "boolean"
  );
}
export function migrateProfile(data) {
  const types = profileTypes(data);
  if (data?.towerXP && Object.hasOwn(data.towerXP, "archerEarned")) {
    const keys = types.flatMap((t) => [t + "Earned", t + "Spent"]);
    if (
      Object.keys(data.towerXP).length !== types.length * 2 ||
      Object.keys(data.towerXP).some((k) => !keys.includes(k))
    )
      throw Error("Invalid cloud XP data.");
    data = {
      ...data,
      towerXP: Object.fromEntries(
        types.map((t) => [
          t,
          {
            earned: data.towerXP[t + "Earned"],
            spent: data.towerXP[t + "Spent"],
          },
        ]),
      ),
    };
  }
  // The infrastructure prototype used schema 1 with empty nested maps.
  const p = freshProfile(data?.nickname, data?.avatar);
  if (data?.schemaVersion && ![1, 2, 3].includes(data.schemaVersion))
    throw Error("This save needs a newer Tiny Siege version.");
  if (validateProfile(data)) {
    const copy = structuredClone(data);
    if (copy.schemaVersion < 3) {
      copy.schemaVersion = 3;
      for (const t of TYPES) {
        copy.towerXP[t] ||= { earned: 0, spent: 0 };
        copy.unlockedUpgrades[t] ||= [1, 1, 1];
      }
      copy.heroes = structuredClone(p.heroes);
      copy.relics = structuredClone(p.relics);
      copy.mapProgress = {};
      for (const map of copy.completedMaps)
        copy.mapProgress[map] = {
          easy: copy.mapStars[map] || 1,
          medium: 0,
          hard: 0,
          easyClaims: 1,
          mediumClaims: 0,
          hardClaims: 0,
        };
      for (const [key, relic] of Object.entries(RELICS))
        if (relic.unlock(copy)) copy.relics.unlocked.push(key);
    }
    return copy;
  }
  if (
    data &&
    (!data.schemaVersion || data.schemaVersion === 1) &&
    Object.keys(data.towerXP || {}).length === 0 &&
    Object.keys(data.unlockedUpgrades || {}).length === 0 &&
    integer(data.crowns)
  ) {
    const legacy = { ...p, ...structuredClone(data), schemaVersion: 1 };
    delete legacy.heroes;
    delete legacy.relics;
    delete legacy.mapProgress;
    legacy.towerXP = Object.fromEntries(
      LEGACY_TYPES.map((t) => [t, { earned: 0, spent: 0 }]),
    );
    legacy.unlockedUpgrades = Object.fromEntries(
      LEGACY_TYPES.map((t) => [t, [1, 1, 1]]),
    );
    if (!validateProfile(legacy))
      throw Error("Invalid profile. Your existing save has been kept.");
    return migrateProfile(legacy);
  }
  throw Error("This save is invalid. Your existing save has been kept.");
}
export function applyOperation(profile, op) {
  const p = structuredClone(profile);
  if (p.statistics.ledger.includes(`|${op.id}|`)) return p;
  if (
    typeof op.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,96}$/.test(op.id) ||
    (p.schemaVersion < 3 &&
      p.statistics.ledger.length + op.id.length + 2 > 194000)
  )
    throw Error("Save history is full. Export a backup before continuing.");
  if (op.type === "reward") {
    const map = CAMPAIGNS[op.map];
    if (!map || op.map === "classic" || !integer(op.stars, 3))
      throw Error("Invalid map reward.");
    if (op.win) {
      if (op.difficulty) {
        const mode = DIFFICULTIES[op.difficulty];
        if (!mode) throw Error("Invalid difficulty reward.");
        const progress = (p.mapProgress[op.map] ||= {
          easy: 0,
          medium: 0,
          hard: 0,
          easyClaims: 0,
          mediumClaims: 0,
          hardClaims: 0,
        });
        const claims = progress[op.difficulty + "Claims"];
        if (claims < 6) p.crowns += claims ? mode.repeat : mode.first;
        progress[op.difficulty + "Claims"] = Math.min(6, claims + 1);
        progress[op.difficulty] = Math.max(progress[op.difficulty], op.stars);
      } else
        p.crowns += p.completedMaps.includes(op.map) ? map.repeat : map.first;
      if (!p.completedMaps.includes(op.map)) p.completedMaps.push(op.map);
      p.mapStars[op.map] = Math.max(p.mapStars[op.map] || 0, op.stars);
      p.statistics.wins++;
      if (!p.achievements.includes("first-clear"))
        p.achievements.push("first-clear");
      if (
        p.completedMaps.length >= 3 &&
        !p.achievements.includes("three-kingdoms")
      )
        p.achievements.push("three-kingdoms");
    }
    if (op.hero) {
      if (!Object.hasOwn(HEROES, op.hero) || !integer(op.heroXP || 0, 300))
        throw Error("Invalid hero XP.");
      p.heroes.xp[op.hero] += op.heroXP || 0;
    }
    for (const t of TYPES) {
      const amount = op.xp?.[t] || 0;
      if (!integer(amount, 800)) throw Error("Invalid XP reward.");
      p.towerXP[t].earned += amount;
    }
    for (const k of ["waves", "damage", "armor", "kills"]) {
      if (!integer(op.stats?.[k] || 0, 1000000))
        throw Error("Invalid statistics.");
      p.statistics[k] += op.stats?.[k] || 0;
    }
  } else if (op.type === "tower") {
    const cost = UNLOCK_COSTS[op.tower];
    if (!cost) throw Error("Invalid tower unlock.");
    if (!p.unlockedTowers.includes(op.tower)) {
      if (p.crowns < cost) throw Error("Not enough Kingdom Crowns.");
      p.crowns -= cost;
      p.unlockedTowers.push(op.tower);
    }
  } else if (op.type === "path") {
    if (
      !TYPES.includes(op.tower) ||
      !integer(op.path, 2) ||
      ![2, 3].includes(op.tier)
    )
      throw Error("Invalid path unlock.");
    const current = p.unlockedUpgrades[op.tower][op.path];
    if (current < op.tier) {
      if (current !== op.tier - 1)
        throw Error("Unlock the previous tier first.");
      const xp = p.towerXP[op.tower],
        cost = XP_COSTS[op.tier];
      if (xp.earned - xp.spent < cost) throw Error("Not enough tower XP.");
      xp.spent += cost;
      p.unlockedUpgrades[op.tower][op.path] = op.tier;
      if (op.tier === 3 && !p.achievements.includes("evolution"))
        p.achievements.push("evolution");
    }
  } else if (op.type === "hero") {
    if (!HEROES[op.hero]) throw Error("Choose an animal hero.");
    if (!p.heroes.unlocked.includes(op.hero)) {
      if (p.crowns < HEROES[op.hero].cost) throw Error("Not enough Crowns.");
      p.crowns -= HEROES[op.hero].cost;
      p.heroes.unlocked.push(op.hero);
    }
    p.heroes.equipped = op.hero;
  } else if (op.type === "relic") {
    if (
      !Array.isArray(op.equipped) ||
      op.equipped.length > 2 ||
      new Set(op.equipped).size !== op.equipped.length ||
      !op.equipped.every((k) => p.relics.unlocked.includes(k))
    )
      throw Error("Equip up to two earned relics.");
    p.relics.equipped = [...op.equipped];
  } else if (op.type === "rename") {
    p.nickname = op.nickname;
    p.avatar = op.avatar;
  } else if (op.type === "settings")
    p.settings = { ...p.settings, ...op.settings };
  else throw Error("Unknown save operation.");
  const history = [...p.statistics.ledger.split("|").filter(Boolean), op.id];
  p.statistics.ledger = "|" + history.slice(-128).join("|") + "|";
  if (p.schemaVersion === 3)
    for (const [key, relic] of Object.entries(RELICS))
      if (relic.unlock(p) && !p.relics.unlocked.includes(key))
        p.relics.unlocked.push(key);
  p.statistics.revision++;
  p.updatedAt = Date.now();
  if (!validateProfile(p)) throw Error("Invalid save operation.");
  return p;
}
export function rewardForRun(model, runId) {
  const xp = {};
  for (const t of TYPES) {
    const m = model.participation[t];
    xp[t] =
      m.damage + m.armor + m.control > 0
        ? Math.min(
            350,
            Math.floor(
              m.time * 0.45 +
                m.damage * 0.025 +
                m.armor * 0.05 +
                m.control * 0.55,
            ),
          )
        : 0;
  }
  return {
    id: runId,
    type: "reward",
    map: model.campaign.id,
    win: model.ended === "victory",
    difficulty: model.campaign.mode || null,
    hero: model.hero?.type || null,
    heroXP: model.hero
      ? Math.min(
          300,
          Math.floor(model.hero.damage * 0.012) +
            Math.max(0, model.wave - (model.skippedWaves || 0)) * 3,
        )
      : 0,
    stars: model.lives >= 18 ? 3 : model.lives >= 10 ? 2 : 1,
    xp,
    stats: {
      waves:
        model.wave -
        (model.skippedWaves || 0) -
        (model.active || model.ended === "defeat" ? 1 : 0),
      damage: Math.round(
        Object.values(model.participation).reduce((n, m) => n + m.damage, 0),
      ),
      armor: Math.round(
        Object.values(model.participation).reduce((n, m) => n + m.armor, 0),
      ),
      kills: model.kills,
    },
  };
}

export class ProfileStore {
  constructor(storage, key = "tiny-siege-profiles-v3") {
    this.storage = storage;
    this.key = key;
    this.warning = "";
    this.data = { version: 1, selected: null, profiles: {}, cloud: {} };
    try {
      const raw = storage.getItem(key);
      this.snapshot = raw;
      if (raw) {
        const data = JSON.parse(raw);
        if (data.version !== 1 || !data.profiles || !data.cloud)
          throw Error("Unsupported save");
        for (const entry of Object.values(data.profiles))
          entry.profile = migrateProfile(entry.profile);
        this.data = data;
      }
    } catch {
      this.warning =
        "Your saved data could not be loaded. Export or recover it before replacing it.";
      this.readOnly = true;
    }
  }
  persist() {
    if (this.readOnly) throw Error(this.warning);
    const disk = this.storage.getItem(this.key);
    if (disk !== this.snapshot) {
      this.warning =
        "Another Tiny Siege tab changed these saves. Export this tab’s progress, then reload to review the latest heroes.";
      throw Error(this.warning);
    }
    try {
      const next = JSON.stringify(this.data);
      this.storage.setItem(this.key, next);
      this.snapshot = next;
    } catch {
      this.warning =
        "Device storage is full or unavailable. Export a backup now.";
      throw Error(this.warning);
    }
  }
  create(nickname, avatar = "dragon", id = crypto.randomUUID()) {
    if (Object.keys(this.data.profiles).length >= 12)
      throw Error("Up to 12 profiles can live on this device.");
    const profile = freshProfile(nickname.trim(), avatar);
    if (!validateProfile(profile))
      throw Error("Choose a nickname of 1–32 letters.");
    this.data.profiles[id] = { profile, pending: [], remoteRevision: null };
    this.data.selected = id;
    this.persist();
    return id;
  }
  get current() {
    return this.data.profiles[this.data.selected]?.profile;
  }
  select(id) {
    if (!this.data.profiles[id]) throw Error("Profile not found.");
    this.data.selected = id;
    this.persist();
  }
  commit(op) {
    const entry = this.data.profiles[this.data.selected];
    if (!entry) throw Error("Choose a profile first.");
    entry.receipts ||= Object.fromEntries(
      entry.profile.statistics.ledger
        .split("|")
        .filter(Boolean)
        .map((id) => [id, true]),
    );
    if (Object.hasOwn(entry.receipts, op.id)) return entry.profile;
    const next = applyOperation(entry.profile, op);
    Object.defineProperty(entry.receipts, op.id, {
      value: true,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    if (next.statistics.revision !== entry.profile.statistics.revision)
      entry.pending.push(op);
    entry.profile = next;
    this.persist();
    return next;
  }
  saveBattle(battle) {
    const entry = this.data.profiles[this.data.selected];
    if (!entry) throw Error("Choose a profile first.");
    entry.battle = structuredClone(battle);
    const pending = entry.pending.filter((op) => op.type !== "battle");
    pending.push({
      id: crypto.randomUUID(),
      type: "battle",
      battle: entry.battle,
      expectedBattleRevision: entry.battleRevision || 0,
    });
    entry.pending = pending;
    this.persist();
  }
  remove(id) {
    delete this.data.profiles[id];
    if (this.data.selected === id) this.data.selected = null;
    this.persist();
  }
  export(owner = null) {
    if (this.readOnly) return this.storage.getItem(this.key) || "";
    return JSON.stringify(
      {
        version: 1,
        checkpoints: Object.fromEntries(
          Object.entries(this.data.profiles)
            .filter(([, e]) => !e.owner || e.owner === owner)
            .map(([id, e]) => [
              id,
              { battle: e.battle || null, receipts: e.receipts || {} },
            ]),
        ),
        profiles: Object.fromEntries(
          Object.entries(this.data.profiles)
            .filter(([, e]) => !e.owner || e.owner === owner)
            .map(([id, e]) => [id, e.profile]),
        ),
      },
      null,
      2,
    );
  }
  import(text) {
    const data = JSON.parse(text);
    if (
      data.version !== 1 ||
      !data.profiles ||
      Object.keys(data.profiles).length > 12
    )
      throw Error("Invalid backup.");
    const entries = Object.entries(data.profiles).map(([id, p]) => [
      id,
      migrateProfile(p),
    ]);
    if (Object.keys(this.data.profiles).length + entries.length > 12)
      throw Error("Not enough profile slots.");
    for (const [id] of entries) {
      const metadata = data.checkpoints?.[id];
      if (metadata?.battle && !validateBattle(metadata.battle))
        throw Error("Invalid battle backup. Existing progress kept.");
      if (
        metadata?.receipts &&
        (typeof metadata.receipts !== "object" ||
          Array.isArray(metadata.receipts) ||
          Object.keys(metadata.receipts).some(
            (k) => !/^[a-zA-Z0-9_-]{1,96}$/.test(k),
          ))
      )
        throw Error("Invalid reward history.");
    }
    // Always import as independent copies. Never silently replace an existing profile.
    for (const [sourceId, p] of entries) {
      const id = crypto.randomUUID();
      this.data.profiles[id] = {
        profile: p,
        pending: [],
        remoteRevision: null,
        battle: data.checkpoints?.[sourceId]?.battle || null,
        receipts: data.checkpoints?.[sourceId]?.receipts || {},
      };
    }
    this.persist();
    return entries.length;
  }
}
