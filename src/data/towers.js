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
export function primaryPath(tower) {
  return tower.paths.findIndex((t) => t >= 2);
}
export function towerStats(tower) {
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
export function upgradeState(tower, p) {
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
  const p = t.paths.findIndex((n) => n === 3);
  return p < 0 ? TOWERS[t.type].name : TOWERS[t.type].paths[p].tiers[2].name;
}
export function towerTexture(t) {
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
