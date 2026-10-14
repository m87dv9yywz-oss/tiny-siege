import { writeFileSync } from "node:fs";
import { runCampaign } from "../tests/strategy.js";
import {
  freshProfile,
  rewardForRun,
  applyOperation,
  TYPES,
} from "../src/progression/profiles.js";
const starters = [
  ["archer", 0],
  ["archer", 1],
  ["cannon", 0],
  ["frost", 0],
  ["cannon", 1],
  ["archer", 0],
  ["cannon", 1],
  ["frost", 1],
  ["archer", 2],
  ["cannon", 2],
  ["archer", 0],
  ["frost", 2],
];
const report = [];
let profile = freshProfile("Balance Knight");
function run(map, roster, label) {
  const r = runCampaign("mixed", { map, profile, roster });
  const reward = rewardForRun(r.model, "run" + report.length);
  report.push({
    label,
    map,
    result: r.model.ended,
    lives: r.model.lives,
    totalGold: 300 + r.model.earned,
    permanentBefore: structuredClone(profile),
    reward,
    waves: r.report,
  });
  profile = applyOperation(profile, reward);
  console.log(label, map, r.model.ended, r.model.lives, profile.crowns);
  return r;
}
function unlock(t, path, tier) {
  profile = applyOperation(profile, {
    id: "unlock" + t + path + tier,
    type: "path",
    tower: t,
    path,
    tier,
  });
}
run("emerald", starters, "New player, starter towers and Tier 1 only");
for (const t of ["archer", "cannon", "frost"]) unlock(t, 0, 2);
profile = applyOperation(profile, {
  id: "unlockfire",
  type: "tower",
  tower: "fire",
});
run("amber", starters, "First Amber attempt with earned Tier 2 starter paths");
profile = applyOperation(profile, {
  id: "unlocklightning",
  type: "tower",
  tower: "lightning",
});
for (const t of ["archer", "cannon", "frost"])
  if (profile.towerXP[t].earned - profile.towerXP[t].spent >= 500)
    unlock(t, 0, 3);
run("moon", starters, "Moon with earned starter ultimates");
// Further strategies use only the profile accumulated from the above earned runs.
for (const strategy of ["mixed", "physical", "control"]) {
  const { STRATEGIES } = await import("../tests/strategy.js");
  const template =
    strategy === "control"
      ? [
          ["archer", 0],
          ["cannon", 0],
          ["frost", 0],
          ["fire", 0],
          ["frost", 0],
          ["lightning", 0],
          ["cannon", 0],
          ["archer", 0],
          ["frost", 0],
          ["fire", 0],
          ["cannon", 0],
          ["archer", 0],
        ]
      : STRATEGIES[strategy];
  const roster = template.map(([type, path]) => [
    type,
    profile.unlockedUpgrades[type][path] >= 2
      ? path
      : profile.unlockedUpgrades[type].indexOf(
          Math.max(...profile.unlockedUpgrades[type]),
        ),
  ]);
  run(
    "moon",
    roster,
    `Progressed ${strategy} defense, selecting owned specializations`,
  );
  for (const t of TYPES)
    for (let path = 0; path < 3; path++) {
      const tier = profile.unlockedUpgrades[t][path] + 1,
        cost = tier === 2 ? 180 : 500;
      if (
        tier <= 3 &&
        profile.towerXP[t].earned - profile.towerXP[t].spent >= cost
      )
        unlock(t, path, tier);
    }
}
// The new tower is purchased with previously earned Crowns. Its higher paths
// unlock only after meaningful participation in further successful garden runs.
profile = applyOperation(profile, {
  id: "unlockgrove",
  type: "tower",
  tower: "grove",
});
for (let path = 0; path < 3; path++) {
  const roster = [
    ["grove", path],
    ["archer", 0],
    ["cannon", 0],
    ["frost", 0],
    ["grove", path],
    ["cannon", 1],
    ["archer", 1],
    ["grove", path],
    ["fire", 0],
    ["cannon", 0],
    ["archer", 0],
    ["frost", 1],
  ];
  run("garden", roster, `Garden: earned Grove path ${path}, introductory run`);
  unlock("grove", path, 2);
  run("garden", roster, `Garden: Grove path ${path}, earned Tier 2`);
  if (profile.towerXP.grove.earned - profile.towerXP.grove.spent < 500)
    run("garden", roster, `Garden: Grove path ${path}, saving XP`);
  unlock("grove", path, 3);
  run("garden", roster, `Garden: Grove path ${path}, earned ultimate`);
}
writeFileSync(
  "docs/v3-balance-results.json",
  JSON.stringify(report, null, 2) + "\n",
);
if (report.some((r) => r.waves.slice(0, 3).some((w) => w.lives !== 20)))
  throw Error("Unsafe first three waves");
if (report.some((r) => r.result !== "victory"))
  throw Error("Earned progression route failed");
