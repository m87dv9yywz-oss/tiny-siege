// Only first appearances in the chosen campaign; never opens during combat.
export const ENEMY_GUIDE = {
  crystal: {name:'Crystal Crawler',icon:'◆',ability:'Bright crystal shells absorb ordinary arrows.',tip:'Runesmith, Cannon and piercing upgrades crack the crystals.'},
  crystalBoss: {name:'Crystal Colossus',icon:'◆',ability:'A giant crystal guardian grows new armor and summons allies.',tip:'Break its plates, mix powerful damage and keep your hero nearby.'},
  ember: {name:'Lava Imp',icon:'♨',ability:'Fiery visitors resist some magical damage.',tip:'Arrows and runes work well. Slows help on the long coastal straights.'},
  drake: {name:'Ember Drake',icon:'♨',ability:'A mighty dragon gains armor and speeds up when wounded.',tip:'Bring focused damage and armor counters. Bosses resist repeated stuns and pushes.'},
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
  dustdiver: {
    name: "Dustdiver",
    icon: "⛏",
    ability: "Dives underground where no tower can hit it, then pops back up.",
    tip: "It keeps moving while it dives. Catch it on the surface — damage over time keeps burning.",
  },
  umbraling: {
    name: "Umbraling",
    icon: "☾",
    ability: "A shadow fawn, faster than anything else on the trail.",
    tip: "Slow it quickly or catch it with splash damage before it slips past.",
  },
  shadowhart: {
    name: "Shadowhart",
    icon: "♞",
    ability:
      "A miniboss! Slips away from half of all direct hits, and bursts into five Umbralings when defeated.",
    tip: "Its slip fails while it is slowed or burning. Frost and Fire are its worst enemies.",
  },
  broodmother: {
    name: "The Broodmother",
    icon: "✹",
    ability:
      "A miniboss! Lays egg sacs along the trail that hatch into Sproutlings.",
    tip: "Shoot the eggs before they hatch, or defeat her to stop the laying. Leftover eggs vanish when the wave ends.",
  },
  eggsac: {
    name: "Egg Sac",
    icon: "◎",
    ability: "Hatches into two Sproutlings if nobody pops it in time.",
    tip: "A cheap target — pop it fast, or let splash damage do the job.",
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
