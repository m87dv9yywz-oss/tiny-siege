import towerLayers from "./data/towerLayers.json" with { type: "json" };
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
export function isAscendedTower(t) {
  return (
    Array.isArray(t?.paths) &&
    t.paths.length === 3 &&
    t.paths.every((n) => n === 3)
  );
}
export function towerArtwork(t, usage = "card_512") {
  if (!t || !TOWER_TYPES.includes(t.type)) return null;
  if (isAscendedTower(t))
    return `assets/v5/towers/${t.type}/${usage}/${t.type}_ascended.png`;
  return `assets/v5/towers/${t.type}/${usage}/${t.type}_${artworkState(t.paths)}.png`;
}
export function artworkTexture(t) {
  if (!t || !TOWER_TYPES.includes(t.type)) return null;
  if (isAscendedTower(t)) return `v5-${t.type}-ascended`;
  return `v5-${t.type}-${artworkState(t.paths)}`;
}
// Layered states (tower-turning proof): a few states ship as a planted
// base layer plus a separate static TOP layer (cannon tops come in
// three drawn poses — see src/data/towerLayers.json modes; wind tops
// are a single fixed piece). The base layer loads under the state's
// usual texture key, so every existing consumer (hitboxes, audits,
// fallbacks) sees the same key as before; the level top keeps the
// "-top" suffixed key, and the raised/down poses append their pose
// ("-top-raised" / "-top-down", files "<state>_top_raised.png" /
// "<state>_top_down.png"). pivot/emitter are fractions of the square
// canvas (see src/data/towerLayers.json).
export function towerLayer(t) {
  if (!t || !TOWER_TYPES.includes(t.type)) return null;
  // Ascended towers layer under their own key (tower_<type>_ascended);
  // artworkState() has no ascended form, so resolve them first.
  if (isAscendedTower(t))
    return towerLayers[`tower_${t.type}_ascended`] || null;
  return towerLayers[`tower_${t.type}_${artworkState(t.paths)}`] || null;
}
// The layer files' shared stem: <type>_<state>, or <type>_ascended.
function layerStem(t) {
  return isAscendedTower(t)
    ? `${t.type}_ascended`
    : `${t.type}_${artworkState(t.paths)}`;
}
export function towerBaseArtwork(t) {
  if (towerLayer(t))
    return `assets/v5/towers/${t.type}/battlefield_256/${layerStem(t)}_base.png`;
  return towerArtwork(t, "battlefield_256");
}
export function towerTopTexture(t, pose = "level") {
  const layer = towerLayer(t);
  if (!layer) return null;
  const key = `${artworkTexture(t)}-top`;
  return layer.mode === "poses" && pose !== "level" ? `${key}-${pose}` : key;
}
export function towerTopArtwork(t, pose = "level") {
  const layer = towerLayer(t);
  if (!layer) return null;
  const suffix =
    layer.mode === "poses" && pose !== "level" ? `_top_${pose}` : "_top";
  return `assets/v5/towers/${t.type}/battlefield_256/${layerStem(t)}${suffix}.png`;
}
