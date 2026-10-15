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
export function enemyDisplaySize(radius) {
  return ((radius * 2) / SPRITE_FILL).toFixed(1) * 1;
}
