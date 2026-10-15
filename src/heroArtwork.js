// Illustrated hero sprites. Battle uses the adult stage; cards can use any.
const FAMILY = { dragon: "dragon", dinosaur: "dino", tiger: "tiger" };
export const HERO_STAGES = ["baby", "teen", "adult"];
export function heroArtwork(type, stage = "adult", usage = "battlefield_256") {
  const fam = FAMILY[type];
  if (!fam || !HERO_STAGES.includes(stage)) return null;
  return `assets/v5/heroes/${usage}/hero_${fam}_${stage}.png`;
}
export function heroTexture(type) {
  return FAMILY[type] ? `v5-hero-${type}` : null;
}
