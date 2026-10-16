const group = (type, count, interval = 0.7, traits = {}) => ({
  type,
  count,
  interval,
  traits,
});
export const WAVES = [
  [group("basic", 6, 1.25)],
  [group("basic", 9, 1.05)],
  [group("basic", 12, 0.85)],
  [group("basic", 10), group("runner", 5, 0.9)],
  [group("runner", 9, 0.8), group("sprout", 20, 0.3)],
  [group("sprout", 30, 0.3), group("runner", 10)],
  [group("basic", 14), group("armored", 5, 1.05)],
  [group("runner", 15, 0.55), group("armored", 7)],
  [group("shard", 8, 0.85), group("armored", 10)],
  [
    group("shard", 12, 0.65),
    group("armored", 13, 0.6),
    group("armored", 1, 1, { elite: true }),
  ],
  [group("armored", 10), group("brute", 4, 1.3), group("runner", 12, 0.5)],
  [group("basic", 24, 0.35), group("brute", 6, 1.1)],
  [
    group("healer", 5, 1),
    group("armored", 15, 0.5),
    group("brute", 9),
    group("sprout", 35, 0.25),
  ],
  [
    group("warden", 7, 0.85),
    group("armored", 22, 0.45),
    group("healer", 5),
    group("brute", 10, 0.85),
  ],
  [
    group("wraith", 15, 0.65),
    group("runner", 30, 0.3),
    group("brute", 12, 0.8),
  ],
  [
    group("armored", 25, 0.4),
    group("brute", 14, 0.75),
    group("wraith", 20, 0.4),
    group("healer", 6, 0.6),
  ],
  [
    group("warden", 12, 0.55),
    group("shard", 22, 0.45),
    group("brute", 18, 0.65),
  ],
  [
    group("armored", 32, 0.35),
    group("wraith", 25, 0.4),
    group("healer", 8),
    group("brute", 20, 0.6),
  ],
  [
    group("runner", 32, 0.25),
    group("armored", 25, 0.3),
    group("brute", 22, 0.5),
    group("warden", 12, 0.5),
    group("wraith", 20, 0.35),
  ],
  [
    group("armored", 16, 0.4),
    group("boss", 1, 1),
    group("runner", 28, 0.3),
    group("brute", 18, 0.6),
    group("healer", 8),
    group("warden", 10, 0.6),
  ],
];
export function waveQueue(number, campaign = WAVES) {
  let sequentialAt = 0.5;
  return campaign[number - 1]
    .flatMap((g, index) => {
      // Late mixed formations overlap: healers and shields march alongside the
      // enemies they protect instead of appearing in unrelated isolated blocks.
      let at = number >= 13 ? 0.5 + index * 1.4 : sequentialAt;
      const entries = Array.from({ length: g.count }, () => {
        const entry = { type: g.type, at, ...g.traits };
        at += g.interval;
        return entry;
      });
      sequentialAt = at;
      return entries;
    })
    .sort((a, b) => a.at - b.at);
}
export const WAVE_HINTS = [
  "A gentle start. Place an Archer near a bend.",
  "More mosslings on the horizon.",
  "A few more unwelcome visitors.",
  "Fleetfoots are quick! Frost slows them; Sproutlings gather in swarms.",
  "A little speed. A little strategy.",
  "Groups are growing. Splash damage helps.",
  "Armor incoming! Basic arrows bounce. Cannons break plates; piercing bolts, fire and brittle frost also help.",
  "Slow them down. Let your arrows work.",
  "Shardlings split into three faster Sproutlings. Splash damage helps!",
  "Halfway there. The kingdom believes in you.",
  "Ember Brutes! Tough hides, generous bounties.",
  "Fire meets fire. Mix your damage types.",
  "Grove Healers restore nearby allies. Select STRONG or Support targeting to focus threats.",
  "Shield Wardens protect nearby allies until their blue shield breaks.",
  "Moon Wraiths resist 60% of magic. Bring physical arrows or shells.",
  "Your little towers are becoming legends.",
  "A storm of feet and fists.",
  "Hold the bends. Keep upgrading.",
  "The last march before the king.",
  "The Thorn King summons allies, grows thorn armor, then charges! Mix armor breaking, damage and control.",
];

export const CAMPAIGNS = {
  classic: {
    id: "classic",
    name: "Emerald Trail · Classic",
    biome: "emerald",
    waves: WAVES,
    first: 0,
    repeat: 0,
    description:
      "The complete v2 campaign. All six towers and evolutions unlocked. No permanent rewards.",
  },
  emerald: {
    id: "emerald",
    name: "Emerald Trail · Beginner",
    biome: "emerald",
    hints: [
      ...WAVE_HINTS.slice(0, 12),
      "Armor and splitters together! Mix Cannons with Frost and Archers.",
      "The Ironbound Captain leads the final march. Break its armor and protect your little kingdom!",
    ],
    victoryText:
      "The Emerald Trail is safe. Your first kingdom adventure is complete!",
    first: 100,
    repeat: 35,
    description:
      "14 gentle waves. Learn with Archer, Cannon and Frost. First clear: 100 Crowns.",
    waves: [
      ...WAVES.slice(0, 9),
      [group("shard", 8), group("armored", 8)],
      [group("brute", 4, 1.3), group("basic", 18)],
      [group("runner", 16), group("sprout", 32, 0.3)],
      [group("armored", 14), group("shard", 10)],
      [
        group("armored", 1, 1, { elite: true }),
        group("brute", 8, 1),
        group("runner", 15),
      ],
    ],
  },
  amber: {
    id: "amber",
    name: "Amber Pass",
    biome: "amber",
    hints: [
      ...WAVE_HINTS.slice(0, 19),
      "Ironbound Captains lead the last autumn march. Break armor, slow the swarms and hold the bends!",
    ],
    victoryText: "Amber Pass is safe. Your heroes protected the autumn road!",
    first: 120,
    repeat: 45,
    description:
      "20 autumn waves. Break armor and stop splitters. First clear: 120 Crowns.",
    waves: WAVES.map((groups, i) =>
      i === 19
        ? [
            group("armored", 18, 0.4),
            group("brute", 30, 0.6),
            group("shard", 24, 0.5),
            group("warden", 8),
            group("armored", 3, 1, { elite: true }),
          ]
        : groups,
    ),
  },
  moon: {
    id: "moon",
    name: "Moonlit Marsh",
    biome: "moon",
    first: 150,
    repeat: 55,
    description:
      "20 mystical waves. Healers, wraiths and the Thorn King. First clear: 150 Crowns.",
    waves: WAVES,
  },
  garden: {
    id: "garden",
    name: "Sunflower Gardens",
    biome: "garden",
    first: 140,
    repeat: 50,
    description:
      "18 sunny waves. Bouncing seeds and living roots meet shielded swarms.",
    victoryText:
      "The Sunflower Gardens bloom again. Your living towers saved the summer kingdom!",
    hints: [
      ...WAVE_HINTS.slice(0, 17),
      "The garden captains arrive with healers and shields. Pierce their armor and keep the summer trail safe!",
    ],
    waves: [
      ...WAVES.slice(0, 17),
      [
        group("armored", 2, 1, { elite: true }),
        group("warden", 8, 0.7),
        group("healer", 6, 0.8),
        group("shard", 16, 0.5),
        group("brute", 14, 0.8),
      ],
    ],
  },
};

CAMPAIGNS.crystal = { id:'crystal', name:'Crystal Caverns', biome:'crystal', first:160, repeat:50, description:'Glowing switchbacks, crystal creatures and the Crystal Colossus.', waves: WAVES.map((groups,i)=> i===19 ? [{type:'crystalBoss',count:1,interval:1},{type:'crystal',count:18,interval:.65}] : [...groups, ...(i>=4?[{type:'crystal',count:4+Math.floor(i/3),interval:.7}]:[])]) };
CAMPAIGNS.coast = { id:'coast', name:'Ember Coast', biome:'coast', first:170, repeat:55, description:'Coastal straights, lava islands and an Ember Drake.', waves: WAVES.map((groups,i)=> i===19 ? [{type:'drake',count:1,interval:1},{type:'ember',count:20,interval:.6}] : [...groups, ...(i>=4?[{type:'ember',count:4+Math.floor(i/3),interval:.7}]:[])]) };
// Expansion maps (2026-10): same curriculum treatment as crystal/coast —
// a themed enemy woven in from wave 5 and a boss finale on wave 20.
const expansionCampaign = (id, name, first, repeat, description, theme, finale) => ({
  id, name, biome: id, first, repeat, description,
  waves: WAVES.map((groups, i) => i === 19 ? finale : [...groups, ...(i >= 4 ? [{ type: theme, count: 4 + Math.floor(i / 3), interval: .7 }] : [])]),
});
CAMPAIGNS.twinponds = expansionCampaign('twinponds', 'Twin Ponds', 150, 45,
  'Two lily ponds in a spring meadow — and the only waters where the Tidecaller sails.',
  'crystal', [{type:'boss',count:1,interval:1},{type:'crystal',count:16,interval:.6}]);
CAMPAIGNS.roundabout = expansionCampaign('roundabout', 'Roundabout', 160, 48,
  'A spiral road around a glowing pond in an enchanted glade. Runners love the loop.',
  'runner', [{type:'boss',count:1,interval:1},{type:'runner',count:18,interval:.45}]);
CAMPAIGNS.switchbacks = expansionCampaign('switchbacks', 'Switchbacks', 175, 52,
  'A red-rock canyon zigzag. The longest road in the kingdom — and the tightest building land.',
  'armored', [{type:'boss',count:1,interval:1},{type:'armored',count:16,interval:.7}]);
CAMPAIGNS.twofronts = expansionCampaign('twofronts', 'Two Fronts', 180, 54,
  'Enemies march from BOTH the west and east gates at once. Defend two roads with one army.',
  'wraith', [{type:'boss',count:1,interval:1},{type:'wraith',count:14,interval:.6}]);
CAMPAIGNS.spiral = expansionCampaign('spiral', 'The Spiral', 185, 56,
  'A gravel garden spiral winding into the castle plaza at its heart.',
  'shard', [{type:'crystalBoss',count:1,interval:1},{type:'shard',count:14,interval:.65}]);
CAMPAIGNS.riverbend = expansionCampaign('riverbend', 'Riverbend', 190, 58,
  'A short, spicy road past a golden lake. The Tidecaller rules these waters.',
  'ember', [{type:'drake',count:1,interval:1},{type:'ember',count:18,interval:.6}]);
