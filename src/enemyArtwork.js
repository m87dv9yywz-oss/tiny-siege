// Illustrated enemy sprites. Creatures face the viewer at a 3/4 angle and
// read correctly in any travel direction — no rotation or flipping on turns.
export const ENEMY_SPRITES = {
  basic: "enemy_mossling.png",
  runner: "enemy_fleetfoot.png",
  sprout: "enemy_sproutling.png",
  armored: "enemy_ironbound.png",
  shard: "enemy_shardling.png",
  brute: "enemy_emberbrute.png",
  crystal: "enemy_crystalcrawler.png",
  ember: "enemy_lavaimp.png",
  healer: "enemy_grovehealer.png",
  warden: "enemy_shieldwarden.png",
  wraith: "enemy_moonwraith.png",
  crystalBoss: "enemy_crystalcolossus.png",
  drake: "enemy_emberdrake.png",
  boss: "enemy_thornking.png",
};
export const ENEMY_TYPES = Object.keys(ENEMY_SPRITES);
// Creature occupies ~72% of the 256px canvas; scale so the creature's
// diameter matches the gameplay radius.
export const SPRITE_FILL = 0.72;
export function enemyArtwork(type) {
  const file = ENEMY_SPRITES[type];
  return file ? `assets/v5/enemies/${file}` : null;
}
export function enemyTexture(type) {
  return ENEMY_SPRITES[type] ? `v5-enemy-${type}` : null;
}
// The Golden Sproutling has its own properly recolored sprite: a Phaser
// tint multiplies, so gold over a green sprite stays green — the artwork
// itself has to be gold.
export function goldenArtwork() {
  return "assets/v5/enemies/enemy_goldensproutling.png";
}
export function goldenTexture() {
  return "v5-enemy-goldensprout";
}
export function enemyDisplaySize(radius) {
  return ((radius * 2) / SPRITE_FILL).toFixed(1) * 1;
}
// Warm tint per 20-wave adventure stage (stage 0 = untinted). Kept light:
// the sprites are illustrated, so a heavy tint would muddy them and blur
// enemy identity. The renderer combines this with armor-state greys.
export const STAGE_TINTS = [0xffffff, 0xffeecf, 0xffdfae, 0xffc490, 0xffa8a0];
export function stageTint(stage) {
  return STAGE_TINTS[Math.min(stage || 0, STAGE_TINTS.length - 1)];
}
