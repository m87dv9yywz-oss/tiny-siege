import { HEROES, heroLevel } from "../data/heroes.js";
import { RELICS } from "../data/relics.js";
import { DIFFICULTIES } from "../data/difficulties.js";
import {
  battleCheckpoint,
  validateBattle,
  restoreBattle,
} from "../systems/checkpoint.js";
import { guideHTML } from "../upgradeGuide.js";
import { CAMPAIGNS } from "../data/waves.js";
import { TOWERS, towerName } from "../data/towers.js";
import {
  AVATARS,
  AVATAR_ART,
  TYPES,
  UNLOCK_COSTS,
  XP_COSTS,
  rewardForRun,
} from "./profiles.js";
const $ = (id) => document.getElementById(id);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export class KingdomUI {
  constructor(model, store) {
    this.model = model;
    this.store = store;
    this.map = "classic";
    this.run = null;
    this.cloud = null;
    this.loading = false;
    this.difficulty = "easy";
  }
  saveSettings() {
    if (!this.store.current) return;
    this.safe(() => {
      this.store.commit({
        id: crypto.randomUUID(),
        type: "settings",
        settings: {
          sound: this.ui.sound,
          reducedEffects: this.ui.reducedEffects,
        },
      });
      this.cloud?.sync();
    });
  }
  hud() {
    $("kingdom-crowns").textContent = this.store.current?.crowns || 0;
    $("sync-status").textContent =
      this.store.warning || this.cloud?.status || "Guest · saved locally";
    $("kingdom-button").onclick = () => this.collection();
  }
  portrait(t) {
    const path = t.paths.findIndex((n) => n >= 2);
    const variant =
      path < 0
        ? t.paths.some(Boolean)
          ? `tier1-${t.paths.findIndex(Boolean)}`
          : "base"
        : t.paths[path] === 2
          ? `tier2-${path}`
          : path;
    return `${import.meta.env.BASE_URL}portraits/${t.type}-${variant}.svg`;
  }
  visibleProfiles() {
    return Object.entries(this.store.data.profiles).filter(
      ([, e]) => !e.owner || e.owner === this.cloud?.uid,
    );
  }
  menu() {
    const entry = this.store.data.profiles[this.store.data.selected];
    const p =
      entry && (!entry.owner || entry.owner === this.cloud?.uid)
        ? entry.profile
        : null;
    const maps = Object.values(CAMPAIGNS).filter((m) => m.id !== "classic");
    const recommended =
      maps.find((m) => !p?.completedMaps.includes(m.id)) || maps[0];
    this.ui
      .modal(`<div class="home-heading"><img class="menu-icon" src="${import.meta.env.BASE_URL}icons/icon-192.png" alt="Tiny Siege dragon castle"><div><div class="eyebrow">YOUR LITTLE KINGDOM</div><h1 id="modal-title">Tiny <span>Siege</span></h1></div></div>
      <div class="profile-picker">${this.visibleProfiles()
        .map(
          ([id, e]) =>
            `<button data-profile="${escape(id)}" class="profile-choice ${this.store.data.selected === id ? "chosen" : ""}">${AVATAR_ART[e.profile.avatar]} <b>${escape(e.profile.nickname)}</b><small>♛ ${e.profile.crowns} · ${e.owner ? "Cloud" : "Guest"}</small></button>`,
        )
        .join("")}</div>
      ${p ? `<div class="home-section"><b>Choose an adventure</b><small>New = not yet completed</small></div><div class="map-picker">${maps.map((m, i) => `<button data-map="${m.id}" class="map-choice biome-${m.biome} ${m.id === recommended.id ? "recommended" : ""}"><span class="map-number">${i + 1}</span><div><b>${m.name.replace(" · Beginner", "")}</b><small>20 / 40 / 100 waves</small></div><span class="level-state ${p.completedMaps.includes(m.id) ? "cleared" : "new"}">${p.completedMaps.includes(m.id) ? "★".repeat(p.mapStars[m.id] || 1) : "NEW"}</span></button>`).join("")}</div><div class="kingdom-actions"><button id="collection" class="primary">Towers & upgrades</button><button id="heroes" class="secondary">Animal heroes</button><button id="relics" class="secondary">Relics · ${p.relics.equipped.length}/2</button></div>${entry?.battle ? `<button id="continue-battle" class="primary">Continue ${escape(CAMPAIGNS[entry.battle.map]?.name || "battle")} · Wave ${entry.battle.wave + 1}</button>` : ""}` : `<p class="welcome-copy">Build tiny towers. Protect a cheerful kingdom.<br>Create a hero to start your first adventure.</p>`}
      <div class="home-actions"><button id="new-profile" class="secondary">＋ New hero</button>${p ? `<button id="manage-profile" class="secondary">Manage hero</button>` : ""}<button id="play" class="secondary" aria-label="PLAY CAMPAIGN">Classic · all unlocked</button><button id="parent-cloud" class="secondary">${this.cloud?.uid ? "Cloud saves" : "Parent sign-in"}</button><button id="menu-help" class="secondary">How to play</button></div><p id="save-message" role="status">${escape(this.store.warning || this.cloud?.status || "Guest · saved on this device")}</p>`);
    $("modal").querySelector(".modal-card").classList.add("home-card");
    document.querySelectorAll("[data-profile]").forEach(
      (b) =>
        (b.onclick = () =>
          this.safe(() => {
            this.store.select(b.dataset.profile);
            this.menu();
          })),
    );
    $("new-profile").onclick = () => this.editProfile();
    if (p) {
      $("manage-profile").onclick = () => this.manage();
      $("collection").onclick = () => this.collection();
      $("heroes").onclick = () => this.heroCollection();
      $("relics").onclick = () => this.relicCollection();
      if ($("continue-battle"))
        $("continue-battle").onclick = () =>
          this.safe(() => this.resumeBattle());
    }
    document
      .querySelectorAll("[data-map]")
      .forEach((b) => (b.onclick = () => this.prepare(b.dataset.map)));
    $("play").onclick = () => this.start("classic");
    $("menu-help").onclick = () => this.ui.help();
    $("parent-cloud").onclick = () => this.parent();
    this.hud();
  }
  safe(fn) {
    try {
      const value = fn();
      if (value?.catch) value.catch((e) => this.message(e.message));
    } catch (e) {
      this.message(e.message);
    }
  }
  message(text) {
    const target = $("save-message");
    if (target) target.textContent = text;
    else this.ui.toast(text);
  }
  prepare(map) {
    if (!this.store.current) return this.editProfile();
    this.ui.modal(
      `<div class="eyebrow">YOUR NEXT ADVENTURE</div><h1 id="modal-title">${escape(CAMPAIGNS[map].name.replace(" · Beginner", ""))}</h1><div class="difficulty-picker">${Object.entries(
        DIFFICULTIES,
      )
        .map(
          ([id, d]) =>
            `<button data-difficulty="${id}" aria-pressed="${this.difficulty === id}"><b>${d.name} (${d.waves})</b><small>${id === "easy" ? "A gentle adventure" : id === "medium" ? "A growing challenge" : "An epic endurance journey"}</small></button>`,
        )
        .join(
          "",
        )}</div><div class="equipped-hero"><img src="${import.meta.env.BASE_URL}heroes/${this.store.current.heroes.equipped}.svg" alt=""><b>${HEROES[this.store.current.heroes.equipped].name}</b><button id="choose-hero" class="secondary">Change hero</button></div><p>${escape(CAMPAIGNS[map].description)}<br>Relics: ${this.store.current.relics.equipped.map((k) => RELICS[k].name).join(", ") || "None equipped"}</p><button id="begin-adventure" class="primary">Begin ${DIFFICULTIES[this.difficulty].name} · ${DIFFICULTIES[this.difficulty].waves} waves</button><button id="back" class="secondary">Back</button>`,
    );
    document.querySelector(".modal-card").classList.add("adventure-card");
    document.querySelectorAll("[data-difficulty]").forEach(
      (b) =>
        (b.onclick = () => {
          this.difficulty = b.dataset.difficulty;
          this.prepare(map);
        }),
    );
    $("choose-hero").onclick = () =>
      this.heroCollection(() => this.prepare(map));
    $("begin-adventure").onclick = () => {
      if (this.store.data.profiles[this.store.data.selected].battle) {
        this.ui.modal(
          `<h1 id="modal-title">Start a new battle?</h1><p>Your current checkpoint will be replaced. Permanent progress stays safe.</p><button id="replace-battle" class="primary">Start new battle</button><button id="back" class="secondary">Keep checkpoint</button>`,
        );
        $("replace-battle").onclick = () => {
          this.clearBattle();
          this.start(map);
        };
        $("back").onclick = () => this.menu();
      } else this.start(map);
    };
    $("back").onclick = () => this.menu();
    this.ui.overlayClose = $("back").onclick;
  }
  heroCollection(back = () => this.menu()) {
    const p = this.store.current;
    this.ui.modal(
      `<div class="eyebrow">ONE ANIMAL FRIEND PER BATTLE</div><h1 id="modal-title">Animal heroes</h1><div class="hero-roster">${Object.entries(
        HEROES,
      )
        .map(
          ([id, h]) =>
            `<article><img src="${import.meta.env.BASE_URL}heroes/${id}.svg" alt="${h.name}"><h2>${h.name}</h2><small>Level ${heroLevel(p.heroes.xp[id])} · ${p.heroes.xp[id]} XP</small><p>${h.description}</p><button data-hero="${id}" class="${p.heroes.equipped === id ? "primary" : "secondary"}" ${!p.heroes.unlocked.includes(id) && p.crowns < h.cost ? "disabled" : ""}>${p.heroes.equipped === id ? "Equipped" : p.heroes.unlocked.includes(id) ? "Equip" : `Unlock · ♛ ${h.cost}`}</button></article>`,
        )
        .join("")}</div><button id="back" class="secondary">Back</button>`,
    );
    document.querySelector(".modal-card").classList.add("hero-card");
    document.querySelectorAll("[data-hero]").forEach(
      (b) =>
        (b.onclick = () =>
          this.safe(() => {
            this.store.commit({
              id: crypto.randomUUID(),
              type: "hero",
              hero: b.dataset.hero,
            });
            this.cloud?.sync();
            this.heroCollection(back);
          })),
    );
    $("back").onclick = back;
    this.ui.overlayClose = back;
  }
  relicCollection() {
    const p = this.store.current;
    this.ui.modal(
      `<div class="eyebrow">EARNED THROUGH ADVENTURES</div><h1 id="modal-title">Kingdom Relics · ${p.relics.equipped.length}/2</h1><div class="relic-grid">${Object.entries(
        RELICS,
      )
        .map(
          ([id, r], i) =>
            `<article class="relic-${id}"><img class="relic-art" src="${import.meta.env.BASE_URL}relics/${id}.svg" alt=""><b>${r.name}</b><p>${r.description}</p><small>${r.condition}</small><button data-relic="${id}" ${p.relics.unlocked.includes(id) ? "" : "disabled"}>${p.relics.equipped.includes(id) ? "Unequip" : p.relics.unlocked.includes(id) ? "Equip" : "Earn in adventures"}</button></article>`,
        )
        .join(
          "",
        )}</div><p>Two different relics at a time. Bonuses never stack with themselves.</p><button id="back" class="secondary">Back</button>`,
    );
    document.querySelector(".modal-card").classList.add("relic-card");
    document.querySelectorAll("[data-relic]").forEach(
      (b) =>
        (b.onclick = () =>
          this.safe(() => {
            const list = p.relics.equipped.includes(b.dataset.relic)
              ? p.relics.equipped.filter((k) => k !== b.dataset.relic)
              : [...p.relics.equipped, b.dataset.relic];
            this.store.commit({
              id: crypto.randomUUID(),
              type: "relic",
              equipped: list,
            });
            this.cloud?.sync();
            this.relicCollection();
          })),
    );
    $("back").onclick = () => this.menu();
    this.ui.overlayClose = $("back").onclick;
  }
  start(map) {
    if (map !== "classic" && !this.store.current) {
      this.editProfile();
      return;
    }
    this.map = map;
    this.model.configure({
      map,
      profile: map === "classic" ? null : this.store.current,
      difficulty: map === "classic" ? null : this.difficulty,
      hero: map === "classic" ? null : this.store.current.heroes.equipped,
      relics: map === "classic" ? [] : this.store.current.relics.equipped,
    });
    const settings = this.store.current?.settings;
    if (settings) {
      this.ui.sound = settings.sound;
      this.ui.reducedEffects = settings.reducedEffects;
    }
    this.ui.restart();
  }
  beginRun() {
    this.run = {
      id: crypto.randomUUID(),
      profileId: this.store.data.selected,
      granted: Object.fromEntries(TYPES.map((t) => [t, 0])),
      stats: { waves: 0, damage: 0, armor: 0, kills: 0 },
      finished: false,
      heroGranted: 0,
    };
  }
  checkpoint(win = false) {
    const run = this.run;
    if (!run || run.finished || this.model.campaign.id === "classic")
      return null;
    // A run is bound to its original profile, never the profile selected later.
    if (run.profileId !== this.store.data.selected)
      throw Error("Switch profiles between battles.");
    const op = rewardForRun(
      this.model,
      `${run.id}-${win ? "end" : this.model.wave}`,
    );
    op.win = win && this.model.ended === "victory";
    const heroTotal = op.heroXP;
    op.heroXP = Math.max(0, heroTotal - (run.heroGranted || 0));
    const totals = { ...op.xp },
      stats = { ...op.stats };
    for (const t of TYPES) op.xp[t] = Math.max(0, totals[t] - run.granted[t]);
    for (const k of Object.keys(stats))
      op.stats[k] = Math.max(0, stats[k] - run.stats[k]);
    const before = this.store.current.crowns;
    const p = this.store.commit(op);
    this.model.profile = p;
    run.granted = totals;
    run.stats = stats;
    run.heroGranted = heroTotal;
    this.cloud?.sync();
    return { crowns: p.crowns - before, xp: totals };
  }
  finishRun() {
    if (!this.run || this.run.finished || this.model.campaign.id === "classic")
      return null;
    let result;
    try {
      result = this.checkpoint(true);
    } catch (error) {
      this.message(error.message);
      return "Could not save rewards. Export a backup before leaving.";
    }
    this.run.finished = true;
    this.clearBattle();
    return `♛ +${result.crowns} Kingdom Crowns · ${this.model.ended === "victory" ? "★".repeat(this.model.lives >= 18 ? 3 : this.model.lives >= 10 ? 2 : 1) : "XP for a brave attempt"}<br>${TYPES.filter(
      (t) => result.xp[t],
    )
      .map((t) => `${TOWERS[t].name} +${result.xp[t]} XP`)
      .join(
        " · ",
      )}<small>Progress saved. Spend Crowns and XP in your Kingdom.</small>`;
  }
  saveBattle() {
    if (
      this.ui.inMenu ||
      this.model.campaign.id === "classic" ||
      !this.run ||
      this.run.finished
    )
      return;
    const b = battleCheckpoint(this.model, this.run);
    if (!b) return; // Keep the pre-wave checkpoint through an interrupted wave.
    if (!validateBattle(b))
      throw Error(
        "Could not save this checkpoint safely. Keep playing or export a backup.",
      );
    this.store.saveBattle(b);
    this.cloud?.sync();
  }
  clearBattle() {
    if (this.store.current) this.store.saveBattle(null);
    this.cloud?.sync();
  }
  resumeBattle() {
    const entry = this.store.data.profiles[this.store.data.selected];
    this.run = restoreBattle(this.model, entry.battle, entry.profile);
    this.run.profileId = this.store.data.selected;
    this.ui.inMenu = false;
    this.ui.helpOpen = false;
    this.ui.cancel();
    $("modal").hidden = true;
    $("app").inert = false;
    this.ui.refresh(true);
    this.ui.fitBattlefield?.();
    this.ui.toast("Checkpoint restored. Resume, then start the next wave.");
  }
  editProfile(id = null) {
    const p = id ? this.store.data.profiles[id].profile : null;
    this.ui.modal(
      `<div class="eyebrow">YOUR LITTLE HERO</div><h1 id="modal-title">${p ? "Rename" : "Create"} profile</h1><form id="profile-form"><label>Nickname<input id="nickname" maxlength="32" required value="${escape(p?.nickname || "")}" placeholder="Little Knight" autocomplete="off"></label><label>Fantasy avatar<select id="avatar">${AVATARS.map((a) => `<option value="${a}" ${p?.avatar === a ? "selected" : ""}>${AVATAR_ART[a]} ${a}</option>`).join("")}</select></label>${!id && this.cloud?.uid ? `<label class="cloud-choice"><input type="checkbox" id="profile-cloud" checked>Save this new hero to the parent’s cloud</label>` : ""}<button class="primary">Save hero</button></form><button id="back" class="secondary">Back</button><p id="save-message" role="status"></p>`,
    );
    $("profile-form").onsubmit = (e) => {
      e.preventDefault();
      this.safe(async () => {
        if (id) {
          this.store.select(id);
          this.store.commit({
            id: crypto.randomUUID(),
            type: "rename",
            nickname: $("nickname").value.trim(),
            avatar: $("avatar").value,
          });
          this.cloud?.sync();
        } else {
          const saveCloud = !!$("profile-cloud")?.checked;
          const created = this.store.create(
            $("nickname").value,
            $("avatar").value,
          );
          if (saveCloud) {
            await this.cloud.importGuest(created);
            // A brand-new empty hero needs no duplicate temporary guest copy.
            this.store.remove(created);
            this.cloud.setStatus("Cloud saved");
          }
        }
        this.menu();
      });
    };
    $("back").onclick = () => this.menu();
  }
  manage() {
    const id = this.store.data.selected,
      p = this.store.current;
    this.ui.modal(
      `<h1 id="modal-title">${AVATAR_ART[p.avatar]} ${escape(p.nickname)}</h1><p>Each hero has independent Crowns, XP and progress. Profiles sharing a parent login can switch freely.</p><button id="rename-profile" class="primary">Rename / change avatar</button><button id="export-save" class="secondary">Export all device saves</button><label class="file-button">Import backup as new profiles<input id="import-save" type="file" accept="application/json,.json"></label><button id="delete-profile" class="danger">Delete this profile…</button><button id="back" class="secondary">Back</button><p id="save-message" role="status"></p>`,
    );
    $("rename-profile").onclick = () => this.editProfile(id);
    $("export-save").onclick = () => this.export();
    $("import-save").onchange = (e) =>
      this.safe(async () => {
        const text = await e.target.files[0]?.text();
        if (!text) return;
        const n = this.store.import(text);
        this.message(`${n} profiles imported as separate copies.`);
      });
    $("delete-profile").onclick = () => {
      this.ui.modal(
        `<h1 id="modal-title">Delete ${escape(p.nickname)}?</h1><p>This removes this hero’s progress${this.store.data.profiles[id].owner ? " from cloud and this device" : " from this device"}. Other heroes are safe. Export a backup first if you want to keep it.</p><button id="confirm-delete" class="danger">Delete profile permanently</button><button id="back" class="primary">Keep hero</button><p id="save-message" role="status"></p>`,
      );
      $("back").onclick = () => this.manage();
      $("confirm-delete").onclick = () =>
        this.safe(async () => {
          const e = this.store.data.profiles[id];
          if (e.owner) {
            if (e.owner !== this.cloud?.uid)
              throw Error("Sign in to this profile’s parent account first.");
            await this.cloud.adapter.remove(e.owner, e.cloudId);
          }
          this.store.remove(id);
          this.menu();
        });
    };
    $("back").onclick = () => this.menu();
  }
  export() {
    const a = document.createElement("a"),
      url = URL.createObjectURL(
        new Blob([this.store.export(this.cloud?.uid || null)], {
          type: "application/json",
        }),
      );
    a.href = url;
    a.download = "tiny-siege-family-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  collection(type = this.collectionType || "archer", state = null) {
    this.collectionType = type;
    if (!this.store.current) {
      this.ui.menu();
      return;
    }
    const p = this.store.current;
    state ||= { playing: !this.ui.inMenu, paused: this.model.paused };
    this.wasPlaying = state.playing;
    this.wasPaused = state.paused;
    this.model.paused = true;
    this.ui.modal(
      `<div class="eyebrow">${escape(p.nickname)}’S KINGDOM</div><h1 id="modal-title">♛ ${p.crowns} Crowns</h1><p>Permanent unlocks. Battle upgrades still cost gold.</p><div class="collection-tabs" role="group" aria-label="Tower collection">${TYPES.map((t) => `<button data-collection="${t}" aria-pressed="${t === type}" style="--tower-color:${TOWERS[t].hex}"><img src="${this.portrait({ type: t, paths: [0, 0, 0] })}" alt=""><span>${TOWERS[t].name}</span></button>`).join("")}</div><div class="collection-grid">${[
        type,
      ]
        .map((type) => {
          const def = TOWERS[type],
            xp = p.towerXP[type],
            owned = p.unlockedTowers.includes(type);
          return `<section><img class="collection-art" src="${this.portrait({ type, paths: [0, 0, 0] })}" alt="${def.name}"><h2>${def.name}</h2><button data-collection-tree="${type}" class="tree-link">Explore full tree</button>${owned ? `<small>${xp.earned - xp.spent} XP available · ${xp.earned} earned · ${xp.spent} spent</small>` : `<button data-unlock-tower="${type}" ${p.crowns < UNLOCK_COSTS[type] ? "disabled" : ""}>Unlock · ♛ ${UNLOCK_COSTS[type]}</button>`}${def.paths
            .map((path, i) => {
              const tier = p.unlockedUpgrades[type][i],
                next = tier + 1;
              return `<div class="collection-path"><b>${path.name}</b><span>Tier ${tier} permanently unlocked</span>${tier < 3 ? `<button data-unlock-path="${type}:${i}" ${!owned || xp.earned - xp.spent < XP_COSTS[next] ? "disabled" : ""}>Unlock Tier ${next} · ${XP_COSTS[next]} XP</button>` : "<strong>Evolution unlocked ★</strong>"}</div>`;
            })
            .join("")}</section>`;
        })
        .join(
          "",
        )}</div><button id="back" class="primary">${this.wasPlaying ? "Return to battle" : "Back to maps"}</button><p id="save-message" role="status"></p>`,
    );
    $("modal").querySelector(".modal-card").classList.add("collection-card");
    document.querySelectorAll("[data-collection]").forEach(
      (b) =>
        (b.onclick = () => {
          this.collection(b.dataset.collection, state);
        }),
    );
    document.querySelectorAll("[data-collection-tree]").forEach(
      (b) =>
        (b.onclick = () => {
          const draw = (p) => {
            this.ui.modal(
              guideHTML(
                { type, paths: [0, 0, 0] },
                p,
                this.portrait({
                  type,
                  paths: [0, 0, 0].map((n, i) => (i === p ? 3 : 0)),
                }),
              ),
            );
            $("modal").querySelector(".modal-card").classList.add("tree-card");
            document
              .querySelectorAll("[data-guide-path]")
              .forEach(
                (b) => (b.onclick = () => draw(Number(b.dataset.guidePath))),
              );
            $("close-guide").onclick = () => {
              this.collection(type, state);
            };
            this.ui.overlayClose = $("close-guide").onclick;
          };
          draw(0);
        }),
    );
    const resume = () => {
      this.model.paused = state.paused;
      if (state.playing) {
        $("modal").hidden = true;
        $("app").inert = false;
        this.ui.refresh(true);
      } else this.menu();
    };
    $("back").onclick = resume;
    this.ui.overlayClose = resume;
    const purchase = (op) =>
      this.safe(() => {
        this.store.commit({ id: crypto.randomUUID(), ...op });
        this.model.profile =
          this.model.campaign.id === "classic" ? null : this.store.current;
        this.cloud?.sync();
        this.collection(type, state);
      });
    document
      .querySelectorAll("[data-unlock-tower]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            purchase({ type: "tower", tower: b.dataset.unlockTower })),
      );
    document.querySelectorAll("[data-unlock-path]").forEach(
      (b) =>
        (b.onclick = () => {
          const [tower, index] = b.dataset.unlockPath.split(":");
          purchase({
            type: "path",
            tower,
            path: Number(index),
            tier: this.store.current.unlockedUpgrades[tower][index] + 1,
          });
        }),
    );
  }
  async loadCloud() {
    if (this.cloud) return this.cloud;
    if (!this.cloudLoading)
      this.cloudLoading = import("../cloud/firebase.js")
        .then(({ FirebaseAdapter, CloudSaves }) => {
          this.cloud = new CloudSaves(this.store, new FirebaseAdapter(), () => {
            if (
              this.run?.profileId === this.store.data.selected &&
              this.model.campaign.id !== "classic"
            )
              this.model.profile = this.store.current;
            this.hud();
            this.ui.refresh();
            if (this.ui.inMenu && $("play")) this.menu();
          });
          return this.cloud;
        })
        .catch((error) => {
          this.cloudLoading = null;
          throw error;
        });
    return this.cloudLoading;
  }

  parent() {
    this.ui.modal(
      `<div class="eyebrow">FOR A PARENT OR GUARDIAN</div><h1 id="modal-title">Family cloud saves</h1><p>One parent’s Google account can hold several heroes. Children only need a nickname and avatar. Guest play stays free and local.</p><button id="google-sign-in" class="primary">${this.cloud?.uid ? "Refresh cloud profiles" : "Sign in with Google"}</button><button id="import-guest" class="secondary">Review guest → cloud import</button><button id="review-sync" class="secondary">Review sync conflict</button><button id="sign-out" class="secondary">Sign out · keep device backups</button><a class="browser-sign-in" href="${import.meta.env.BASE_URL}?browser-sign-in" target="_blank" rel="noopener">Popup unavailable in home-screen mode? Open in browser</a><p class="small-print">Use Safari or Chrome’s regular browser tab for Google Sign-In if a home-screen popup is blocked. You can keep playing as a guest and move your save later, or export/import a device backup.</p><button id="export-save" class="secondary">Export backup</button><button id="back" class="secondary">Back</button><p id="save-message" role="status">${escape(this.cloud?.status || "Not signed in. Your guest saves stay on this device.")}</p>`,
    );
    // Load ahead of a user gesture: popup must be called synchronously in click.
    $("google-sign-in").disabled = !this.cloud;
    this.loadCloud()
      .then(() => {
        if ($("google-sign-in")) $("google-sign-in").disabled = false;
      })
      .catch((e) => this.message(e.message));
    $("google-sign-in").onclick = () =>
      this.safe(() =>
        this.cloud.uid
          ? this.cloud.refresh().then(() => this.menu())
          : this.cloud.adapter.signIn().then(() => this.menu()),
      );
    $("import-guest").onclick = () => this.importReview();
    $("review-sync").onclick = () => this.conflictReview();
    $("sign-out").onclick = () =>
      this.safe(async () => {
        await this.cloud?.adapter.signOut();
        if (this.store.data.profiles[this.store.data.selected]?.owner)
          this.store.data.selected = null;
        this.store.persist();
        this.menu();
      });
    $("export-save").onclick = () => this.export();
    $("back").onclick = () => this.menu();
  }
  importReview() {
    if (!this.cloud?.uid) {
      this.message("Sign in with a parent’s Google account first.");
      return;
    }
    const guests = this.visibleProfiles().filter(([, e]) => !e.owner),
      cloud = this.visibleProfiles().filter(([, e]) => e.owner);
    const reviewedVersions = Object.fromEntries(
      cloud.map(([, e]) => [e.cloudId, e.remoteRevision]),
    );
    const reviewedBattle = new Map(
      cloud.map(([, e]) => [e.cloudId, e.battleRevision || 0]),
    );
    this.ui.modal(
      `<h1 id="modal-title">Review import</h1><p>Import as a new cloud hero, or choose an existing hero. Merge keeps the larger lifetime Crown total, subtracts the cost of combined tower unlocks, and combines XP and stars. Balances are never added; both originals are kept. Replace uses the guest save after a backup. Nothing happens until you choose below.</p><label>Guest hero<select id="guest-source">${guests.map(([id, e]) => `<option value="${escape(id)}">${escape(e.profile.nickname)} · ♛ ${e.profile.crowns}</option>`).join("")}</select></label><label>Cloud hero<select id="cloud-target"><option value="">Create separate cloud hero</option>${cloud.map(([, e]) => `<option value="${escape(e.cloudId)}">${escape(e.profile.nickname)} · ♛ ${e.profile.crowns}</option>`).join("")}</select></label><button id="merge-guest" class="primary">Import new / merge reviewed heroes</button><button id="replace-guest" class="danger">Back up and replace chosen cloud hero</button><button id="back" class="secondary">Cancel</button><p id="save-message" role="status"></p>`,
    );
    const apply = (mode) =>
      this.safe(async () => {
        const guest = $("guest-source").value,
          target = $("cloud-target").value;
        if (!guest) throw Error("Create a guest hero first.");
        if (mode === "replace" && !target)
          throw Error("Choose the cloud hero to replace.");
        if (mode === "replace") this.export();
        const reviewed = target ? reviewedVersions[target] : null;
        await this.cloud.importGuest(
          guest,
          target || null,
          mode,
          reviewed,
          reviewedBattle.get(target) ?? null,
        );
        this.menu();
      });
    $("merge-guest").onclick = () => apply("merge");
    $("replace-guest").onclick = () => apply("replace");
    $("back").onclick = () => this.parent();
  }
  conflictReview() {
    const conflict = this.cloud?.conflict;
    if (!conflict) {
      this.message("No sync conflict to review.");
      return;
    }
    this.ui.modal(
      `<h1 id="modal-title">Save needs review</h1><p>${escape(conflict.message)}. Your local save remains safe. Export it before choosing the cloud version. Retrying applies purchases against the latest cloud balance.</p><button id="export-save" class="secondary">Export local backup</button><button id="retry-sync" class="primary">Retry queued actions safely</button><button id="use-cloud" class="danger">Export backup and use cloud version</button><button id="back" class="secondary">Keep local save for now</button><p id="save-message" role="status"></p>`,
    );
    $("export-save").onclick = () => this.export();
    $("retry-sync").onclick = () =>
      this.safe(async () => {
        this.cloud.conflict = null;
        await this.cloud.sync();
        this.message(this.cloud.status);
      });
    $("use-cloud").onclick = () =>
      this.safe(async () => {
        this.export();
        const records = await this.cloud.adapter.list(this.cloud.uid),
          entry = this.store.data.profiles[conflict.key],
          remote = records.find((r) => r.id === entry.cloudId);
        if (!remote)
          throw Error(
            "Cloud profile no longer exists. Import your local hero as new.",
          );
        entry.profile = remote.profile;
        entry.battle = remote.battle || null;
        entry.battleRevision = remote.battleRevision || 0;
        entry.remoteRevision = remote.profile.statistics.revision;
        entry.pending = [];
        this.cloud.conflict = null;
        this.store.persist();
        this.menu();
      });
    $("back").onclick = () => this.menu();
  }
}
