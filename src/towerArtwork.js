// Runtime art is separate from tower stats, saves and permanent unlocks.
// All eight towers (archer, cannon, frost, fire, lightning, grove, wind, rune)
// register their available complete A-B-C states here.
export const TOWER_TYPES = [
  "archer",
  "cannon",
  "frost",
  "fire",
  "lightning",
  "grove",
  "wind",
  "rune",
  "tidecaller",
];
export const TOWER_STATES = [
  "0-0-0",
  "1-0-0",
  "0-1-0",
  "0-0-1",
  "1-1-0",
  "1-0-1",
  "0-1-1",
  "2-0-0",
  "0-2-0",
  "0-0-2",
  "2-1-0",
  "2-0-1",
  "1-2-0",
  "0-2-1",
  "1-0-2",
  "0-1-2",
  "3-0-0",
  "0-3-0",
  "0-0-3",
  "3-1-0",
  "3-0-1",
  "1-3-0",
  "0-3-1",
  "1-0-3",
  "0-1-3",
];
// Backwards compatibility for existing imports.
export const ARCHER_STATES = TOWER_STATES;
export function artworkState(paths) {
  if (
    !Array.isArray(paths) ||
    paths.length !== 3 ||
    !paths.every((n) => Number.isInteger(n) && n >= 0 && n <= 3) ||
    paths.filter((n) => n > 0).length > 2 ||
    paths.filter((n) => n > 1).length > 1
  )
    return "0-0-0";
  const state = paths.join("-");
  return TOWER_STATES.includes(state) ? state : "0-0-0";
}
export function towerArtwork(t, usage = "card_512") {
  if (!t || !TOWER_TYPES.includes(t.type)) return null;
  return `assets/v5/towers/${t.type}/${usage}/${t.type}_${artworkState(t.paths)}.png`;
}
export function artworkTexture(t) {
  if (!t || !TOWER_TYPES.includes(t.type)) return null;
  return `v5-${t.type}-${artworkState(t.paths)}`;
}
