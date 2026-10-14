import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  serverTimestamp,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { FirebaseAdapter } from "../src/cloud/firebase.js";
import { freshProfile, TYPES } from "../src/progression/profiles.js";
import { cloudProfile } from "../src/cloud/schema.js";
import { profileDocuments, battleDocuments } from "../src/cloud/v4schema.js";
import { Game } from "../src/systems/Game.js";
import { battleCheckpoint } from "../src/systems/checkpoint.js";
let env;
before(
  async () =>
    (env = await initializeTestEnvironment({
      projectId: "demo-tiny-siege",
      firestore: {
        host: "127.0.0.1",
        port: 8080,
        rules: await readFile("firestore.rules", "utf8"),
      },
    })),
);
after(async () => env?.cleanup());
const db = (uid) =>
  uid
    ? env.authenticatedContext(uid).firestore()
    : env.unauthenticatedContext().firestore();
const root = (database, id) =>
  doc(database, "users", "v4Parent", "kingdoms", id);
const part = (database, id, path) =>
  doc(database, "users", "v4Parent", "kingdoms", id, ...path.split("/"));
const seed = async (database, id, p = freshProfile()) => {
  const docs = profileDocuments(p, serverTimestamp());
  const batch = writeBatch(database);
  for (const [path, d] of Object.entries(docs))
    batch.set(
      path === "core" ? root(database, id) : part(database, id, path),
      d,
    );
  await batch.commit();
  return docs;
};
test("v4 owner-only bounded components and immutable receipts; unrelated parents, guests, orphan and deep paths denied", async () => {
  const own = db("v4Parent");
  await seed(own, "private");
  for (const other of [db("anotherParent"), db(null)]) {
    await assertFails(getDoc(root(other, "private")));
    await assertFails(
      getDocs(collection(other, "users", "v4Parent", "kingdoms")),
    );
    await assertFails(
      setDoc(part(other, "private", "towers/wind"), {
        earned: 1,
        spent: 0,
        unlocked: true,
        paths: [1, 1, 1],
        updatedAt: serverTimestamp(),
      }),
    );
  }
  await assertSucceeds(getDoc(part(own, "private", "heroes/dragon")));
  await assertSucceeds(
    getDocs(collection(own, "users", "v4Parent", "kingdoms")),
  );
  await assertFails(
    setDoc(part(own, "orphan", "towers/archer"), {
      earned: 1,
      spent: 0,
      unlocked: true,
      paths: [1, 1, 1],
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(part(own, "private", "towers/archer/roles/admin"), {
      role: "admin",
    }),
  );
  const receipt = part(own, "private", "receipts/one");
  await assertSucceeds(
    setDoc(receipt, { id: "one", kind: "reward", at: serverTimestamp() }),
  );
  await assertFails(updateDoc(receipt, { kind: "migration" }));
  await assertFails(deleteDoc(receipt));
  await assertFails(
    setDoc(part(own, "private", "receipts/bad"), {
      id: "other",
      kind: "reward",
      at: serverTimestamp(),
    }),
  );
});
test("strict create AND update validators reject malicious replacement, numeric/type/size pollution across every v4 collection", async () => {
  const own = db("v4Parent");
  await seed(own, "malformed");
  const cases = [
    ["core", (d) => (d.crowns = -1)],
    ["core", (d) => (d.statistics.role = "admin")],
    [
      "core",
      (d) => {
        delete d.nickname;
        d.owner = "v4Parent";
      },
    ],
    ["core", (d) => (d.nickname = "a".repeat(33))],
    ["towers/wind", (d) => (d.spent = d.earned + 1)],
    ["towers/rune", (d) => (d.paths = [3, 3, "3"])],
    ["towers/archer", (d) => (d.unlocked = false)],
    ["heroes/dragon", (d) => (d.xp = 1e9 + 1)],
    [
      "heroes/tiger",
      (d) => {
        d.unlocked = false;
        d.equipped = true;
      },
    ],
    ["maps/crystal", (d) => (d.easyClaims = 7)],
    ["maps/coast", (d) => (d.hard = 4)],
    ["maps/moon", (d) => (d.role = "parent")],
    ["relics/loadout", (d) => (d.equipped = ["purse", "purse"])],
    ["relics/loadout", (d) => (d.unlocked = ["evil"])],
    ["relics/loadout", (d) => (d.equipped = ["purse"])],
    ["relics/loadout", (d) => (d.unlocked = "wrong")],
  ];
  for (const [path, mutate] of cases) {
    const target =
      path === "core" ? root(own, "malformed") : part(own, "malformed", path);
    const value = (await getDoc(target)).data();
    delete value.updatedAt;
    mutate(value);
    value.updatedAt = serverTimestamp();
    await assertFails(setDoc(target, value));
    const newId = "new-" + cases.indexOf(cases.find((c) => c[1] === mutate));
    if (path === "core") await assertFails(setDoc(root(own, newId), value));
    else
      await assertFails(
        setDoc(part(own, "malformed", path.split("/")[0] + "/invalid"), value),
      );
  }
  await assertFails(
    setDoc(part(own, "malformed", "history/origin"), {
      ledger: "x".repeat(194001),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(root(own, "malformed"), { updatedAt: new Date(0) }),
  );
});
test("actual adapter migrates schema-1/2 atomically, verifies before activation and leaves original legacy bytes unchanged", async () => {
  const own = db("v4Parent"),
    adapter = new FirebaseAdapter({ db: own });
  for (const version of [1, 2]) {
    const id = "legacy-v4-" + version,
      p = freshProfile("Returning");
    p.schemaVersion = version;
    for (const k of ["heroes", "relics", "mapProgress"]) delete p[k];
    for (const t of ["wind", "rune", ...(version === 1 ? ["grove"] : [])]) {
      delete p.towerXP[t];
      delete p.unlockedUpgrades[t];
    }
    p.crowns = 222;
    p.statistics.ledger = "|old-award|";
    p.towerXP.archer = { earned: 900, spent: 680 };
    p.unlockedUpgrades.archer = [3, 1, 1];
    p.completedMaps = ["emerald"];
    p.mapStars = { emerald: 3 };
    const legacy = doc(own, "users", "v4Parent", "profiles", id);
    await setDoc(legacy, { ...cloudProfile(p), updatedAt: serverTimestamp() });
    const before = (await getDoc(legacy)).data();
    const result = await adapter.sync(
      "v4Parent",
      id,
      p,
      [
        {
          id: "old-award",
          type: "reward",
          map: "emerald",
          win: true,
          stars: 3,
          xp: { archer: 350 },
          stats: {},
        },
      ],
      0,
    );
    assert.equal(result.profile.crowns, 222);
    assert.equal(result.profile.towerXP.archer.earned, 900);
    assert.deepEqual((await getDoc(legacy)).data(), before);
    await assertFails(
      updateDoc(legacy, { crowns: 223, updatedAt: serverTimestamp() }),
    );
    assert.equal((await getDoc(root(own, id))).data().status, "active");
    const record = (await adapter.list("v4Parent")).find((p) => p.id === id);
    assert.equal(record.profile.schemaVersion, 3);
    assert.deepEqual(record.profile.unlockedUpgrades.archer, [3, 1, 1]);
    assert.equal(record.profile.mapProgress.emerald.easyClaims, 1);
  }
});
test("concurrent real adapters deduplicate ancient receipts without growing core and reject stale overspend", async () => {
  const own = db("v4Parent"),
    a = new FirebaseAdapter({ db: own }),
    b = new FirebaseAdapter({ db: db("v4Parent") });
  let p = freshProfile();
  await a.sync("v4Parent", "atomic-v4", p, [], null);
  const award = {
    id: "same-run",
    type: "reward",
    map: "crystal",
    difficulty: "easy",
    win: true,
    stars: 3,
    xp: { wind: 350 },
    stats: {},
  };
  await Promise.all([
    a.sync("v4Parent", "atomic-v4", p, [award], 0),
    b.sync("v4Parent", "atomic-v4", p, [award], 0),
  ]);
  let r = (await a.list("v4Parent")).find((r) => r.id === "atomic-v4");
  assert.equal(r.profile.crowns, 100);
  assert.equal(r.profile.towerXP.wind.earned, 350);
  await Promise.all([
    a.sync(
      "v4Parent",
      "atomic-v4",
      r.profile,
      [{ id: "wind-A", type: "tower", tower: "wind" }],
      r.profile.statistics.revision,
    ),
    b.sync(
      "v4Parent",
      "atomic-v4",
      r.profile,
      [{ id: "wind-B", type: "tower", tower: "wind" }],
      r.profile.statistics.revision,
    ),
  ]);
  r = (await a.list("v4Parent")).find((r) => r.id === "atomic-v4");
  assert.equal(r.profile.crowns, 0);
  await assert.rejects(
    a.sync(
      "v4Parent",
      "atomic-v4",
      r.profile,
      [{ id: "rune-overspend", type: "tower", tower: "rune" }],
      r.profile.statistics.revision,
    ),
  );
  await a.sync(
    "v4Parent",
    "atomic-v4",
    r.profile,
    [award],
    r.profile.statistics.revision,
  );
  r = (await a.list("v4Parent")).find((r) => r.id === "atomic-v4");
  assert.equal(r.profile.crowns, 0);
  assert.equal(r.profile.towerXP.wind.earned, 350);
  assert(
    !("ledger" in (await getDoc(root(own, "atomic-v4"))).data().statistics),
  );
});
test("checkpoint core and each placement are validated; cross-device resume and stale checkpoint conflicts are safe", async () => {
  const own = db("v4Parent"),
    a = new FirebaseAdapter({ db: own }),
    p = freshProfile();
  await a.sync("v4Parent", "battle-v4", p, [], null);
  const g = new Game(() => {}, {
    map: "emerald",
    difficulty: "hard",
    profile: p,
    hero: "dragon",
  });
  g.place("archer", 190, 80);
  const run = {
    id: "run-v4",
    profileId: "battle-v4",
    finished: false,
    heroGranted: 0,
    granted: Object.fromEntries(TYPES.map((k) => [k, 0])),
    stats: { waves: 0, damage: 0, armor: 0, kills: 0 },
  };
  const checkpoint = battleCheckpoint(g, run);
  assert(checkpoint);
  await a.sync(
    "v4Parent",
    "battle-v4",
    p,
    [
      {
        id: "checkpoint-one",
        type: "battle",
        battle: checkpoint,
        expectedBattleRevision: 0,
      },
    ],
    0,
  );
  const record = (await a.list("v4Parent")).find((r) => r.id === "battle-v4");
  assert.equal(record.battle.gold, 225);
  assert.equal(record.battle.towers.length, 1);
  assert.equal(record.battle.difficulty, "hard");
  await assert.rejects(
    a.sync(
      "v4Parent",
      "battle-v4",
      p,
      [
        {
          id: "stale-checkpoint",
          type: "battle",
          battle: checkpoint,
          expectedBattleRevision: 0,
        },
      ],
      0,
    ),
  );
  const docs = battleDocuments(checkpoint, serverTimestamp(), 2);
  for (const mutate of [
    (d) => (d.checkpoint.wave = 100),
    (d) => (d.checkpoint.run.id = "x".repeat(65)),
    (d) => (d.checkpoint.hero.level = 99),
    (d) => (d.checkpoint.towerSlots = ["evil"]),
    (d) => (d.checkpoint.hero.abilityLeft = 999),
  ]) {
    const d = structuredClone(docs["battles/current"]);
    d.updatedAt = serverTimestamp();
    mutate(d);
    await assertFails(setDoc(part(own, "battle-v4", "battles/current"), d));
  }
  const placement = docs["placements/0"];
  for (const mutate of [
    (d) => (d.paths = [2, 2, 0]),
    (d) => (d.invested = 999),
    (d) => (d.x = -1),
    (d) => (d.targeting = "SUPPORT"),
    (d) => (d.cooldown = "wait"),
  ]) {
    const d = structuredClone(placement);
    d.updatedAt = serverTimestamp();
    mutate(d);
    await assertFails(setDoc(part(own, "battle-v4", "placements/0"), d));
  }
});
