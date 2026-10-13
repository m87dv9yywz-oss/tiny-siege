const group = (type, count, interval = 0.7) => ({ type, count, interval });
export const WAVES = [
  [group("basic", 6, 1.25)],
  [group("basic", 9, 1.05)],
  [group("basic", 12, 0.85)],
  [group("basic", 10), group("runner", 5, 0.9)],
  [group("runner", 9, 0.8), group("basic", 12)],
  [group("basic", 18, 0.55), group("runner", 10)],
  [group("basic", 14), group("armored", 5, 1.05)],
  [group("runner", 15, 0.55), group("armored", 7)],
  [group("basic", 20, 0.4), group("armored", 10)],
  [group("runner", 18, 0.5), group("armored", 13, 0.6)],
  [group("armored", 10), group("brute", 4, 1.3), group("runner", 12, 0.5)],
  [group("basic", 24, 0.35), group("brute", 6, 1.1)],
  [group("runner", 22, 0.4), group("armored", 15, 0.5), group("brute", 7)],
  [group("armored", 22, 0.45), group("brute", 10, 0.85)],
  [group("runner", 30, 0.3), group("brute", 12, 0.8)],
  [
    group("armored", 25, 0.4),
    group("brute", 14, 0.75),
    group("runner", 15, 0.3),
  ],
  [group("runner", 35, 0.28), group("brute", 18, 0.65)],
  [group("armored", 32, 0.35), group("brute", 20, 0.6)],
  [
    group("runner", 32, 0.25),
    group("armored", 25, 0.3),
    group("brute", 22, 0.5),
  ],
  [
    group("armored", 16, 0.4),
    group("boss", 1, 1),
    group("runner", 28, 0.3),
    group("brute", 18, 0.6),
  ],
];
export function waveQueue(number) {
  let at = 0.5;
  return WAVES[number - 1].flatMap((g) =>
    Array.from({ length: g.count }, () => {
      const entry = { type: g.type, at };
      at += g.interval;
      return entry;
    }),
  );
}
export const WAVE_HINTS = [
  "A gentle start. Place an Archer near a bend.",
  "More mosslings on the horizon.",
  "A few more unwelcome visitors.",
  "Fleetfoots! Fast feet, fragile armor.",
  "A little speed. A little strategy.",
  "Groups are growing. Splash damage helps.",
  "Ironbound arrive. Magic pierces their armor.",
  "Slow them down. Let your arrows work.",
  "Upgrade your defense before the rush.",
  "Halfway there. The kingdom believes in you.",
  "Ember Brutes! Tough hides, generous bounties.",
  "Fire meets fire. Mix your damage types.",
  "A crowded trail calls for chain lightning.",
  "The heavy guard marches on.",
  "Frost buys time against the rush.",
  "Your little towers are becoming legends.",
  "A storm of feet and fists.",
  "Hold the bends. Keep upgrading.",
  "The last march before the king.",
  "The Thorn King comes. Make every tower count.",
];
