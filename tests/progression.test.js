import test from "node:test";
import assert from "node:assert/strict";
import {
  freshProfile,
  applyOperation,
  validateProfile,
  ProfileStore,
  rewardForRun,
  TYPES,
} from "../src/progression/profiles.js";
import { mergeProfiles } from "../src/cloud/firebase.js";
import { Game } from "../src/systems/Game.js";
const reward = (id, map = "emerald", xp = {}) => ({
  id,
  type: "reward",
  map,
  win: true,
  stars: 3,
  xp,
  stats: {},
});
const memory = () => ({
  value: null,
  getItem() {
    return this.value;
  },
  setItem(k, v) {
    this.value = v;
  },
});
test("profiles isolate progression, survive reload, rename and delete independently", () => {
  const disk = memory(),
    s = new ProfileStore(disk);
  const a = s.create("Dragon"),
    b = s.create("Fox", "fox");
  s.select(a);
  s.commit(reward("first"));
  assert.equal(s.current.crowns, 100);
  s.select(b);
  assert.equal(s.current.crowns, 0);
  s.commit({ id: "rename", type: "rename", nickname: "Owl", avatar: "owl" });
  const loaded = new ProfileStore(disk);
  assert.equal(loaded.current.nickname, "Owl");
  loaded.select(a);
  assert.equal(loaded.current.crowns, 100);
  loaded.remove(b);
  assert.equal(loaded.current.crowns, 100);
});
test("first-clear idempotency, repeats, tower unlock accounting and Crown targets", () => {
  let p = applyOperation(freshProfile(), reward("first"));
  assert.equal(p.crowns, 100);
  assert.deepEqual(applyOperation(p, reward("first")), p);
  p = applyOperation(p, { id: "fire", type: "tower", tower: "fire" });
  assert.equal(p.crowns, 25);
  assert.throws(() =>
    applyOperation(p, { id: "lightning", type: "tower", tower: "lightning" }),
  );
  p = applyOperation(p, reward("second", "amber"));
  assert.equal(p.crowns, 145);
  p = applyOperation(p, { id: "lightning", type: "tower", tower: "lightning" });
  assert.equal(p.crowns, 15);
  p = applyOperation(p, reward("third"));
  assert.equal(p.crowns, 50);
});
test("XP earned versus spent, permanent paths distinct from battle purchases", () => {
  let p = applyOperation(
    freshProfile(),
    reward("xp", "emerald", { archer: 800 }),
  );
  p = applyOperation(p, {
    id: "tier2",
    type: "path",
    tower: "archer",
    path: 0,
    tier: 2,
  });
  p = applyOperation(p, {
    id: "tier3",
    type: "path",
    tower: "archer",
    path: 0,
    tier: 3,
  });
  assert.deepEqual(p.towerXP.archer, { earned: 800, spent: 680 });
  assert.equal(p.unlockedUpgrades.archer[0], 3);
  const g = new Game(() => {}, { map: "emerald", profile: p });
  const t = g.place("archer", 145, 105);
  assert.equal(t.paths[0], 0);
  g.upgrade(t.id, 0);
  assert.equal(g.gold, 125);
  assert.equal(p.towerXP.archer.spent, 680);
  const basic = new Game(() => {}, { map: "emerald", profile: freshProfile() });
  assert.equal(basic.place("fire", 145, 105), null);
  const a = basic.place("archer", 145, 105);
  basic.upgrade(a.id, 0);
  basic.gold = 1000;
  assert.equal(basic.upgrade(a.id, 0), false);
  const classic = new Game(() => {}, {
    map: "classic",
    profile: freshProfile(),
  });
  assert(classic.place("fire", 145, 105));
});
test("JSON backups import as independent copies, corrupted and future data never overwrite", () => {
  const disk = memory(),
    s = new ProfileStore(disk);
  s.create("A");
  s.commit(reward("a"));
  const backup = s.export();
  s.import(backup);
  assert.equal(Object.keys(s.data.profiles).length, 2);
  const before = s.export();
  assert.throws(() => s.import("{"));
  assert.equal(s.export(), before);
  disk.value = "{broken";
  const bad = new ProfileStore(disk);
  assert(bad.warning);
  assert.throws(() => bad.create("B"));
  assert.equal(disk.value, "{broken");
  assert.equal(bad.export(), "{broken");
});
test("explicit merge retains originals and never adds balances or duplicates first clear", () => {
  let a = applyOperation(
      freshProfile("A"),
      reward("clear", "emerald", { archer: 800 }),
    ),
    b = structuredClone(a);
  a = applyOperation(a, { id: "unlock", type: "tower", tower: "fire" });
  const merged = mergeProfiles(a, b);
  assert.equal(merged.crowns, 25);
  assert(merged.unlockedTowers.includes("fire"));
  assert.equal(merged.completedMaps.length, 1);
  assert.equal(a.crowns, 25);
  const after = applyOperation(merged, reward("clear"));
  assert.equal(after.crowns, 25);
});
test("strict local validation rejects malformed nested saves", () => {
  const p = freshProfile();
  assert(validateProfile(p));
  for (const mutate of [
    (p) => (p.crowns = -1),
    (p) => (p.towerXP.archer.spent = 1),
    (p) => (p.unlockedUpgrades.fire = [9]),
    (p) => (p.avatar = "https://photo"),
    (p) => (p.statistics.ledger = "invalid reward"),
    (p) => (p.completedMaps = ["fake"]),
  ]) {
    const v = structuredClone(p);
    mutate(v);
    assert(!validateProfile(v));
  }
});
test("maps have distinct shared paths, manual waves and correct lengths", () => {
  const classic = new Game(),
    emerald = new Game(() => {}, { map: "emerald" }),
    amber = new Game(() => {}, { map: "amber" }),
    moon = new Game(() => {}, { map: "moon" });
  assert.equal(classic.totalWaves, 20);
  assert.equal(emerald.totalWaves, 14);
  assert.notDeepEqual(amber.trail.PATH, moon.trail.PATH);
  assert.notDeepEqual(classic.trail.PATH, amber.trail.PATH);
  emerald.wave = 13;
  emerald.startWave();
  emerald.queue = [];
  emerald.step(0.1);
  assert.equal(emerald.ended, "victory");
});
test("XP rewards include actual armor and control contributions and are bounded", () => {
  const g = new Game(() => {}, { map: "emerald" });
  g.participation.frost = {
    time: 100,
    damage: 0,
    armor: 0,
    control: 100,
    kills: 0,
  };
  g.participation.cannon = {
    time: 100,
    damage: 100000,
    armor: 100000,
    control: 0,
    kills: 0,
  };
  const op = rewardForRun(g, "run");
  assert.equal(op.xp.frost, 100);
  assert.equal(op.xp.cannon, 350);
  assert.equal(op.xp.fire, 0);
});
test("empty reviewed merge is valid and backups exclude other parents", () => {
  const empty = mergeProfiles(freshProfile("A"), freshProfile("B"));
  assert(validateProfile(empty));
  const s = new ProfileStore(memory()),
    id = s.create("Guest");
  s.data.profiles.secret = {
    profile: freshProfile("Other family"),
    owner: "other",
    pending: [],
  };
  assert.deepEqual(Object.keys(JSON.parse(s.export("parent")).profiles), [id]);
});
test("queued actions arriving during cloud sync survive and concurrent unlocks spend once", async () => {
  const { CloudSaves } = await import("../src/cloud/firebase.js");
  const previousWindow = globalThis.window;
  globalThis.window = { addEventListener() {} };
  Object.defineProperty(navigator, "onLine", {
    value: true,
    configurable: true,
  });
  const store = new ProfileStore(memory()),
    id = store.create("Sync hero");
  const remote = freshProfile("Sync hero");
  store.data.profiles[id].owner = "parent";
  store.data.profiles[id].cloudId = id;
  store.data.profiles[id].remoteRevision = 0;
  let state = remote,
    release,
    first = true;
  const adapter = {
    observe() {
      return () => {};
    },
    async list() {
      return [{ id, profile: structuredClone(state) }];
    },
    async sync(uid, id, initial, ops) {
      if (first) {
        first = false;
        await new Promise((resolve) => (release = resolve));
      }
      for (const op of ops) state = applyOperation(state, op);
      return structuredClone(state);
    },
  };
  const saves = new CloudSaves(store, adapter);
  saves.uid = "parent";
  store.commit(reward("grant-during-sync"));
  const syncing = saves.sync();
  while (!release) await new Promise((resolve) => setTimeout(resolve, 0));
  store.commit({ id: "unlock-during-sync", type: "tower", tower: "fire" });
  release();
  await syncing;
  assert.equal(store.current.crowns, 25);
  assert.equal(state.crowns, 25);
  assert.equal(store.data.profiles[id].pending.length, 0);
  assert.equal(saves.status, "Cloud saved");
  await saves.session(null);
  assert.equal(store.data.selected, null);
  globalThis.window = previousWindow;
  delete navigator.onLine;
});

test("repeated guest merges cannot replenish spent Crowns or XP", () => {
  let guest = applyOperation(
    freshProfile(),
    reward("guest-clear", "emerald", { archer: 800 }),
  );
  let cloud = applyOperation(guest, {
    id: "spent-fire",
    type: "tower",
    tower: "fire",
  });
  cloud = applyOperation(cloud, {
    id: "spent-xp",
    type: "path",
    tower: "archer",
    path: 0,
    tier: 2,
  });
  for (let i = 0; i < 5; i++) {
    cloud = mergeProfiles(cloud, guest);
    assert.equal(cloud.crowns, 25);
    assert.equal(cloud.towerXP.archer.spent, 180);
  }
});

test("stale local tabs cannot silently overwrite another hero’s saved progress", () => {
  const disk = memory(),
    a = new ProfileStore(disk);
  const hero = a.create("A");
  const b = new ProfileStore(disk);
  b.create("B");
  const latest = disk.value;
  assert.throws(() => a.commit(reward("stale-tab")), /Another Tiny Siege tab/);
  assert.equal(disk.value, latest);
  assert.equal(Object.keys(JSON.parse(disk.value).profiles).length, 2);
  assert.equal(JSON.parse(a.export()).profiles[hero].crowns, 100);
});
