import { HEROES } from "../data/heroes.js";
import {
  COMPONENTS,
  profileDocuments,
  assembleProfile,
  battleDocuments,
  assembleBattle,
} from "./v4schema.js";
import { cloudProfile } from "./schema.js";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  onAuthStateChanged,
  signOut,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocsFromServer,
  getDocFromServer,
  writeBatch,
  doc,
  runTransaction,
  serverTimestamp,
  deleteDoc,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  applyOperation,
  migrateProfile,
  validateProfile,
  TYPES,
  UNLOCK_COSTS,
} from "../progression/profiles.js";

// Public web-app identifiers from the verified issue #2 Firebase handoff.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAIXDhiceZZ0OSSXRgT4Ifdwgcw2dAc3hU",
  authDomain: "tiny-siege-game.firebaseapp.com",
  projectId: "tiny-siege-game",
  appId: "1:909962953566:web:6570b18461d993a05e45cf",
  messagingSenderId: "909962953566",
};
export function mergeLedger(a, b) {
  const ids = [...new Set((a + b).split("|").filter(Boolean))];
  return ids.length ? "|" + ids.join("|") + "|" : "";
}
export function mergeProfiles(cloud, guest) {
  const p = structuredClone(cloud);
  // Conservative explicit merge: balances are never added, preventing duplicate
  // first-clear/import awards. Both originals remain exportable on this device.
  const spent = (p) =>
    p.unlockedTowers.reduce((n, t) => n + (UNLOCK_COSTS[t] || 0), 0) +
    (p.heroes?.unlocked || []).reduce((n, h) => n + (HEROES[h]?.cost || 0), 0);
  const earnedCrowns = Math.max(
    cloud.crowns + spent(cloud),
    guest.crowns + spent(guest),
  );
  p.unlockedTowers = [
    ...new Set([...cloud.unlockedTowers, ...guest.unlockedTowers]),
  ];
  p.crowns = earnedCrowns - spent(p);
  p.completedMaps = [
    ...new Set([...cloud.completedMaps, ...guest.completedMaps]),
  ];
  for (const m of p.completedMaps)
    p.mapStars[m] = Math.max(cloud.mapStars[m] || 0, guest.mapStars[m] || 0);
  p.achievements = [...new Set([...cloud.achievements, ...guest.achievements])];
  if (p.schemaVersion === 3) {
    p.heroes.unlocked = [
      ...new Set([...cloud.heroes.unlocked, ...guest.heroes.unlocked]),
    ];
    p.crowns = earnedCrowns - spent(p);
    for (const type of Object.keys(p.heroes.xp))
      p.heroes.xp[type] = Math.max(
        cloud.heroes.xp[type],
        guest.heroes.xp[type],
      );
    p.relics.unlocked = [
      ...new Set([...cloud.relics.unlocked, ...guest.relics.unlocked]),
    ];
    for (const map of p.completedMaps) {
      const a = cloud.mapProgress[map],
        b = guest.mapProgress[map];
      if (a || b)
        p.mapProgress[map] = Object.fromEntries(
          [
            "easy",
            "medium",
            "hard",
            "easyClaims",
            "mediumClaims",
            "hardClaims",
          ].map((k) => [k, Math.max(a?.[k] || 0, b?.[k] || 0)]),
        );
    }
  }
  for (const t of TYPES) {
    p.towerXP[t].earned = Math.max(
      cloud.towerXP[t].earned,
      guest.towerXP[t].earned,
    );
    p.unlockedUpgrades[t] = cloud.unlockedUpgrades[t].map((n, i) =>
      Math.max(n, guest.unlockedUpgrades[t][i]),
    );
    const cost = p.unlockedUpgrades[t].reduce(
      (n, v) => n + (v >= 2 ? 180 : 0) + (v >= 3 ? 500 : 0),
      0,
    );
    p.towerXP[t].spent = Math.max(
      cost,
      cloud.towerXP[t].spent,
      guest.towerXP[t].spent,
    );
  }
  p.statistics.ledger = mergeLedger(
    cloud.statistics.ledger,
    guest.statistics.ledger,
  );
  for (const k of ["wins", "waves", "damage", "armor", "kills"])
    p.statistics[k] = Math.max(cloud.statistics[k], guest.statistics[k]);
  p.statistics.revision = cloud.statistics.revision + 1;
  if (!validateProfile(p))
    throw Error(
      "These saves cannot be merged safely. Import as a separate profile instead.",
    );
  return p;
}
export class FirebaseAdapter {
  constructor({ db = null, auth = null } = {}) {
    if (db) {
      this.db = db;
      this.auth = auth;
      return;
    }
    const emulated =
      import.meta.env?.DEV &&
      new URLSearchParams(location.search).has("emulators");
    const app = initializeApp({
      ...FIREBASE_CONFIG,
      ...(emulated ? { projectId: "demo-tiny-siege" } : {}),
    });
    this.auth = getAuth(app);
    this.db = getFirestore(app);
    // Opt-in only, development build only. Production never uses test auth.
    if (emulated) {
      connectAuthEmulator(this.auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
      connectFirestoreEmulator(this.db, "127.0.0.1", 8080);
    }
  }
  observe(cb) {
    return onAuthStateChanged(this.auth, cb);
  }
  signIn() {
    return signInWithPopup(this.auth, new GoogleAuthProvider());
  }
  credential(token) {
    return signInWithCredential(
      this.auth,
      GoogleAuthProvider.credential(token),
    );
  }
  signOut() {
    return signOut(this.auth);
  }
  v4(uid, id, path = "core") {
    return path === "core"
      ? doc(this.db, "users", uid, "kingdoms", id)
      : doc(this.db, "users", uid, "kingdoms", id, ...path.split("/"));
  }
  reference(uid, id) {
    return doc(this.db, "users", uid, "profiles", id);
  }
  async readV4(uid, id, core) {
    const snapshots = await Promise.all(
      COMPONENTS.map((path) => getDocFromServer(this.v4(uid, id, path))),
    );
    const parts = Object.fromEntries(
      snapshots.map((snap, i) => [
        COMPONENTS[i],
        snap.exists() ? snap.data() : null,
      ]),
    );
    const profile = assembleProfile(core, parts);
    const b = await getDocFromServer(this.v4(uid, id, "battles/current"));
    let battle = null;
    if (b.exists() && b.data().present) {
      const slots = b.data().checkpoint.towerSlots;
      const towers = await Promise.all(
        slots.map((slot) =>
          getDocFromServer(this.v4(uid, id, "placements/" + slot)),
        ),
      );
      const progress = await Promise.all(
        TYPES.map((type) =>
          getDocFromServer(this.v4(uid, id, "battleProgress/" + type)),
        ),
      );
      battle = assembleBattle(
        b.data(),
        Object.fromEntries(
          towers.map((snap, i) => [
            slots[i],
            snap.exists() ? snap.data() : null,
          ]),
        ),
        Object.fromEntries(
          progress.map((snap, i) => [
            TYPES[i],
            snap.exists() ? snap.data() : null,
          ]),
        ),
      );
    }
    return {
      id,
      profile,
      battle,
      battleRevision: b.exists() ? b.data().revision : 0,
    };
  }
  async list(uid) {
    const [legacy, newer] = await Promise.all([
      getDocsFromServer(collection(this.db, "users", uid, "profiles")),
      getDocsFromServer(collection(this.db, "users", uid, "kingdoms")),
    ]);
    const covered = new Set(newer.docs.map((d) => d.id));
    const records = legacy.docs
      .filter((d) => !covered.has(d.id))
      .map((d) => ({
        id: d.id,
        profile: migrateProfile(d.data()),
        battle: null,
        battleRevision: 0,
      }));
    for (const d of newer.docs)
      if (d.data().status === "active")
        records.push(await this.readV4(uid, d.id, d.data()));
    return records;
  }
  async sync(
    uid,
    id,
    initial,
    operations,
    expectedRevision = null,
    resolution = null,
    initialReceipts = [],
  ) {
    if (operations.length > 50)
      throw Error("Sync a maximum of 50 queued actions at a time.");
    const root = this.v4(uid, id);
    const outcome = await runTransaction(this.db, async (tx) => {
      const [core, legacy] = await Promise.all([
        tx.get(root),
        tx.get(this.reference(uid, id)),
      ]);
      if (core.exists() && core.data().status === "deleted")
        throw Error(
          "This cloud hero was deleted. Import your local save as a new hero.",
        );
      if (!core.exists() && !legacy.exists() && expectedRevision !== null)
        throw Error("This cloud hero was deleted on another device.");
      if (
        (core.exists() || legacy.exists()) &&
        expectedRevision === null &&
        !resolution
      )
        throw Error(
          "A cloud hero with this ID already exists. Review merge or replace.",
        );
      let p;
      const snapshots = core.exists()
        ? await Promise.all(
            COMPONENTS.map((path) => tx.get(this.v4(uid, id, path))),
          )
        : [];
      if (core.exists())
        p = assembleProfile(
          core.data(),
          Object.fromEntries(
            snapshots.map((snap, i) => [
              COMPONENTS[i],
              snap.exists() ? snap.data() : null,
            ]),
          ),
        );
      else
        p = legacy.exists()
          ? migrateProfile(legacy.data())
          : migrateProfile(initial);
      const origin = core.exists()
        ? await tx.get(this.v4(uid, id, "history/origin"))
        : { exists: () => false };
      const oldLedger = origin.exists()
        ? origin.data().ledger
        : legacy.exists()
          ? legacy.data().statistics.ledger
          : initial.statistics.ledger;
      const bRef = this.v4(uid, id, "battles/current"),
        battleSnap = core.exists()
          ? await tx.get(bRef)
          : { exists: () => false };
      let battleRevision = battleSnap.exists() ? battleSnap.data().revision : 0;
      const receipts = core.exists()
        ? await Promise.all(
            operations.map((op) =>
              tx.get(this.v4(uid, id, "receipts/" + op.id)),
            ),
          )
        : operations.map(() => ({ exists: () => false }));
      const changes = operations.filter(
        (op, i) =>
          !receipts[i].exists() && !oldLedger.includes("|" + op.id + "|"),
      );
      if (
        resolution &&
        p.statistics.revision !== expectedRevision &&
        core.exists()
      )
        throw Error("The cloud save changed again. Review the latest version.");
      if (resolution === "merge") p = mergeProfiles(p, migrateProfile(initial));
      if (resolution === "replace")
        p = {
          ...migrateProfile(initial),
          statistics: {
            ...initial.statistics,
            revision: p.statistics.revision + 1,
          },
        };
      let battleChange = null;
      for (const op of changes) {
        if (op.type === "battle") {
          if (op.expectedBattleRevision !== battleRevision)
            throw Error(
              "This battle changed on another device. Export your local checkpoint and review the cloud version.",
            );
          battleRevision++;
          battleChange = op;
        } else p = applyOperation(p, op);
      }
      // Activation follows server read-back and receipt seeding; legacy data is
      // never deleted or replaced by migration. Transactions are atomic.
      const status = core.exists() ? core.data().status : "migrating";
      const docs = profileDocuments(p, serverTimestamp(), status);
      for (const [path, data] of Object.entries(docs)) {
        const previous =
          path === "core" ? core : snapshots[COMPONENTS.indexOf(path)];
        const comparable = (d) =>
          JSON.stringify(
            Object.fromEntries(
              Object.entries(d).filter(([k]) => k !== "updatedAt"),
            ),
          );
        if (
          !previous?.exists() ||
          comparable(previous.data()) !== comparable(data)
        )
          tx.set(this.v4(uid, id, path), data);
      }
      if (!origin.exists())
        tx.set(this.v4(uid, id, "history/origin"), {
          ledger: oldLedger,
          updatedAt: serverTimestamp(),
        });
      if (battleChange)
        for (const [path, data] of Object.entries(
          battleDocuments(
            battleChange.battle,
            serverTimestamp(),
            battleRevision,
          ),
        ))
          tx.set(this.v4(uid, id, path), data);
      for (const op of changes)
        tx.set(this.v4(uid, id, "receipts/" + op.id), {
          id: op.id,
          kind: op.type,
          at: serverTimestamp(),
        });
      return { profile: p, battleRevision, migrating: status === "migrating" };
    });
    if (outcome.migrating) {
      // Seed all durable guest receipts, in bounded batches, before advertising
      // the imported profile. A retry reads existing immutable receipts first.
      const ids = [...new Set(initialReceipts)];
      if (
        ids.some(
          (key) =>
            typeof key !== "string" || !/^[a-zA-Z0-9_-]{1,96}$/.test(key),
        )
      )
        throw Error("Invalid imported reward history.");
      for (let offset = 0; offset < ids.length; offset += 300) {
        const chunk = ids.slice(offset, offset + 300);
        const existing = await Promise.all(
          chunk.map((key) =>
            getDocFromServer(this.v4(uid, id, "receipts/" + key)),
          ),
        );
        const batch = writeBatch(this.db);
        let writes = 0;
        chunk.forEach((key, i) => {
          if (!existing[i].exists()) {
            batch.set(this.v4(uid, id, "receipts/" + key), {
              id: key,
              kind: "migration",
              at: serverTimestamp(),
            });
            writes++;
          }
        });
        if (writes) await batch.commit();
      }
      const core = await getDocFromServer(root);
      const verified = await this.readV4(uid, id, core.data());
      if (!validateProfile(verified.profile))
        throw Error("Migration verification failed; original data retained.");
      await runTransaction(this.db, async (tx) => {
        const current = await tx.get(root);
        if (
          current.data().statistics.revision !==
          verified.profile.statistics.revision
        )
          throw Error("Migration changed during verification.");
        tx.update(root, { status: "active", updatedAt: serverTimestamp() });
      });
    }
    return { profile: outcome.profile, battleRevision: outcome.battleRevision };
  }
  async remove(uid, id) {
    const root = this.v4(uid, id),
      snap = await getDocFromServer(root);
    // Tombstone first so stale tabs and retained legacy copies cannot resurrect
    // a deleted profile. Component access is denied after deletion.
    await runTransaction(this.db, async (tx) => {
      const current = await tx.get(root);
      if (current.exists())
        tx.update(root, {
          status: "deleted",
          nickname: "Removed",
          crowns: 0,
          updatedAt: serverTimestamp(),
        });
      else
        tx.set(
          root,
          profileDocuments(
            migrateProfile((await tx.get(this.reference(uid, id))).data()),
            serverTimestamp(),
            "deleted",
          ).core,
        );
    });
    await deleteDoc(this.reference(uid, id));
  }
}

export class CloudSaves {
  constructor(store, adapter, onChange = () => {}) {
    this.store = store;
    this.adapter = adapter;
    this.onChange = onChange;
    this.uid = null;
    this.status = "Saved locally";
    this.busy = false;
    this.unsubscribe = adapter.observe((user) => this.session(user));
    this.online = () =>
      this.refresh().catch(() =>
        this.setStatus("Cloud unavailable · saved locally"),
      );
    window.addEventListener("online", this.online);
    this.offline = () => this.setStatus("Offline · saved locally");
    window.addEventListener("offline", this.offline);
    this.focus = () => {
      if (this.uid && !this.busy)
        this.refresh().catch(() => this.setStatus("Offline · saved locally"));
    };
    window.addEventListener("focus", this.focus);
  }
  setStatus(value) {
    this.status = value;
    this.onChange();
  }
  async session(user) {
    this.uid = user?.uid || null;
    if (
      this.store.data.profiles[this.store.data.selected]?.owner &&
      this.store.data.profiles[this.store.data.selected].owner !== this.uid
    ) {
      this.store.data.selected = null;
      this.store.persist();
    }
    if (!this.uid) {
      if (this.store.data.profiles[this.store.data.selected]?.owner) {
        this.store.data.selected = null;
        this.store.persist();
      }
      this.setStatus("Guest · saved locally");
      return;
    }
    if (!navigator.onLine) {
      this.setStatus("Offline · saved locally");
      return;
    }
    try {
      await this.refresh();
      this.setStatus("Cloud saved");
    } catch {
      this.setStatus("Cloud unavailable · saved locally");
    }
  }
  async refresh() {
    const uid = this.uid;
    if (!uid) return;
    const records = await this.adapter.list(uid);
    if (this.uid !== uid) return;
    for (const record of records) {
      const key = `${uid}:${record.id}`,
        entry = this.store.data.profiles[key];
      if (!entry)
        this.store.data.profiles[key] = {
          profile: record.profile,
          pending: [],
          remoteRevision: record.profile.statistics.revision,
          owner: uid,
          cloudId: record.id,
          battle: record.battle || null,
          battleRevision: record.battleRevision || 0,
        };
      else if (!entry.pending.length) {
        entry.profile = record.profile;
        entry.remoteRevision = record.profile.statistics.revision;
        entry.battle = record.battle || null;
        entry.battleRevision = record.battleRevision || 0;
      }
    }
    this.store.persist();
    this.onChange();
    await this.sync();
    if (!this.busy && !this.conflict) this.setStatus("Cloud saved");
  }
  async sync() {
    const uid = this.uid,
      key = this.store.data.selected,
      entry = this.store.data.profiles[key];
    if (this.busy || !uid || entry?.owner !== uid || !entry.pending.length)
      return;
    if (!navigator.onLine) {
      this.setStatus("Offline · saved locally");
      return;
    }
    this.busy = true;
    this.setStatus("Syncing…");
    const operations = structuredClone(entry.pending.slice(0, 50)),
      ids = new Set(operations.map((op) => op.id));
    try {
      const result = await this.adapter.sync(
        uid,
        entry.cloudId,
        entry.profile,
        operations,
        entry.remoteRevision,
      );
      // Purchases/rewards may have arrived while the transaction was running.
      const remaining = entry.pending.filter((op) => !ids.has(op.id));
      const profile = result.profile || result;
      entry.profile = remaining
        .filter((op) => op.type !== "battle")
        .reduce(applyOperation, profile);
      entry.battleRevision = result.battleRevision || entry.battleRevision || 0;
      remaining
        .filter((op) => op.type === "battle")
        .forEach((op) => (op.expectedBattleRevision = entry.battleRevision));
      entry.pending = remaining;
      entry.remoteRevision = profile.statistics.revision;
      this.store.persist();
      this.setStatus("Cloud saved");
    } catch (error) {
      this.conflict = { key, message: error.message };
      this.setStatus("Sync needs review · local save kept");
    } finally {
      this.busy = false;
    }
    if (entry.pending.length && !this.conflict) await this.sync();
  }
  async importGuest(
    guestId,
    targetId = null,
    resolution = "new",
    reviewedRevision = null,
    reviewedBattleRevision = null,
  ) {
    if (!this.uid) throw Error("A parent must sign in first.");
    const guest = this.store.data.profiles[guestId];
    if (!guest || guest.owner) throw Error("Choose a guest profile.");
    const id = targetId || guestId;
    const targetEntry = this.store.data.profiles[`${this.uid}:${id}`];
    if (targetEntry?.pending.length)
      throw Error(
        "Sync the target hero's queued actions before importing. Your local progress has been kept.",
      );
    const remote = (await this.adapter.list(this.uid)).find((r) => r.id === id);
    if (remote && !targetId)
      throw Error(
        "This guest profile is already in the cloud. Choose Merge or Replace explicitly.",
      );
    if (
      remote &&
      targetId &&
      reviewedRevision !== null &&
      remote.profile.statistics.revision !== reviewedRevision
    )
      throw Error(
        "The cloud hero changed since this review. Refresh cloud saves and review the latest version.",
      );
    if (
      remote &&
      reviewedBattleRevision !== null &&
      reviewedBattleRevision !== (remote.battleRevision || 0)
    )
      throw Error(
        "The cloud battle changed since review. Review it again before replacing.",
      );
    const importedBattle =
      !remote || resolution === "replace"
        ? guest.battle || null
        : remote.battle || null;
    const battleOps =
      (!remote && importedBattle) || (remote && resolution === "replace")
        ? [
            {
              id: crypto.randomUUID(),
              type: "battle",
              battle: importedBattle
                ? {
                    ...importedBattle,
                    run: {
                      ...importedBattle.run,
                      profileId: `${this.uid}:${id}`,
                    },
                  }
                : null,
              expectedBattleRevision: remote?.battleRevision || 0,
            },
          ]
        : [];
    const result = await this.adapter.sync(
      this.uid,
      id,
      guest.profile,
      battleOps,
      remote?.profile.statistics.revision ?? null,
      remote ? resolution : null,
      Object.keys(guest.receipts || {}),
    );
    const key = `${this.uid}:${id}`;
    this.store.data.profiles[key] = {
      profile: result.profile || result,
      pending: [],
      remoteRevision: (result.profile || result).statistics.revision,
      battleRevision: result.battleRevision || 0,
      battle: importedBattle,
      owner: this.uid,
      cloudId: id,
    };
    this.store.data.selected = key;
    this.store.persist();
    this.setStatus("Cloud saved · guest original kept");
  }
}
