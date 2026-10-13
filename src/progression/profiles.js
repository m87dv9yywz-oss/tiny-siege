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
export const UNLOCK_COSTS = { fire: 75, lightning: 130 };
export const XP_COSTS = { 2: 180, 3: 500 };
export const freshProfile = (
  nickname = "Little Knight",
  avatar = "dragon",
) => ({
  schemaVersion: 1,
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
  if (
    !p ||
    Object.keys(p).length !== PROFILE_FIELDS.size ||
    Object.keys(p).some((k) => !PROFILE_FIELDS.has(k)) ||
    p.schemaVersion !== 1 ||
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
    !p.unlockedTowers.every((t) => TYPES.includes(t)) ||
    !["archer", "cannon", "frost"].every((t) => p.unlockedTowers.includes(t))
  )
    return false;
  for (const t of TYPES) {
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
    Object.keys(p.towerXP).length !== 5 ||
    Object.keys(p.unlockedUpgrades).length !== 5
  )
    return false;
  if (
    !Array.isArray(p.completedMaps) ||
    p.completedMaps.length > 3 ||
    new Set(p.completedMaps).size !== p.completedMaps.length ||
    !p.completedMaps.every((m) => ["emerald", "amber", "moon"].includes(m))
  )
    return false;
  if (
    !p.mapStars ||
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
  return (
    p.settings &&
    Object.keys(p.settings).length === 2 &&
    typeof p.settings.sound === "boolean" &&
    typeof p.settings.reducedEffects === "boolean"
  );
}
export function migrateProfile(data) {
  if (data?.towerXP && Object.hasOwn(data.towerXP, "archerEarned")) {
    const keys = TYPES.flatMap((t) => [t + "Earned", t + "Spent"]);
    if (
      Object.keys(data.towerXP).length !== 10 ||
      Object.keys(data.towerXP).some((k) => !keys.includes(k))
    )
      throw Error("Invalid cloud XP data.");
    data = {
      ...data,
      towerXP: Object.fromEntries(
        TYPES.map((t) => [
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
  if (data?.schemaVersion && data.schemaVersion !== 1)
    throw Error("This save needs a newer Tiny Siege version.");
  if (validateProfile(data)) return structuredClone(data);
  if (
    data &&
    Object.keys(data.towerXP || {}).length === 0 &&
    Object.keys(data.unlockedUpgrades || {}).length === 0 &&
    integer(data.crowns)
  ) {
    p.crowns = data.crowns;
    if (!validateProfile(p)) throw Error("Invalid profile.");
    return p;
  }
  throw Error("This save is invalid. Your existing save has been kept.");
}
export function applyOperation(profile, op) {
  const p = structuredClone(profile);
  if (p.statistics.ledger.includes(`|${op.id}|`)) return p;
  if (
    typeof op.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,96}$/.test(op.id) ||
    p.statistics.ledger.length + op.id.length + 2 > 194000
  )
    throw Error("Save history is full. Export a backup before continuing.");
  if (op.type === "reward") {
    const map = CAMPAIGNS[op.map];
    if (!map || op.map === "classic" || !integer(op.stars, 3))
      throw Error("Invalid map reward.");
    if (op.win) {
      p.crowns += p.completedMaps.includes(op.map) ? map.repeat : map.first;
      if (!p.completedMaps.includes(op.map)) p.completedMaps.push(op.map);
      p.mapStars[op.map] = Math.max(p.mapStars[op.map] || 0, op.stars);
      p.statistics.wins++;
      if (!p.achievements.includes("first-clear"))
        p.achievements.push("first-clear");
      if (
        p.completedMaps.length === 3 &&
        !p.achievements.includes("three-kingdoms")
      )
        p.achievements.push("three-kingdoms");
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
  } else if (op.type === "rename") {
    p.nickname = op.nickname;
    p.avatar = op.avatar;
  } else if (op.type === "settings")
    p.settings = { ...p.settings, ...op.settings };
  else throw Error("Unknown save operation.");
  p.statistics.ledger = (p.statistics.ledger || "|") + op.id + "|";
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
    stars: model.lives >= 18 ? 3 : model.lives >= 10 ? 2 : 1,
    xp,
    stats: {
      waves: model.wave - (model.active || model.ended === "defeat" ? 1 : 0),
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
    const next = applyOperation(entry.profile, op);
    if (next.statistics.revision !== entry.profile.statistics.revision)
      entry.pending.push(op);
    entry.profile = next;
    this.persist();
    return next;
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
    // Always import as independent copies. Never silently replace an existing profile.
    for (const [, p] of entries) {
      const id = crypto.randomUUID();
      this.data.profiles[id] = {
        profile: p,
        pending: [],
        remoteRevision: null,
      };
    }
    this.persist();
    return entries.length;
  }
}
