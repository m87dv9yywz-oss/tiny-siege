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
export function waveQueue(number) {
  let sequentialAt = 0.5;
  return WAVES[number - 1]
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
