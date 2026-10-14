export const RELICS = {
  purse: {
    name: "Golden Acorn",
    description: "+25 starting battle gold.",
    condition: "Complete an adventure.",
    unlock: (p) => p.statistics.wins >= 1,
  },
  banner: {
    name: "Kindred Banner",
    description: "Hero buffs reach 20% farther.",
    condition: "Complete two different adventures.",
    unlock: (p) => p.completedMaps.length >= 2,
  },
  shield: {
    name: "Guardian Shell",
    description: "+2 starting lives (maximum 22).",
    condition: "Earn three stars on any adventure.",
    unlock: (p) => Object.values(p.mapStars).some((n) => n === 3),
  },
  lens: {
    name: "Crystal Lens",
    description: "All towers gain 5% range.",
    condition: "Complete Crystal Caverns.",
    unlock: (p) => p.completedMaps.includes("crystal"),
  },
  ember: {
    name: "Warmheart Charm",
    description: "Hero attacks deal 10% more damage.",
    condition: "Complete Ember Coast.",
    unlock: (p) => p.completedMaps.includes("coast"),
  },
  crown: {
    name: "Steadfast Crown",
    description: "Hero abilities recharge 10% faster.",
    condition: "Complete any Medium or Hard adventure.",
    unlock: (p) =>
      Object.values(p.mapProgress || {}).some((m) => m.medium || m.hard),
  },
};
export const RELIC_SLOTS = 2;
