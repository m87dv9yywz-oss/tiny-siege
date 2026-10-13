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
  p.crowns = Math.max(cloud.crowns, guest.crowns);
  p.unlockedTowers = [
    ...new Set([...cloud.unlockedTowers, ...guest.unlockedTowers]),
  ];
  p.completedMaps = [
    ...new Set([...cloud.completedMaps, ...guest.completedMaps]),
  ];
  for (const m of p.completedMaps)
    p.mapStars[m] = Math.max(cloud.mapStars[m] || 0, guest.mapStars[m] || 0);
  p.achievements = [...new Set([...cloud.achievements, ...guest.achievements])];
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
  constructor() {
    const emulated =
      import.meta.env.DEV &&
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
  async list(uid) {
    const snap = await getDocsFromServer(
      collection(this.db, "users", uid, "profiles"),
    );
    return snap.docs.map((d) => ({
      id: d.id,
      profile: migrateProfile(d.data()),
    }));
  }
  reference(uid, id) {
    return doc(this.db, "users", uid, "profiles", id);
  }
  async sync(
    uid,
    id,
    initial,
    operations,
    expectedRevision = null,
    resolution = null,
  ) {
    const ref = this.reference(uid, id);
    return runTransaction(this.db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists() && expectedRevision !== null)
        throw Error(
          "This cloud hero was deleted on another device. Your local save is kept; import it as a new hero.",
        );
      if (snap.exists() && expectedRevision === null && !resolution)
        throw Error(
          "A cloud hero with this ID already exists. Review merge or replace before importing.",
        );
      let p = snap.exists()
        ? migrateProfile(snap.data())
        : structuredClone(initial);
      if (
        resolution &&
        snap.exists() &&
        p.statistics.revision !== expectedRevision
      )
        throw Error("The cloud save changed again. Review the latest version.");
      if (resolution === "replace")
        p = {
          ...structuredClone(initial),
          statistics: {
            ...initial.statistics,
            revision: p.statistics.revision + 1,
            ledger: mergeLedger(p.statistics.ledger, initial.statistics.ledger),
          },
        };
      else if (resolution === "merge") p = mergeProfiles(p, initial);
      else {
        // Replay intent on the newest state atomically: rewards are idempotent,
        // purchases spend the actual current balance, never a stale snapshot.
        for (const op of operations) p = applyOperation(p, op);
      }
      if (!validateProfile(p)) throw Error("Invalid cloud profile.");
      transaction.set(ref, { ...p, updatedAt: serverTimestamp() });
      return p;
    });
  }
  remove(uid, id) {
    return deleteDoc(this.reference(uid, id));
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
        };
      else if (!entry.pending.length) {
        entry.profile = record.profile;
        entry.remoteRevision = record.profile.statistics.revision;
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
    const operations = structuredClone(entry.pending),
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
      entry.profile = remaining.reduce(applyOperation, result);
      entry.pending = remaining;
      entry.remoteRevision = result.statistics.revision;
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
  async importGuest(guestId, targetId = null, resolution = "new") {
    if (!this.uid) throw Error("A parent must sign in first.");
    const guest = this.store.data.profiles[guestId];
    if (!guest || guest.owner) throw Error("Choose a guest profile.");
    const id = targetId || guestId;
    const remote = (await this.adapter.list(this.uid)).find((r) => r.id === id);
    if (remote && !targetId)
      throw Error(
        "This guest profile is already in the cloud. Choose Merge or Replace explicitly.",
      );
    const result = await this.adapter.sync(
      this.uid,
      id,
      guest.profile,
      [],
      remote?.profile.statistics.revision ?? null,
      remote ? resolution : null,
    );
    const key = `${this.uid}:${id}`;
    this.store.data.profiles[key] = {
      profile: result,
      pending: [],
      remoteRevision: result.statistics.revision,
      owner: this.uid,
      cloudId: id,
    };
    this.store.data.selected = key;
    this.store.persist();
    this.setStatus("Cloud saved · guest original kept");
  }
}
