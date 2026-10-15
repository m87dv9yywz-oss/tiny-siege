// Cosmetic growth follows the existing level (no new stats or save fields).
const FAMILY = { dragon: "dragon", dinosaur: "dino", tiger: "tiger" };
export const HERO_STAGES = ["baby", "teen", "adult"];
export function heroArtwork(type, stage = "adult", usage = "battlefield_256") {
  const fam = FAMILY[type];
  if (!fam || !HERO_STAGES.includes(stage)) return null;
  return `assets/v5/heroes/${usage}/hero_${fam}_${stage}.png`;
}
export function heroTexture(type, stage = "adult") {
  return FAMILY[type] && HERO_STAGES.includes(stage) ? `v5-hero-${type}-${stage}` : null;
}

export function heroStage(level = 1) { return level < 4 ? "baby" : level < 7 ? "teen" : "adult"; }
