const tier = (name, description, stats) => ({ name, description, stats });
const path = (name, tiers) => ({ name, tiers });
export const EXPANSION_TOWERS = {
  wind: {
    name: "Windcaller",
    subtitle: "Wind · swirling control",
    icon: "✺",
    color: 0x70d7df,
    hex: "#70d7df",
    cost: 145,
    prices: [180, 390, 980],
    base: {
      damage: 19,
      range: 150,
      cooldown: 0.7,
      damageType: "magic",
      bypass: 0.35,
      armorDamage: 5,
      slow: 0.85,
      duration: 1,
    },
    paths: [
      path("Tornado Master", [
        tier("Whirling Winds", "Wider gusts hit groups and slow their steps.", {
          splash: 35,
          slow: 0.75,
        }),
        tier(
          "Twister Wells",
          "Shots leave swirling damage fields for three seconds.",
          {
            damage: 32,
            pool: 48,
            poolDamage: 14,
            poolDuration: 3,
            slow: 0.6,
            duration: 2,
          },
        ),
        tier(
          "Tornado Master",
          "A great cyclone sends expanding freezing wind pulses and wide tornado fields.",
          {
            damage: 80,
            splash: 70,
            pool: 80,
            poolDamage: 32,
            poolDuration: 4,
            pulse: 190,
            pulseEvery: 4,
            freeze: 0.5,
            range: 190,
          },
        ),
      ]),
      path("Gale Striker", [
        tier("Swift Gusts", "Faster emerald wind blades.", { rate: 0.72 }),
        tier(
          "Ricochet Blades",
          "Wind blades bounce among four distinct enemies.",
          { damage: 34, bounces: 4, bounceRange: 125, bounceDecay: 0.85 },
        ),
        tier(
          "Gale Striker",
          "Rapid seven-target ricochets and twin swirling blades.",
          {
            damage: 75,
            bounces: 7,
            bounceRange: 150,
            bounceDecay: 0.9,
            targets: 2,
            cooldown: 0.3,
            range: 195,
          },
        ),
      ]),
      path("Stormbringer", [
        tier(
          "Forceful Breeze",
          "Gusts push enemies back a short distance; bosses resist.",
          { knockback: 12, addDamage: 9 },
        ),
        tier(
          "Storm Clouds",
          "Wider storm strikes, shock pulses and stronger bounded pushes.",
          { damage: 55, splash: 55, knockback: 24, pulse: 155, pulseEvery: 5 },
        ),
        tier(
          "Stormbringer",
          "A floating storm shrine rains four lightning strikes within expanding storm waves.",
          {
            damage: 130,
            splash: 80,
            knockback: 38,
            pulse: 210,
            pulseEvery: 3,
            storm: 4,
            range: 220,
            cooldown: 0.9,
          },
        ),
      ]),
    ],
  },
  rune: {
    name: "Runesmith",
    subtitle: "Runes · support & armor",
    icon: "✧",
    color: 0xc095ee,
    hex: "#c095ee",
    cost: 175,
    prices: [220, 470, 1100],
    base: {
      damage: 27,
      range: 145,
      cooldown: 0.9,
      damageType: "physical",
      armorDamage: 28,
      penetration: 0.3,
    },
    paths: [
      path("Arcane Empowerer", [
        tier(
          "Inspiring Glyphs",
          "Nearby towers gain 10% damage. Same support bonuses never stack.",
          { buffRange: 130, buffDamage: 0.1 },
        ),
        tier(
          "Resonant Circle",
          "Nearby towers attack 12% faster and deal 20% more damage.",
          { buffRange: 160, buffDamage: 0.2, buffRate: 0.12, damage: 38 },
        ),
        tier(
          "Arcane Empowerer",
          "A radiant floating rune halo empowers nearby towers with 30% damage, 20% speed and armor strength.",
          {
            buffRange: 200,
            buffDamage: 0.3,
            buffRate: 0.2,
            buffArmor: 0.3,
            damage: 80,
            pulse: 175,
            pulseEvery: 5,
          },
        ),
      ]),
      path("Armorbreaker", [
        tier("Sundering Runes", "Heavier physical glyphs break armor.", {
          addArmorDamage: 35,
          addDamage: 12,
        }),
        tier(
          "Fracture Sigils",
          "Glyphs fully pierce plates and burst around the target.",
          { damage: 95, armorDamage: 125, penetration: 1, splash: 35 },
        ),
        tier(
          "Armorbreaker",
          "A huge runic anvil fires massive sundering glyphs with shattering impact waves.",
          {
            damage: 300,
            armorDamage: 350,
            penetration: 1,
            splash: 75,
            range: 200,
            cooldown: 1.2,
          },
        ),
      ]),
      path("Runic Trapper", [
        tier(
          "Binding Marks",
          "Attacks bind enemies with slow and a small blast.",
          { splash: 30, slow: 0.7, duration: 1.5 },
        ),
        tier(
          "Enchanted Traps",
          "Shots lay short-lived runic traps that explode once when enemies enter.",
          { damage: 45, trap: 55, trapDamage: 65, trapDuration: 5 },
        ),
        tier(
          "Runic Trapper",
          "A ring of enchanted obelisks lays wide armor-breaking traps and rooting shockwaves.",
          {
            damage: 95,
            trap: 85,
            trapDamage: 180,
            trapDuration: 7,
            armorDamage: 100,
            pulse: 170,
            pulseEvery: 4,
            freeze: 0.6,
            slow: 0.5,
            duration: 2.5,
          },
        ),
      ]),
    ],
  },
};
