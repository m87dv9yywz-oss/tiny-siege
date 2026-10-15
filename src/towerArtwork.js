// Runtime art is separate from tower stats, saves and permanent unlocks.
// Future towers register their available complete A-B-C states here.
export const ARCHER_STATES = [
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
];
export function artworkState(paths) {
  if (
    !Array.isArray(paths) ||
    paths.length !== 3 ||
    !paths.every((n) => Number.isInteger(n) && n >= 0 && n <= 3) ||
    paths.filter((n) => n > 0).length > 2 ||
    paths.filter((n) => n > 1).length > 1
  )
    return "0-0-0";
  const state = paths.map((n) => Math.min(n, 2)).join("-");
  return ARCHER_STATES.includes(state) ? state : "0-0-0";
}
export function towerArtwork(t, usage = "card_512") {
  if (t.type !== "archer") return null;
  return `assets/v5/towers/archer/${usage}/archer_${artworkState(t.paths)}.png`;
}
export function artworkTexture(t) {
  return t.type === "archer" ? `v5-archer-${artworkState(t.paths)}` : null;
}
