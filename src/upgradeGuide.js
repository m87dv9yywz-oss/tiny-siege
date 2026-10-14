import { TOWERS, towerStats } from "./data/towers.js";
const labels = {
  damage: "Damage",
  range: "Range",
  cooldown: "Attacks/s",
  armorDamage: "Armor damage",
  penetration: "Armor pierce",
  bypass: "Armor bypass",
  targets: "Targets",
  splash: "Blast radius",
  pierce: "Line targets",
  burn: "Burn/s",
  duration: "Effect seconds",
  slow: "Speed remaining",
  freeze: "Freeze seconds",
  brittle: "Brittle multiplier",
  shatter: "Shatter damage",
  chains: "Chain targets",
  aura: "Aura radius",
  pulse: "Pulse radius",
  pool: "Patch radius",
  poolDamage: "Patch damage/s",
  melt: "Armor melt/s",
  bounces: "Seed bounces",
};
const format = (key, n) =>
  key === "cooldown"
    ? (1 / n).toFixed(2)
    : ["penetration", "bypass", "slow"].includes(key)
      ? `${Math.round(n * 100)}%`
      : Number(n.toFixed(2));
export function statChanges(before, after) {
  return Object.entries(labels)
    .filter(
      ([key]) => before[key] !== after[key] && typeof after[key] === "number",
    )
    .map(([key, label]) => ({
      label,
      before: before[key] === undefined ? "—" : format(key, before[key]),
      after: format(key, after[key]),
    }));
}
// Preview the entire path with the selected tower's legal secondary Tier 1.
export function pathPreview(t, path) {
  const keep = t.paths
    .map((n, p) => ({ n, p }))
    .filter((x) => x.p !== path && x.n > 0)
    .sort((a, b) => b.n - a.n || a.p - b.p)[0]?.p;
  const secondary = t.paths.map((n, p) => (p === keep ? 1 : 0));
  return TOWERS[t.type].paths[path].tiers.map((tier, i) => {
    const previous = towerStats({
      ...t,
      paths: secondary.map((n, p) => (p === path ? i : n)),
    });
    const next = towerStats({
      ...t,
      paths: secondary.map((n, p) => (p === path ? i + 1 : n)),
    });
    return {
      ...tier,
      cost: TOWERS[t.type].prices[i],
      changes: statChanges(previous, next),
      stats: next,
    };
  });
}
export function guideHTML(t, path, portrait) {
  const def = TOWERS[t.type],
    p = def.paths[path];
  return `<div class="guide-heading"><img src="${portrait}" alt=""><div><small>FULL UPGRADE TREE · ${def.name}</small><h1 id="modal-title">${p.name}</h1></div></div>
    <div class="guide-tabs" role="group" aria-label="Upgrade paths">${def.paths.map((p, i) => `<button data-guide-path="${i}" aria-pressed="${path === i}">${p.name}</button>`).join("")}</div>
    <div class="guide-tiers">${pathPreview(t, path)
      .map(
        (tier, i) =>
          `<article class="guide-tier"><small>TIER ${i + 1} · ${t.paths[path] >= i + 1 ? "OWNED" : "FUTURE"}</small><h2>${tier.name}</h2><b class="guide-price">${tier.cost} gold</b><p>${tier.description}</p><dl>${tier.changes.map((c) => `<div><dt>${c.label}</dt><dd>${c.before} → <b>${c.after}</b></dd></div>`).join("")}</dl></article>`,
      )
      .join("")}</div>
    <small class="guide-note">Gold buys each tier during battle. Kingdom XP unlocks access first. One path may reach Tier 3, one may reach Tier 1. Preview includes one existing Tier 1 crosspath. Locked paths are blueprints for another tower.</small><button id="close-guide" class="primary">Return to ${def.name}</button>`;
}
