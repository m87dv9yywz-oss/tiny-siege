// Only first appearances in the chosen campaign; never opens during combat.
export const ENEMY_GUIDE = {
  runner: {
    name: "Fleetfoot",
    icon: "➜",
    ability: "Small feet. Big hurry!",
    tip: "Frost slows these quick visitors. Cover a bend with two towers.",
  },
  sprout: {
    name: "Sproutling",
    icon: "❧",
    ability: "Tiny visitors arrive in big groups.",
    tip: "Cannon blasts, seed pods and other area attacks catch the whole crowd.",
  },
  armored: {
    name: "Ironbound",
    icon: "⬡",
    ability: "Armor blocks ordinary arrows until it breaks.",
    tip: "Bring a Cannon, piercing thorns or bolts. Brittle Frost and melting Fire help too.",
  },
  shard: {
    name: "Shardling",
    icon: "◆",
    ability: "Splits into three faster Sproutlings when defeated.",
    tip: "Keep splash damage and slowing towers near the end of the trail.",
  },
  brute: {
    name: "Ember Brute",
    icon: "♨",
    ability: "A slow, sturdy visitor with lots of health.",
    tip: "Strong focused attacks and burning damage work well. Defeat it for a bigger bounty.",
  },
  healer: {
    name: "Grove Healer",
    icon: "✚",
    ability: "Heals nearby friends with green pulses.",
    tip: "Focus the healer first. STRONG targeting or Deadeye’s SUPPORT mode can help.",
  },
  warden: {
    name: "Shield Warden",
    icon: "◈",
    ability: "Reduces damage to nearby allies by 30% while its shield lasts.",
    tip: "Break the blue shield or defeat the Warden to end its protection.",
  },
  wraith: {
    name: "Moon Wraith",
    icon: "☽",
    ability: "Resists 60% of ordinary magic damage.",
    tip: "Use physical Archers, Cannons or Grove thorns alongside your magic towers.",
  },
  boss: {
    name: "The Thorn King",
    icon: "♛",
    ability:
      "Summons friends, grows thorn armor, then charges in three phases.",
    tip: "Mix armor breaking and strong damage. The King resists repeated freezing and roots.",
  },
};
export function introductionsFor(campaign, wave) {
  const earlier = new Set(
    campaign.waves
      .slice(0, wave - 1)
      .flatMap((groups) => groups.map((g) => g.type)),
  );
  return [
    ...new Set((campaign.waves[wave - 1] || []).map((g) => g.type)),
  ].filter((type) => ENEMY_GUIDE[type] && !earlier.has(type));
}
