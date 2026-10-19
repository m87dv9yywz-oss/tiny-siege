import { EXPANSION_TOWERS } from "./expansionTowers.js";
import { artworkState, artworkTexture } from "../towerArtwork.js";
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
export function towerSizeFactor(t) {
  const key = isAscended(t)
    ? `tower_${t.type}_ascended`
    : `tower_${t.type}_${artworkState(t?.paths)}`;
  const fraction = towerWidths[key];
  if (!fraction) return 1;
  return Math.min(1.35, Math.max(1, 0.75 / fraction));
}
export function towerDisplaySize(t) {
  return (
    (isAscended(t) ? ASCENDED_DISPLAY_SIZE : TOWER_DISPLAY_SIZE) *
    towerSizeFactor(t)
  );
}
export function towerMuzzle(t) {
  const [dx, dy] = TOWERS[t.type]?.muzzle || [0, -40];
  const scale = towerDisplaySize(t) / 80;
  return { x: t.x + dx * scale, y: t.y + dy * scale };
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
