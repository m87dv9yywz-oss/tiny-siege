import { writeFileSync } from "node:fs";
import { runCampaign, STRATEGIES } from "../tests/strategy.js";
const results = Object.fromEntries(
  Object.keys(STRATEGIES).map((name) => {
    const { model, report } = runCampaign(name);
    return [
      name,
      {
        result: model.ended,
        lives: model.lives,
        totalResources: 300 + model.earned,
        spent: report.reduce((n, w) => n + w.spent, 0),
        firstEvolution: report.find((w) =>
          w.towers.some((t) => t.paths.includes(3)),
        )?.wave,
        waves: report,
      },
    ];
  }),
);
// Deliberately omit armor counters. Still uses real earned gold and legal spots.
STRATEGIES.noArmorCounter = Array.from({ length: 12 }, () => ["archer", 1]);
const failed = runCampaign("noArmorCounter");
results.noArmorCounter = {
  result: failed.model.ended,
  wave: failed.model.wave,
  lives: failed.model.lives,
  waves: failed.report,
};
writeFileSync(
  new URL("../docs/balance-results.json", import.meta.url),
  JSON.stringify(results, null, 2) + "\n",
);
console.table(
  Object.entries(results).map(([strategy, r]) => ({
    strategy,
    result: r.result,
    lives: r.lives,
    gold: r.totalResources,
    firstUltimate: r.firstEvolution,
  })),
);
