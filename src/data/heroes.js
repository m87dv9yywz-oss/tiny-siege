export const HEROES = {
  dragon: {
    name: "Ember · Fire Dragon",
    short: "Ember",
    color: 0xf4a36c,
    cost: 0,
    damage: 22,
    range: 135,
    buffRange: 155,
    rate: 1.1,
    speed: 125,
    ability: "Dragonfire",
    cooldown: 28,
    description:
      "Friendly flame breath burns groups. Dragonfire ignites a broad circle. Nearby Fire towers gain 15% damage and burn.",
  },
  dinosaur: {
    name: "Rex · Dinosaur",
    short: "Rex",
    color: 0x90c974,
    cost: 40,
    damage: 45,
    range: 115,
    buffRange: 145,
    rate: 1.5,
    speed: 85,
    ability: "Thunder Stomp",
    cooldown: 30,
    description:
      "Strong tail sweeps crack armor. Thunder Stomp briefly stuns and pushes enemies. Nearby Cannons gain 25% armor damage.",
  },
  tiger: {
    name: "Stripe · Tiger",
    short: "Stripe",
    color: 0xffc56e,
    cost: 0,
    damage: 14,
    range: 120,
    buffRange: 145,
    rate: 0.38,
    speed: 175,
    ability: "Pounce Rush",
    cooldown: 24,
    description:
      "Fast claws pierce weak plates. Pounce Rush hits the leading threats. Nearby Archers attack 12% faster.",
  },
};
export const heroLevel = (xp) =>
  Math.min(10, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 80)));
