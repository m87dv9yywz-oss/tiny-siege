import { cloudProfile } from "../src/cloud/schema.js";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import {
  freshProfile as modernProfile,
  applyOperation,
  migrateProfile,
} from "../src/progression/profiles.js";
const asLegacy=(p)=>{const copy=structuredClone(p);copy.schemaVersion=2;for(const k of ['heroes','relics','mapProgress'])delete copy[k];for(const k of ['wind','rune','tidecaller']){delete copy.towerXP[k];delete copy.unlockedUpgrades[k];}return copy;};
const freshProfile=(...args)=>asLegacy(modernProfile(...args));
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-tiny-siege",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
});
after(async () => {
  try {
    const coverage = await fetch(
      "http://127.0.0.1:8080/emulator/v1/projects/demo-tiny-siege:ruleCoverage",
    ).then((r) => r.json());
    const positions = [];
    function walk(o) {
      if (!o || typeof o !== "object") return;
      if (o.sourcePosition)
        positions.push({
          position: o.sourcePosition,
          count: (o.values || []).reduce((n, v) => n + (v.count || 0), 0),
        });
      for (const v of Object.values(o)) if (typeof v === "object") walk(v);
    }
    walk(coverage);
    await mkdir("test-results", { recursive: true });
    await writeFile(
      "test-results/rule-coverage-positions.json",
      JSON.stringify(positions, null, 2),
    );
    console.log("Rule coverage positions captured:", positions.length);
  } catch (error) {
    console.log("Rule coverage unavailable:", error.message);
  }
  await env?.cleanup();
});
const database = (uid) =>
  uid
    ? env.authenticatedContext(uid).firestore()
    : env.unauthenticatedContext().firestore();
const ref = (db, id = "hero") => doc(db, "users", "parentA", "profiles", id);
const payload = () => ({
  ...cloudProfile(freshProfile("Hero")),
  updatedAt: serverTimestamp(),
});
test("owner CRUD/list allowed; guest, other parent, parent docs and deeper paths denied", async () => {
  const own = database("parentA"),
    other = database("parentB"),
    guest = database();
  await assertSucceeds(setDoc(ref(own), payload()));
  await assertSucceeds(getDoc(ref(own)));
  await assertSucceeds(
    getDocs(collection(own, "users", "parentA", "profiles")),
  );
  for (const db of [other, guest]) {
    await assertFails(getDoc(ref(db)));
    await assertFails(setDoc(ref(db), payload()));
    await assertFails(deleteDoc(ref(db)));
    await assertFails(getDocs(collection(db, "users", "parentA", "profiles")));
  }
  await assertFails(setDoc(doc(own, "users", "parentA"), {}));
  await assertFails(
    setDoc(
      doc(own, "users", "parentA", "profiles", "hero", "rewards", "a"),
      {},
    ),
  );
  await assertSucceeds(deleteDoc(ref(own)));
});
test("create and update use the same strict nested validation", async () => {
  const db = database("parentA");
  const mutations = [
    (p) => (p.crowns = -1),
    (p) => (p.crowns = 1.5),
    (p) => (p.nickname = "x".repeat(33)),
    (p) => (p.avatar = "child-photo"),
    (p) => (p.ownerId = "parentB"),
    (p) => (p.role = "admin"),
    (p) => delete p.settings,
    (p) => (p.settings.sound = "yes"),
    (p) => (p.settings.extra = true),
    (p) => (p.towerXP.archerSpent = 1),
    (p) => (p.towerXP.archerEarned = "99"),
    (p) => (p.towerXP.role = "admin"),
    (p) => (p.unlockedUpgrades.fire = [1, 2, 9]),
    (p) => (p.unlockedTowers = ["archer", "cannon", "frost", "hacked"]),
    (p) => (p.unlockedTowers = ["archer", "cannon", "frost", "frost"]),
    (p) => (p.mapStars.fake = 3),
    (p) => (p.mapStars.emerald = 4),
    (p) => (p.completedMaps = ["unknown"]),
    (p) => (p.achievements = ["unknown"]),
    (p) => (p.statistics.ledger = "not-a-safe-ledger"),
    (p) => (p.statistics.ledger = "x".repeat(194001)),
    (p) => (p.statistics.kills = -1),
    (p) => (p.updatedAt = new Date(0)),
    (p) => (p.schemaVersion = 3),
    (p) => {
      delete p.avatar;
      p.role = "admin";
    },
    (p) => {
      delete p.towerXP.cannonSpent;
      p.towerXP.role = 0;
    },
    (p) => {
      delete p.unlockedUpgrades.frost;
      p.unlockedUpgrades.hacked = [1, 1, 1];
    },
    (p) => {
      delete p.statistics.kills;
      p.statistics.role = 0;
    },
    (p) => {
      delete p.settings.sound;
      p.settings.extra = false;
    },
  ];
  for (let i = 0; i < mutations.length; i++) {
    const create = payload();
    mutations[i](create);
    await assertFails(setDoc(ref(db, "bad" + i), create));
    const target = ref(db, "update" + i);
    await assertSucceeds(setDoc(target, payload()));
    const update = payload();
    mutations[i](update);
    await assertFails(setDoc(target, update));
  }
  await assertSucceeds(
    updateDoc(ref(db, "update0"), {
      nickname: "New name",
      updatedAt: serverTimestamp(),
    }),
  );
});
test("two independently connected clients atomically converge without duplicate rewards or stale overspend", async () => {
  const first = database("parentA"),
    second = database("parentA"),
    initial = freshProfile("Cloud hero");
  await setDoc(
    ref(first, "atomic"),
    cloudProfile({
      ...initial,
      updatedAt: serverTimestamp(),
    }),
  );
  const grant = {
    id: "run-clear",
    type: "reward",
    map: "emerald",
    win: true,
    stars: 3,
    xp: { archer: 800 },
    stats: {},
  };
  const commit = (db, op) =>
    runTransaction(db, async (tx) => {
      const target = ref(db, "atomic");
      const snap = await tx.get(target);
      const p = applyOperation(migrateProfile(snap.data()), op);
      tx.set(target, cloudProfile({ ...asLegacy(p), updatedAt: serverTimestamp() }));
      return p;
    });
  await Promise.all([commit(first, grant), commit(second, grant)]);
  let p = migrateProfile((await getDoc(ref(first, "atomic"))).data());
  assert.equal(p.crowns, 100);
  assert.equal(p.towerXP.archer.earned, 800);
  await Promise.all([
    commit(first, { id: "fire-A", type: "tower", tower: "fire" }),
    commit(second, { id: "fire-B", type: "tower", tower: "fire" }),
  ]);
  p = migrateProfile((await getDoc(ref(second, "atomic"))).data());
  assert.equal(p.crowns, 25);
  assert(p.unlockedTowers.includes("fire"));
  await assert.rejects(
    commit(second, { id: "lightning", type: "tower", tower: "lightning" }),
  );
  assert.equal((await getDoc(ref(first, "atomic"))).data().crowns, 25);
});

test("fully progressed profiles at schema bounds remain writable", async () => {
  const db = database("parentA"),
    p = payload();
  p.crowns = 1000000000;
  p.unlockedTowers = [
    "archer",
    "cannon",
    "frost",
    "fire",
    "lightning",
    "grove",
  ];
  p.completedMaps = ["emerald", "amber", "moon", "garden"];
  p.mapStars = { emerald: 3, amber: 3, moon: 3, garden: 3 };
  p.achievements = ["first-clear", "three-kingdoms", "evolution"];
  for (const type of p.unlockedTowers) {
    p.towerXP[type + "Earned"] = 1000000000;
    p.towerXP[type + "Spent"] = 1000000000;
    p.unlockedUpgrades[type] = [3, 3, 3];
  }
  for (const k of ["revision", "wins", "waves", "damage", "armor", "kills"])
    p.statistics[k] = 1000000000;
  p.statistics.ledger = "|" + ("x".repeat(96) + "|").repeat(1980);
  await assertSucceeds(
    setDoc(ref(db, "full-bounds-short-history"), {
      ...p,
      statistics: { ...p.statistics, ledger: "" },
    }),
  );
  await assertSucceeds(setDoc(ref(db, "full-bounds"), p));
  const legacy = {
    ...p,
    schemaVersion: 1,
    towerXP: { ...p.towerXP },
    unlockedUpgrades: { ...p.unlockedUpgrades },
    completedMaps: ["emerald", "amber", "moon"],
    mapStars: { emerald: 3, amber: 3, moon: 3 },
    unlockedTowers: p.unlockedTowers.filter((t) => t !== "grove"),
  };
  delete legacy.towerXP.groveEarned;
  delete legacy.towerXP.groveSpent;
  delete legacy.unlockedUpgrades.grove;
  await assertSucceeds(setDoc(ref(db, "legacy-full-bounds"), legacy));
  await assertSucceeds(
    updateDoc(ref(db, "legacy-full-bounds"), {
      nickname: "Legacy still playable",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("legacy v3 profiles migrate to schema 2 with Grove and garden, but older clients cannot downgrade them", async () => {
  const db = database("parentA");
  const legacy = payload();
  legacy.schemaVersion = 1;
  delete legacy.towerXP.groveEarned;
  delete legacy.towerXP.groveSpent;
  delete legacy.unlockedUpgrades.grove;
  const target = ref(db, "legacy-migration");
  await assertSucceeds(setDoc(target, legacy));
  const upgraded = migrateProfile((await getDoc(target)).data());
  upgraded.unlockedTowers.push("grove");
  upgraded.completedMaps.push("garden");
  upgraded.mapStars.garden = 3;
  await assertSucceeds(
    setDoc(target, cloudProfile({ ...asLegacy(upgraded), updatedAt: serverTimestamp() })),
  );
  await assertFails(setDoc(target, legacy));
  for (const mutate of [
    (p) => (p.towerXP.groveSpent = 1),
    (p) => (p.unlockedUpgrades.grove = [1, 4, 1]),
    (p) => (p.mapStars.garden = 4),
    (p) => (p.towerXP.groveEarned = "99"),
    (p) => delete p.towerXP.groveSpent,
  ]) {
    const data = payload();
    mutate(data);
    await assertFails(setDoc(ref(db, "bad-grove"), data));
    await assertFails(setDoc(target, data));
  }
});
