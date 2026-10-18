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
// Free Play (owner design, 2026-10-16/17): any map, every tower and
// upgrade available, no difficulty choice, waves run to a hard end at
// 200. Balance pass (2026-10-18, after the owner's own wave-149 run
// with 231k gold banked): kill-gold decays past wave 50 toward a 25%
// floor, the clear bonus caps at wave 100, post-100 health compounds
// at 3.4%/wave, and Ascensions (three sacrificed evolutions per kind)
// are the late-game gold sink and power ceiling — strong unascended
// play should fall ~150-175, ascended boards chase 200.
export const FREEPLAY = {
  name: "Free Play",
  waves: 200,
  health: 1.1,
  reward: 0,
  first: 0,
  repeat: 0,
};
export function campaignFor(map, mode) {
  const base = CAMPAIGNS[map] || CAMPAIGNS.classic;
  if (mode === "freeplay") return freePlayCampaign(base);
  if (!mode || map === "classic") return base;
  const difficulty = DIFFICULTIES[mode];
  if (!difficulty) throw Error("Choose Easy, Medium or Hard.");
  const theme =
    map === "crystal" || map === "twinponds"
      ? "crystal"
      : map === "coast" || map === "riverbend"
        ? "ember"
        : map === "roundabout"
          ? "runner"
          : map === "switchbacks"
            ? "armored"
            : map === "twofronts"
              ? "wraith"
              : map === "spiral"
                ? "shard"
                : null;
  const boss =
    map === "crystal" || map === "spiral"
      ? "crystalBoss"
      : map === "coast" || map === "riverbend"
        ? "drake"
        : "boss";
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
              : 11000 + stage * (mode === "hard" ? 40000 : 14000),
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
    // Dustdivers teach the timing game from wave 18, before the first
    // miniboss arrives: they dive underground and cannot be hit mid-dive.
    if (wave >= 18)
      groups.push(
        g("dustdiver", Math.min(10, 3 + Math.floor((wave - 18) / 8)), 0.9),
      );
    // Minibosses from wave 25, alternating every ten waves (Shadowhart,
    // then the Broodmother), in pairs on the deepest waves.
    if (wave >= 25 && wave % 10 === 5)
      groups.push(
        g(
          (wave - 25) / 10 % 2 === 0 ? "shadowhart" : "broodmother",
          wave >= 90 ? 2 : 1,
          2.5,
        ),
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

// Free Play's 200 waves mirror the adventure composition rules (same
// curriculum, themes, miniboss cadence) with an endless endgame:
// stages keep rising to 9, minibosses come in threes late, and boss
// health steps up hard after stage 4. Enemy health compounding past
// wave 100 lives in Game.spawn's freeplay scale.
function freePlayCampaign(base) {
  const map = base.id;
  const theme =
    map === "crystal" || map === "twinponds"
      ? "crystal"
      : map === "coast" || map === "riverbend"
        ? "ember"
        : map === "roundabout"
          ? "runner"
          : map === "switchbacks"
            ? "armored"
            : map === "twofronts"
              ? "wraith"
              : map === "spiral"
                ? "shard"
                : null;
  const boss =
    map === "crystal" || map === "spiral"
      ? "crystalBoss"
      : map === "coast" || map === "riverbend"
        ? "drake"
        : "boss";
  const waves = Array.from({ length: FREEPLAY.waves }, (_, i) => {
    const wave = i + 1;
    if (wave <= 3) return structuredClone(WAVES[i]);
    const stage = Math.floor(i / 20);
    if (wave % 20 === 0)
      return [
        g(boss, 1, 1, {
          bossHealth:
            stage <= 4
              ? 11000 + stage * 40000
              : 171000 + (stage - 4) * 130000,
        }),
        g(theme || "armored", 10 + stage * 4, 0.7),
        g("runner", 12 + stage * 3, 0.4),
        g("warden", 3 + stage, 0.9),
        g("healer", 2 + stage, 1),
      ];
    const groups = structuredClone(WAVES[Math.min(i % 20, 18)]);
    if (theme && wave >= 5)
      groups.push(g(theme, Math.min(24, 4 + Math.floor(wave / 5)), 0.8));
    if (stage)
      groups.push(
        g(stage % 2 ? "wraith" : "armored", Math.min(30, stage * 6), 0.65),
      );
    if (wave >= 18)
      groups.push(
        g("dustdiver", Math.min(10, 3 + Math.floor((wave - 18) / 8)), 0.9),
      );
    if (wave >= 25 && wave % 10 === 5)
      groups.push(
        g(
          (wave - 25) / 10 % 2 === 0 ? "shadowhart" : "broodmother",
          wave >= 150 ? 3 : wave >= 90 ? 2 : 1,
          2.5,
        ),
      );
    return groups;
  });
  return {
    ...base,
    mode: "freeplay",
    difficulty: FREEPLAY,
    waves,
    hints: null,
    name: `${base.name.replace(" · Beginner", "")} · Free Play`,
    first: 0,
    repeat: 0,
  };
}
