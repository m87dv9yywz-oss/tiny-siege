// Hand-painted battlefield maps, verified against the true route geometry.
// Each map's road aligns with the game's path centerlines.
export const MAP_IDS = [
  "classic",
  "emerald",
  "amber",
  "moon",
  "garden",
  "crystal",
  "coast",
  "twinponds",
  "roundabout",
  "switchbacks",
  "twofronts",
  "spiral",
  "riverbend",
];
export function mapArtwork(id) {
  return MAP_IDS.includes(id) ? `assets/v5/maps/map_${id}.png` : null;
}
export function mapTexture(id) {
  return MAP_IDS.includes(id) ? `v5-map-${id}` : null;
}

export function mapThumbnail(id) {
  return MAP_IDS.includes(id) ? `assets/v5/maps/thumbnails/map_${id}.webp` : null;
}
