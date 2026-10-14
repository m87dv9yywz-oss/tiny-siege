import { CAMPAIGNS, WAVES } from "./waves.js";
export const DIFFICULTIES = {
  easy: {
    name: "Easy",
    waves: 20,
    health: 0.78,
    reward: 1,
    first: 100,
    repeat: 15,
  },
  medium: {
    name: "Medium",
    waves: 40,
    health: 1,
    reward: 1.05,
    first: 180,
    repeat: 25,
  },
  hard: {
    name: "Hard",
    waves: 100,
    health: 1.1,
    reward: 1.12,
    first: 350,
    repeat: 40,
  },
};
const g = (type, count, interval = 0.65, traits = {}) => ({
  type,
  count,
  interval,
  traits,
});
export function campaignFor(map, mode) {
  const base = CAMPAIGNS[map] || CAMPAIGNS.classic;
  if (!mode || map === "classic") return base;
  const difficulty = DIFFICULTIES[mode];
  if (!difficulty) throw Error("Choose Easy, Medium or Hard.");
  const theme =
    map === "crystal" ? "crystal" : map === "coast" ? "ember" : null;
  const boss =
    map === "crystal" ? "crystalBoss" : map === "coast" ? "drake" : "boss";
  const waves = Array.from({ length: difficulty.waves }, (_, i) => {
    const wave = i + 1;
    if (wave <= 3) return structuredClone(WAVES[i]);
    const stage = Math.floor(i / 20);
    if (wave % 20 === 0)
      return [
        g(boss, 1, 1, {
          bossHealth:
            mode === "easy"
              ? 4800
              : 11000 + stage * (mode === "hard" ? 48000 : 14000),
        }),
        g(theme || "armored", 10 + stage * 4, 0.7),
        g("runner", 12 + stage * 3, 0.4),
        ...(stage
          ? [g("warden", 3 + stage, 0.9), g("healer", 2 + stage, 1)]
          : []),
      ];
    // Repeat a gradual twenty-wave curriculum with stronger mixed formations,
    // bounded group size and linear health growth, not exponential multipliers.
    const groups = structuredClone(WAVES[Math.min(i % 20, 18)]);
    if (mode === "easy")
      for (const group of groups)
        group.count = Math.max(1, Math.ceil(group.count * 0.75));
    if (theme && wave >= 5)
      groups.push(g(theme, Math.min(24, 4 + Math.floor(wave / 5)), 0.8));
    if (stage)
      groups.push(
        g(stage % 2 ? "wraith" : "armored", Math.min(30, stage * 6), 0.65),
      );
    return groups;
  });
  return {
    ...base,
    mode,
    difficulty,
    waves,
    hints: null,
    name: `${base.name.replace(" · Beginner", "")} · ${difficulty.name}`,
    first: difficulty.first,
    repeat: difficulty.repeat,
  };
}
