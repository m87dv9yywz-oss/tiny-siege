import { EXPANSION_TOWERS } from "./expansionTowers.js";
import {
  artworkState,
  artworkTexture,
  towerLayer,
} from "../towerArtwork.js";
import towerWidths from "./towerWidths.json" with { type: "json" };
// Each tier applies a data patch. Secondary Tier 1 bonuses are added after the
// primary specialization, so cross-path purchases retain their value.
const tier = (name, description, stats) => ({ name, description, stats });
const path = (name, tiers) => ({ name, tiers });
export const TOWERS = {
  archer: {
    name: "Archer",
    subtitle: "Physical · precise arrows",
    icon: "➶",
    color: 0x8acf72,
    hex: "#8acf72",
    muzzle: [16, -44],
    cost: 75,
    prices: [100, 260, 650],
    base: {
      damage: 18,
      range: 140,
      cooldown: 0.65,
      targets: 1,
      damageType: "physical",
      armorDamage: 0,
      penetration: 0,
    },
    paths: [
      path("Siege Ballista", [
        tier(
          "Reinforced Arrows",
          "Sharper arrows: +12 damage and 8 armor damage.",
          { addDamage: 12, addArmorDamage: 8 },
        ),
        tier(
          "Armor-Piercing Bolts",
          "Bolts bypass 65% of armor protection and pierce 3 aligned enemies.",
          {
            damage: 62,
            armorDamage: 38,
            penetration: 0.65,
            pierce: 3,
            range: 170,
          },
        ),
        tier(
          "Siege Ballista",
          "Huge bolts pierce 6 enemies, with heavy recoil and full armor penetration.",
          {
            damage: 290,
            armorDamage: 150,
            penetration: 1,
            pierce: 6,
            cooldown: 1.15,
            range: 220,
          },
        ),
      ]),
      path("Arrowstorm", [
        tier("Quick Draw", "Draw 25% faster.", { rate: 0.75 }),
        tier("Multishot", "Fire three arrows at separate targets.", {
          damage: 26,
          targets: 3,
          cooldown: 0.4,
        }),
        tier(
          "Arrowstorm",
          "Rapid five-arrow volleys; every sixth volley rains arrows over an area.",
          { damage: 40, targets: 5, cooldown: 0.26, rain: 95 },
        ),
      ]),
      path("Deadeye", [
        tier("Eagle Eye", "See farther: +45 range.", { addRange: 45 }),
        tier(
          "Precision Strikes",
          "Every third shot critically strikes. Detect hidden foes; Support targeting unlocked.",
          {
            damage: 55,
            critical: 3,
            critEvery: 3,
            detect: true,
            supportTarget: true,
          },
        ),
        tier(
          "Master Sniper",
          "Golden bolts with enormous critical hits and exceptional range.",
          {
            damage: 260,
            range: 420,
            cooldown: 1.05,
            critical: 3,
            critEvery: 2,
            penetration: 0.5,
            detect: true,
            supportTarget: true,
          },
        ),
      ]),
    ],
  },
  cannon: {
    name: "Cannon",
    subtitle: "Explosions · breaks armor",
    icon: "◉",
    color: 0xf1ad66,
    hex: "#f1ad66",
    muzzle: [10, -46],
    cost: 160,
    prices: [210, 480, 1150],
    base: {
      damage: 40,
      range: 148,
      cooldown: 1.8,
      splash: 52,
      damageType: "physical",
      armorDamage: 50,
      penetration: 0.1,
    },
    paths: [
      path("Ironbreaker", [
        tier("Hardened Shells", "Deal 50 more damage to armor.", {
          addArmorDamage: 50,
        }),
        tier(
          "Shattering Payload",
          "Crush armor with 190 armor damage and larger shells.",
          { damage: 90, armorDamage: 190, splash: 65 },
        ),
        tier(
          "Ironbreaker Cannon",
          "Massive siege shells, 450 armor damage and a broad shockwave.",
          {
            damage: 270,
            armorDamage: 450,
            splash: 96,
            cooldown: 1.5,
            range: 185,
          },
        ),
      ]),
      path("Cluster Bombard", [
        tier("Larger Blast", "Explosions reach 22 farther.", { addSplash: 22 }),
        tier(
          "Fragmentation Shells",
          "Three fragments explode around each impact.",
          { damage: 70, clusters: 3, clusterDamage: 24 },
        ),
        tier(
          "Cluster Bombard",
          "Six secondary blasts devastate packed swarms.",
          {
            damage: 150,
            splash: 84,
            clusters: 6,
            clusterDamage: 70,
            cooldown: 1.55,
          },
        ),
      ]),
      path("Grand Mortar", [
        tier("Extended Range", "Bombard enemies 55 farther away.", {
          addRange: 55,
        }),
        tier(
          "Heavy Bombardment",
          "Large, high-arcing shells deal 140 damage.",
          { damage: 140, splash: 74, arc: true },
        ),
        tier(
          "Grand Mortar",
          "Long-range arcing artillery with enormous area impacts.",
          {
            damage: 430,
            splash: 115,
            range: 330,
            cooldown: 2.3,
            arc: true,
            armorDamage: 120,
          },
        ),
      ]),
    ],
  },
  frost: {
    name: "Frost",
    subtitle: "Ice · slows and controls",
    icon: "❄",
    color: 0x8cdded,
    hex: "#8cdded",
    muzzle: [0, -62],
    cost: 130,
    prices: [160, 360, 880],
    base: {
      damage: 9,
      range: 138,
      cooldown: 0.9,
      slow: 0.6,
      duration: 2.2,
      damageType: "magic",
      bypass: 0.6,
      armorDamage: 3,
    },
    paths: [
      path("Absolute Zero", [
        tier("Deep Chill", "Stronger chill slows enemies to 42% speed.", {
          slow: 0.42,
        }),
        tier("Frozen Grasp", "Every third attack freezes for 1.1 seconds.", {
          freeze: 1.1,
          duration: 3.4,
          damage: 18,
        }),
        tier(
          "Absolute Zero",
          "Every fifth attack releases a large freezing pulse.",
          {
            damage: 35,
            range: 190,
            cooldown: 0.65,
            freeze: 1.3,
            pulse: 180,
            pulseEvery: 5,
          },
        ),
      ]),
      path("Shatterstorm", [
        tier("Brittle Armor", "Ice makes armor take 75% more armor damage.", {
          brittle: 1.75,
        }),
        tier(
          "Ice Fractures",
          "Impacting chilled enemies adds 24 shatter damage.",
          { shatter: 24, freeze: 0.5, damage: 22 },
        ),
        tier(
          "Shatterstorm",
          "Impacts on chilled foes burst into ice and shatter nearby enemies.",
          {
            damage: 55,
            freeze: 0.7,
            shatter: 65,
            shatterRadius: 80,
            cooldown: 0.7,
          },
        ),
      ]),
      path("Winter Guardian", [
        tier("Increased Range", "Reach 40 farther.", { addRange: 40 }),
        tier("Chilling Aura", "Continuously chill all nearby enemies.", {
          aura: 160,
          auraSlow: 0.72,
          damage: 17,
        }),
        tier(
          "Winter Guardian",
          "A wide slowing aura and periodic damaging blizzard waves.",
          {
            damage: 40,
            range: 210,
            aura: 215,
            auraSlow: 0.55,
            pulse: 215,
            pulseEvery: 6,
            cooldown: 0.8,
          },
        ),
      ]),
    ],
  },
  fire: {
    name: "Fire",
    subtitle: "Flames · burn and melt",
    icon: "♨",
    color: 0xff8364,
    hex: "#ff8364",
    muzzle: [0, -56],
    cost: 150,
    prices: [190, 420, 950],
    base: {
      damage: 17,
      range: 143,
      cooldown: 1,
      burn: 9,
      duration: 3,
      damageType: "magic",
      bypass: 0.65,
      armorDamage: 4,
      melt: 6,
    },
    paths: [
      path("Inferno Spire", [
        tier("Hotter Flames", "More powerful direct hits and burning.", {
          addDamage: 14,
          addBurn: 12,
        }),
        tier("Searing Flames", "Burn for 58 damage each second.", {
          damage: 45,
          burn: 58,
          duration: 4,
        }),
        tier(
          "Inferno Spire",
          "Flame jets lock onto one foe: consecutive hits heat up to 2.2× damage and burning. Switching foes resets heat.",
          {
            damage: 100,
            burn: 210,
            cooldown: 0.6,
            range: 180,
            duration: 4,
            beam: true,
            focusRamp: 0.18,
            focusMax: 2.2,
          },
        ),
      ]),
      path("Wildfire", [
        tier("Lingering Embers", "Burning lasts two seconds longer.", {
          addDuration: 2,
        }),
        tier(
          "Spreading Flames",
          "Burning spreads to two nearby enemies every second.",
          { damage: 34, burn: 26, spread: 65 },
        ),
        tier(
          "Wildfire Tower",
          "Aggressive spreading flames and periodic fire explosions.",
          {
            damage: 75,
            burn: 65,
            spread: 105,
            splash: 62,
            flare: 100,
            cooldown: 0.8,
          },
        ),
      ]),
      path("Magma Forge", [
        tier("Armor Melting", "Burning melts 24 armor each second.", {
          melt: 24,
        }),
        tier("Molten Pools", "Hits leave lava pools for three seconds.", {
          damage: 40,
          burn: 25,
          pool: 50,
          poolDamage: 28,
          melt: 40,
        }),
        tier(
          "Magma Forge",
          "Volcanic projectiles leave large lava pools and rapidly melt armor.",
          {
            damage: 100,
            burn: 55,
            melt: 100,
            pool: 78,
            poolDamage: 80,
            range: 185,
            cooldown: 0.85,
          },
        ),
      ]),
    ],
  },
  lightning: {
    name: "Lightning",
    subtitle: "Magic · arcs through crowds",
    icon: "ϟ",
    color: 0xc5a6ff,
    hex: "#c5a6ff",
    muzzle: [0, -54],
    cost: 200,
    prices: [260, 575, 1350],
    base: {
      damage: 26,
      range: 155,
      cooldown: 1.15,
      chains: 2,
      damageType: "magic",
      bypass: 0.45,
      armorDamage: 4,
    },
    paths: [
      path("Chain Tempest", [
        tier("Extended Arcs", "Lightning jumps to two extra enemies.", {
          addChains: 2,
        }),
        tier("Conductive Charge", "Stronger arcs chain through six enemies.", {
          damage: 58,
          chains: 6,
          chainRange: 145,
        }),
        tier(
          "Chain Tempest",
          "Rapid branching bolts chain through ten enemies.",
          {
            damage: 115,
            chains: 10,
            cooldown: 0.6,
            chainRange: 170,
            range: 195,
          },
        ),
      ]),
      path("Thunderlord", [
        tier("Focused Charge", "Primary strikes deal 30 more damage.", {
          addDamage: 30,
        }),
        tier("Heavy Strikes", "Concentrate 180 damage into the main target.", {
          damage: 180,
          chains: 1,
        }),
        tier(
          "Thunderlord",
          "Devastating single-target thunderbolts and electrical shockwaves.",
          {
            damage: 620,
            chains: 1,
            cooldown: 1.05,
            bypass: 0.8,
            shock: 55,
            range: 210,
          },
        ),
      ]),
      path("Stormcaller", [
        tier(
          "Static Buildup",
          "Every fourth attack releases a small static pulse.",
          { pulse: 65, pulseEvery: 4 },
        ),
        tier("Electrical Pulse", "Large pulses strike nearby enemies.", {
          damage: 60,
          pulse: 125,
          pulseEvery: 4,
        }),
        tier(
          "Stormcaller",
          "Every third attack calls a local storm of multiple strikes.",
          {
            damage: 120,
            pulse: 185,
            pulseEvery: 3,
            storm: 3,
            cooldown: 0.8,
            range: 195,
          },
        ),
      ]),
    ],
  },
  grove: {
    name: "Grove",
    subtitle: "Nature · thorns, seeds & roots",
    icon: "❧",
    color: 0x74ce99,
    hex: "#74ce99",
    muzzle: [0, -58],
    cost: 115,
    prices: [140, 330, 820],
    base: {
      damage: 16,
      range: 145,
      cooldown: 0.85,
      damageType: "physical",
      armorDamage: 6,
      penetration: 0.15,
    },
    paths: [
      path("Thorn Sentinel", [
        tier(
          "Rose Thorns",
          "Ruby-tipped thorns: +12 damage and 16 armor damage.",
          { addDamage: 12, addArmorDamage: 16 },
        ),
        tier(
          "Bramble Spears",
          "Heavy thorns pierce 3 foes and bypass 55% armor protection.",
          {
            damage: 65,
            armorDamage: 45,
            penetration: 0.55,
            pierce: 3,
            range: 175,
          },
        ),
        tier(
          "Thorn Sentinel",
          "A living rose fortress fires four enormous, armor-piercing spears.",
          {
            damage: 130,
            armorDamage: 95,
            penetration: 0.85,
            pierce: 5,
            targets: 4,
            cooldown: 0.95,
            range: 205,
          },
        ),
      ]),
      path("Seedburst Orchard", [
        tier("Plump Pods", "Golden seed pods burst over a small area.", {
          splash: 30,
          addDamage: 8,
        }),
        tier(
          "Bouncing Seeds",
          "Pods bounce to 3 nearby enemies, losing 20% damage each bounce.",
          { damage: 42, splash: 38, bounces: 3, bounceRange: 110 },
        ),
        tier(
          "Seedburst Orchard",
          "Pods bounce through five foes; their first impact scatters seed explosions.",
          {
            damage: 95,
            splash: 55,
            bounces: 5,
            bounceRange: 130,
            clusters: 3,
            clusterDamage: 20,
            cooldown: 0.75,
          },
        ),
      ]),
      path("Elderwood Guardian", [
        tier(
          "Clinging Vines",
          "Leaf shots slow enemies to 70% speed for 1.8 seconds.",
          { slow: 0.7, duration: 1.8 },
        ),
        tier(
          "Living Roots",
          "Shots leave 3-second root patches that damage and slow enemies.",
          {
            damage: 28,
            pool: 50,
            poolDamage: 18,
            rootSlow: 0.65,
            slow: 0.6,
            duration: 2.4,
          },
        ),
        tier(
          "Elderwood Guardian",
          "An ancient guardian spreads broad root patches and sends out a rooting pulse every fourth shot. Bosses resist roots.",
          {
            damage: 65,
            pool: 80,
            poolDamage: 40,
            rootSlow: 0.55,
            slow: 0.5,
            duration: 2.5,
            freeze: 0.7,
            pulse: 180,
            pulseEvery: 4,
            range: 195,
            cooldown: 0.85,
          },
        ),
      ]),
    ],
  },
};
Object.assign(TOWERS, EXPANSION_TOWERS);
export function primaryPath(tower) {
  return tower.paths.findIndex((t) => t >= 2);
}
export function towerStats(tower) {
  if (isAscended(tower)) return ascendedStats(tower);
  const def = TOWERS[tower.type],
    stats = { ...def.base };
  const primary = primaryPath(tower);
  const order = [primary, ...[0, 1, 2].filter((p) => p !== primary)].filter(
    (p) => p >= 0,
  );
  for (const p of order)
    for (let n = 0; n < tower.paths[p]; n++) {
      for (const [key, value] of Object.entries(def.paths[p].tiers[n].stats)) {
        if (key.startsWith("add")) {
          const k = key[3].toLowerCase() + key.slice(4);
          stats[k] = (stats[k] || 0) + value;
        } else if (key === "rate") stats.cooldown *= value;
        else stats[key] = value;
      }
    }
  return stats;
}
// Ascension (Free Play only, owner design 2026-10-18): three Tier-3
// towers of one kind — one evolved on each path — are sacrificed into a
// single Ascended tower holding all three forms' powers plus a signature
// nova. Represented as paths [3,3,3] so the state survives every save
// layer (invested = the ordinary [3,3,3] formula value).
export const ASCENSIONS = {
  archer: {
    name: "Stormpiercer",
    blurb: "Every bolt pierces the line; a volley hunts the strongest.",
  },
  cannon: {
    name: "Worldhammer",
    blurb: "Shells like falling mountains, crowned by the great mortar.",
  },
  frost: {
    name: "Eternal Winter",
    blurb: "The cold that ends seasons; its nova freezes the whole field.",
  },
  fire: {
    name: "Sunforge",
    blurb: "A phoenix-forge with a sun for a heart and wings of wildfire.",
  },
  lightning: {
    name: "Tempest Crown",
    blurb: "A living thunderhead dealing judgment in chains of lightning.",
  },
  grove: {
    name: "Worldroot Elder",
    blurb: "The first tree, whose roots hold the world — and shake it.",
  },
  wind: {
    name: "Eye of the Hurricane",
    blurb: "The calm crown inside a storm that throws armies backward.",
  },
  rune: {
    name: "The Archrunesmith",
    blurb: "Its blessing covers the whole kingdom; its traps never miss.",
  },
  tidecaller: {
    name: "Leviathan Sovereign",
    blurb: "The sea itself, crowned — its maelstrom drags fleets down.",
  },
};
export function isAscended(t) {
  return (
    Array.isArray(t?.paths) &&
    t.paths.length === 3 &&
    t.paths.every((n) => n === 3)
  );
}
// Where a tower's shots leave from, in world units relative to its ground
// anchor (bottom-center of the sprite). Each type's `muzzle` offset is
// measured from its artwork — the Archer's bow, the Cannon's barrel, the
// Frost crystal's tip, the Tidecaller's bow harpoon — so projectiles and
// lightning bolts start at the emitter instead of the tower's base.
// A type whose weapon sits in a different place on each state's artwork
// declares per-state overrides in STATE_MUZZLES below; the type muzzle
// is only the fallback for states without an override.
// Battlefield render sizes. Raised 80 -> 96 (ascended 108 -> 128) on
// 2026-10-18: reframing the tower art to fit complete auras inside the
// frame had shrunk placed towers ~15-20% on screen. The muzzle offsets
// were measured against an 80px reference render, so they scale with
// the tower's actual display size.
export const TOWER_DISPLAY_SIZE = 96;
export const ASCENDED_DISPLAY_SIZE = 128;
// Per-state size normalization (owner playtest round 4, 2026-10-18):
// artwork reframing fits complete auras inside the square frame, so a
// slim state's tower body renders far smaller than a squat state's at
// the same display size (measured alpha-bbox width fractions span
// 0.53-1.00 across the 234 states, median 0.75 — see
// scripts/measure-tower-widths.py and towerWidths.json). Scale each
// state up toward the median-width body, never below its flat size and
// never past +35%. Render-only: placement, ranges and projectile spawn
// logic are untouched.
//
// Round 5 (2026-10-19): the raw per-state factor made towers SHRINK on
// upgrade whenever the higher-tier artwork was wider (the owner watched
// a Windcaller render at 120px, then drop to 96px as Tornado Master —
// its 3-0-0 art is wider, so its raw factor fell to 1). A state's
// effective factor is now floored at the largest raw factor among all
// states of the same type that are componentwise <= it in path tiers
// (its ancestors), so display size is monotonic along every upgrade
// path; ascended towers floor at the max raw factor over all 25 states
// of their type.
function rawSizeFactor(fraction) {
  if (!fraction) return 1;
  return Math.min(1.35, Math.max(1, 0.75 / fraction));
}
const effectiveSizeFactors = (() => {
  const byType = new Map();
  for (const [key, fraction] of Object.entries(towerWidths)) {
    const match = key.match(/^tower_(.+)_(ascended|\d-\d-\d)$/);
    if (!match) continue;
    const [, type, state] = match;
    let entry = byType.get(type);
    if (!entry) byType.set(type, (entry = { raw: new Map(), ascendedRaw: 1 }));
    if (state === "ascended") entry.ascendedRaw = rawSizeFactor(fraction);
    else entry.raw.set(state, rawSizeFactor(fraction));
  }
  for (const entry of byType.values()) {
    const states = [...entry.raw.entries()].map(([state, factor]) => ({
      state,
      tiers: state.split("-").map(Number),
      factor,
    }));
    entry.effective = new Map();
    for (const s of states) {
      let factor = s.factor;
      for (const a of states)
        if (
          a.tiers.every((v, i) => v <= s.tiers[i]) &&
          a.factor > factor
        )
          factor = a.factor;
      entry.effective.set(s.state, factor);
    }
    entry.ascended = Math.max(
      entry.ascendedRaw,
      ...states.map((s) => s.factor),
    );
  }
  return byType;
})();
export function towerSizeFactor(t) {
  const entry = effectiveSizeFactors.get(t?.type);
  if (!entry) return 1;
  if (isAscended(t)) return entry.ascended;
  return entry.effective.get(artworkState(t?.paths)) ?? 1;
}
export function towerDisplaySize(t) {
  return (
    (isAscended(t) ? ASCENDED_DISPLAY_SIZE : TOWER_DISPLAY_SIZE) *
    towerSizeFactor(t)
  );
}
// Layered states are STATIC artwork (Kingdom Rush style): the top
// layer never rotates or leans (owner playtest rounds 6–7, 2026-10-19:
// a full 360° in-plane spin read as the tower "just tipped sideways",
// and a rigid flip + tilt still looked off). Aim instead reads from
// the measured muzzle plus the charge glow. Two modes, per layer.mode:
//  - "poses" (cannon): the top ships as three DRAWN poses of the same
//    side-profile gun — barrel raised / level / down — each with its
//    own measured emitter (layer.poses). The scene shows the pose
//    matching the target's elevation band (see poseForBearing) and
//    flips it to the target's side; every pose is drawn whole, so the
//    carriage stays planted in all of them.
//  - "static" (wind crowns): one fixed emitter; the crown never moves.
// The scene maintains `_aimPose` ("level" | "raised" | "down") and
// `_aimFlip` on poses-mode towers; unset means "level, facing left".
// Emitters are fractions of the square canvas relative to the pivot;
// in poses mode the flip mirrors the emitter offset across the pivot
// (static tops never flip, so their muzzle ignores the channel).
export const POSE_BAND_DEG = 9;
export const POSE_HYSTERESIS_DEG = 2.5;
// Pose + flip for a cannon top from the pivot->target offset (canvas
// space, y down). Elevation φ = atan2(−dy, |dx|) in degrees, up
// positive, measured relative to the FACING side: φ above the band →
// "raised", φ below −band → "down", else "level". The band edges
// carry POSE_HYSTERESIS_DEG of hysteresis against the CURRENT pose so
// a target hovering at a boundary cannot flicker the swap: entering
// a pose needs φ past band + hysteresis, leaving it needs φ back
// under band − hysteresis.
export function poseForBearing(dx, dy, current = "level") {
  const flip = dx > 0;
  const phi = (Math.atan2(-dy, Math.abs(dx)) * 180) / Math.PI;
  const enter = POSE_BAND_DEG + POSE_HYSTERESIS_DEG,
    leave = POSE_BAND_DEG - POSE_HYSTERESIS_DEG;
  const cur =
    current === "raised" || current === "down" ? current : "level";
  let pose = cur;
  if (cur === "raised") {
    if (phi < -enter) pose = "down";
    else if (phi < leave) pose = "level";
  } else if (cur === "down") {
    if (phi > enter) pose = "raised";
    else if (phi > -leave) pose = "level";
  } else {
    if (phi > enter) pose = "raised";
    else if (phi < -enter) pose = "down";
  }
  return { pose, flip };
}
export function layeredMuzzle(
  t,
  layer,
  pose = t?._aimPose ?? "level",
  flip = t?._aimFlip ?? false,
) {
  const display = towerDisplaySize(t);
  const pivot = {
    x: t.x + (layer.pivot[0] - 0.5) * display,
    y: t.y + (layer.pivot[1] - 0.96) * display,
  };
  const emitter =
    layer.mode === "poses"
      ? (layer.poses?.[pose] ?? layer.poses?.level)
      : layer.emitter;
  let ox = (emitter[0] - layer.pivot[0]) * display;
  const oy = (emitter[1] - layer.pivot[1]) * display;
  if (flip && layer.mode === "poses") ox = -ox;
  return { x: pivot.x + ox, y: pivot.y + oy };
}
// Per-state muzzle overrides, measured on each state's own artwork at
// the same 80px reference render as the per-type muzzles ([dx, dy] from
// the ground anchor). Archer (owner playtest, 2026-10-20): the single
// type muzzle [16, -44] lands inside the tower's wooden platform —
// frame (0.70, 0.45) — below EVERY state's actual weapon, so arrows
// visibly left from the tower's lower body ("shoots out the bottom").
// Each Archer state now points at its own bow / crossbow / ballista:
// the base bow fixture measured at frame (0.848, 0.385), the slim
// 0-0-3 tower's top bow at (0.665, 0.235), the ascended's glowing bow
// at (0.195, 0.384); the rest sit on the platform weapon, frame
// y 0.36–0.43. The structure-first redo extends this table per type.
export const STATE_MUZZLES = {
  archer: {
    "0-0-0": [28, -49],
    "0-0-1": [26, -54],
    "0-0-2": [27, -54],
    "0-0-3": [13, -61],
    "0-1-0": [28, -49],
    "0-1-1": [24, -48],
    "0-1-2": [28, -50],
    "0-1-3": [8, -64],
    "0-2-0": [30, -50],
    "0-2-1": [30, -50],
    "0-3-0": [22, -48],
    "0-3-1": [26, -48],
    "1-0-0": [29, -48],
    "1-0-1": [27, -48],
    "1-0-2": [29, -51],
    "1-0-3": [18, -58],
    "1-1-0": [27, -48],
    "1-2-0": [34, -46],
    "1-3-0": [29, -48],
    "2-0-0": [32, -48],
    "2-0-1": [30, -48],
    "2-1-0": [30, -48],
    "3-0-0": [12, -46],
    "3-0-1": [29, -46],
    "3-1-0": [34, -46],
    ascended: [-24, -49],
  },
  // Wind (structure-first redo, 2026-10-20): every state measured on
  // its own artwork the same way. The horn is the emitter ONLY for
  // 0-0-1 (the shallow [19, -37]); dual-weapon states point at their
  // rotor/hub, the 3-0-1 / 3-1-0 pair at the hood vent. The three
  // layered states (0-0-0, 0-0-3, 3-0-0) are absent on purpose —
  // towerMuzzle resolves them through towerLayers.json first, so
  // their emitters live there, not here.
  wind: {
    "0-0-1": [19, -37],
    "0-0-2": [3, -57],
    "0-1-0": [2, -64],
    "0-1-1": [3, -65],
    "0-1-2": [0, -65],
    "0-1-3": [6, -43],
    "0-2-0": [6, -66],
    "0-2-1": [1, -61],
    "0-3-0": [1, -60],
    "0-3-1": [6, -63],
    "1-0-0": [4, -68],
    "1-0-1": [4, -65],
    "1-0-2": [2, -63],
    "1-0-3": [-6, -59],
    "1-1-0": [4, -67],
    "1-2-0": [2, -66],
    "1-3-0": [4, -66],
    "2-0-0": [2, -68],
    "2-0-1": [3, -67],
    "2-1-0": [0, -75],
    "3-0-1": [1, -72],
    "3-1-0": [0, -72],
    ascended: [0, -45],
  },
  // Fire (structure-first redo, 2026-10-21): every state measured on
  // its own artwork. The old type muzzle [0, -56] sat inside the
  // body for the Magma Forge line — the forge trio fires from its
  // crucible bowl, NOT the chimney behind it (0-0-3 [0, -45],
  // 0-1-3 [-1, -51], 1-0-3 [0, -47]) — and ~15px under the spire
  // crowns (3-0-0 [0, -74]). Seven states also carry new
  // structure-first art from this pass (3-0-0 / 3-0-1 / 3-1-0
  // spires, 0-3-0 / 0-3-1 crown bowls, 1-3-0, 1-2-0) and their
  // muzzles are grounded on that new art: spire crowns point at the
  // flame-jet nozzle tip, crown-bowl states at the bowl's center.
  // The ascended entry is grounded on the CURRENT ascended art —
  // the glowing sun-heart in its arch, frame (0.502, 0.645) →
  // [0, -28]. (A staged replacement ascended artwork exists but is
  // held out pending the owner's call; its muzzle differs.)
  fire: {
    "0-0-0": [0, -59],
    "0-0-1": [0, -55],
    "0-0-2": [0, -62],
    "0-0-3": [0, -45],
    "0-1-0": [0, -58],
    "0-1-1": [-1, -56],
    "0-1-2": [0, -58],
    "0-1-3": [-1, -51],
    "0-2-0": [0, -59],
    "0-2-1": [0, -56],
    "0-3-0": [0, -67],
    "0-3-1": [1, -68],
    "1-0-0": [0, -54],
    "1-0-1": [0, -58],
    "1-0-2": [0, -57],
    "1-0-3": [0, -47],
    "1-1-0": [0, -63],
    "1-2-0": [0, -70],
    "1-3-0": [0, -73],
    "2-0-0": [-1, -56],
    "2-0-1": [0, -50],
    "2-1-0": [0, -54],
    "3-0-0": [0, -74],
    "3-0-1": [0, -71],
    "3-1-0": [0, -72],
    ascended: [0, -28],
  },
};
// The muzzle a tower actually declares: per-state override when one
// exists, else the type's muzzle. Single source of truth for the sim,
// the renderer and the tests.
export function declaredMuzzle(t) {
  const byState = STATE_MUZZLES[t?.type];
  if (byState) {
    const key = isAscended(t) ? "ascended" : artworkState(t?.paths);
    if (byState[key]) return byState[key];
  }
  return TOWERS[t?.type]?.muzzle || [0, -40];
}
export function towerMuzzle(t) {
  const layer = towerLayer(t);
  if (layer) return layeredMuzzle(t, layer);
  const [dx, dy] = declaredMuzzle(t);
  const scale = towerDisplaySize(t) / 80;
  return { x: t.x + dx * scale, y: t.y + dy * scale };
}
// Mirror-facing weapons (owner request, 2026-10-20, on wind 0-2-1's
// gust horn: "mirror it when shooting to the left — and if other
// towers have similar pointing weapons, do the same"). A state is
// listed when its battlefield art draws a clearly directional
// weapon pointing to ONE side (a gust horn, a drawn bow, a
// side-profile barrel, a prow harpoon); the value is the side the
// weapon points AS DRAWN: +1 right, −1 left. Surveyed state by
// state from the art (2026-10-20). Absent on purpose:
//  - symmetric / radial art (rotors, fans, crystals, orbs,
//    braziers, coils, spires) — flipping would change nothing;
//  - dual-weapon states carrying the same weapon on BOTH sides
//    (archer 0-2-0 / 0-3-0 / 1-2-0 / 0-2-1);
//  - layered states — cannon tops aim with drawn poses and wind
//    crowns are planted (mirrorDrawnSide refuses layered towers
//    outright, so an entry here could never take effect anyway).
// The scene maintains `t._mirrorFlip` on listed towers: true while
// the sprite is shown mirrored so the weapon faces the target.
export const MIRRORED_WEAPONS = {
  // Archer: bows, crossbows and ballistae ride the platform's
  // right side and point right — except the Siege Ballista
  // (3-0-0), whose bolt head points left, and the ascended, whose
  // glowing bow points left (its measured muzzle is [−24, −49]).
  archer: {
    "0-0-0": 1, "1-0-0": 1, "0-1-0": 1, "0-0-1": 1, "1-1-0": 1,
    "1-0-1": 1, "0-1-1": 1, "2-0-0": 1, "0-0-2": 1, "2-1-0": 1,
    "2-0-1": 1, "1-0-2": 1, "0-1-2": 1, "0-0-3": 1, "3-1-0": 1,
    "3-0-1": 1, "1-3-0": 1, "0-3-1": 1, "1-0-3": 1, "0-1-3": 1,
    "3-0-0": -1, ascended: -1,
  },
  // Cannon: NO entries — every cannon state is layered now (the
  // mid-tier pose rollout, 2026-10-21, layered the last 21 flat
  // states), and its tops aim with drawn poses. While those states
  // were still flat (PR #43) their side-profile barrels were listed
  // here (right, except 3-1-0's left-facing spiked barrel); the
  // entries could never take effect on a layered tower anyway.
  // Wind: only the gust-horn states — rotors, fans and vents are
  // radial or point up. Horns blow right on 0-0-1 / 0-1-1 /
  // 0-2-1 / 2-0-1 and left on 1-0-1 / 0-3-1 / 3-0-1.
  wind: {
    "0-0-1": 1, "0-1-1": 1, "0-2-1": 1, "2-0-1": 1,
    "1-0-1": -1, "0-3-1": -1, "3-0-1": -1,
  },
  // Tidecaller: every ship's prow harpoon — or, on the gun ships,
  // its deck cannon — points left, off the bow (the type muzzle
  // [−26, −30] sits there). The two maelstrom ships (0-0-3 /
  // 0-1-3) carry no prow weapon — their portal is radial — and
  // the ascended sovereign has none either.
  tidecaller: {
    "0-0-0": -1, "1-0-0": -1, "0-1-0": -1, "0-0-1": -1, "1-1-0": -1,
    "1-0-1": -1, "0-1-1": -1, "2-0-0": -1, "0-2-0": -1, "0-0-2": -1,
    "2-1-0": -1, "2-0-1": -1, "1-2-0": -1, "0-2-1": -1, "1-0-2": -1,
    "0-1-2": -1, "3-0-0": -1, "0-3-0": -1, "3-1-0": -1, "3-0-1": -1,
    "1-3-0": -1, "0-3-1": -1, "1-0-3": -1,
  },
};
// Frost, fire, lightning, grove and rune draw no pointing weapon
// in any state (crystals, braziers, coils, vines, rings) — no
// entries for them above.
// The side a tower's pointing weapon faces as drawn (+1 right,
// −1 left), or null when the state has none — or is layered.
export function mirrorDrawnSide(t) {
  if (!t || towerLayer(t)) return null;
  const byState = MIRRORED_WEAPONS[t.type];
  if (!byState) return null;
  const key = isAscended(t) ? "ascended" : artworkState(t.paths);
  return byState[key] ?? null;
}
// Horizontal deadband (world units) around the tower's axis: a
// target inside it never changes the facing, so a tower engaging
// enemies straddling its axis cannot flicker — the flat-art
// analog of the cannon pose bands' hysteresis.
export const MIRROR_DEADBAND = 16;
// Should the sprite be mirrored right now? Follows the current
// target's side so the weapon ends up facing the target. No
// target (or a target inside the deadband) keeps the current
// facing; placement and preview never call this, so a fresh
// tower stands as-drawn until it first engages.
export function mirrorFlipFor(t, targetX, current = t?._mirrorFlip ?? false) {
  const drawn = mirrorDrawnSide(t);
  if (drawn == null) return false;
  if (targetX == null || !Number.isFinite(targetX)) return !!current;
  const dx = targetX - t.x;
  if (Math.abs(dx) <= MIRROR_DEADBAND) return !!current;
  return (dx > 0 ? 1 : -1) !== drawn;
}
// The muzzle the RENDERER uses: towerMuzzle mirrored across the
// tower's axis while the sprite is mirrored, so the shot leaves
// the weapon that is actually pointing at the enemy. Purely
// visual — Game.attack's logical spawn stays (t.x, t.y − 15)
// whatever this returns, and the canonical towerMuzzle never
// reads the flip flag.
export function towerVisualMuzzle(t) {
  const m = towerMuzzle(t);
  if (t?._mirrorFlip && mirrorDrawnSide(t) != null)
    return { x: t.x * 2 - m.x, y: m.y };
  return m;
}
// The merged might of the three evolved forms: best value per stat,
// fastest cooldown, every effect payload kept, then the ascension
// damage blessing. Forms are the real sacrificed shapes ([3,1,0] and
// its rotations), so secondaries ride along exactly as built.
export function ascendedStats(t) {
  const forms = [0, 1, 2].map((p) => {
    const paths = [0, 0, 0];
    paths[p] = 3;
    paths[(p + 1) % 3] = 1;
    return towerStats({ type: t.type, paths });
  });
  const merged = {};
  for (const stats of forms)
    for (const [key, value] of Object.entries(stats)) {
      if (merged[key] === undefined) merged[key] = value;
      else if (typeof value === "number" && typeof merged[key] === "number")
        merged[key] =
          key === "cooldown"
            ? Math.min(merged[key], value)
            : Math.max(merged[key], value);
      else if (merged[key] === false || merged[key] === 0 || merged[key] == null)
        merged[key] = value;
    }
  merged.damage = (merged.damage || 0) * 1.75;
  merged.armorDamage = (merged.armorDamage || 0) * 1.75;
  return merged;
}
export function upgradeState(tower, p) {
  if (isAscended(tower)) return { locked: "Ascended ✦" };
  const n = tower.paths[p],
    main = primaryPath(tower);
  if (n === 3) return { locked: "Evolution complete" };
  if (!n && tower.paths.filter((n) => n > 0).length === 2)
    return { locked: "Only two paths may be purchased" };
  if (n >= 1 && main >= 0 && main !== p)
    return { locked: "Secondary path is limited to Tier 1" };
  const def = TOWERS[tower.type];
  return { cost: def.prices[n], tier: def.paths[p].tiers[n], next: n + 1 };
}
export function towerName(t) {
  if (isAscended(t)) return ASCENSIONS[t.type].name;
  const p = t.paths.findIndex((n) => n === 3);
  return p < 0 ? TOWERS[t.type].name : TOWERS[t.type].paths[p].tiers[2].name;
}
export function towerTexture(t) {
  const illustrated = artworkTexture(t);
  if (illustrated) return illustrated;
  const p = t.paths.findIndex((n) => n >= 2);
  return p < 0
    ? `tower-${t.type}-${t.paths.some(Boolean) ? 2 : 1}`
    : `evolution-${t.type}-${p}-${t.paths[p]}`;
}

// A shared, deterministic visual recipe for every path/tier, used by shots,
// tower ornaments, upgrade previews and rendering tests.
export function attackVisual(t) {
  const main = primaryPath(t);
  const p = main >= 0 ? main : t.paths.findIndex(Boolean);
  const tier = p < 0 ? 0 : t.paths[p];
  const colors = {
    archer: [0xf16965, 0x64d8ab, 0xffd36d],
    cannon: [0xffb357, 0x77dfe1, 0xd8adff],
    frost: [0x88efff, 0xb9adff, 0x8cbbff],
    fire: [0xffad4f, 0xff646b, 0xffcf50],
    lightning: [0xc99cff, 0xffd86b, 0x8beaff],
    grove: [0xee718e, 0xffd66d, 0x83f3b4],
    wind: [0x94eeff, 0x74f5b0, 0xffd788],
    rune: [0xd5a4ff, 0xff9a6c, 0x83caff],
    tidecaller: [0x7fe3d0, 0xffd98a, 0x6ac8ff],
  };
  const secondary = t.paths.reduce((n, v) => n + v, 0) - tier;
  return {
    path: p,
    tier,
    color: tier ? colors[t.type][p] : TOWERS[t.type].color,
    size: 1 + tier * 0.4 + secondary * 0.08,
    trail: 16 + tier * 13 + secondary * 5,
    ornaments: t.paths.reduce((n, v) => n + v, 0),
  };
}
