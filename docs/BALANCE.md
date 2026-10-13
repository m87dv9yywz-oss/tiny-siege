# Evolution campaign balance

Configuration uses the requested base tower and shared tier prices without price inflation. Enemies receive linear 5.5% health/armor scaling per wave, with no extra exponential multiplier. Bounties scale by 1% per wave; wave completion gives 20 + 3 × wave gold. Shard offspring give exactly 3 gold each. Summoned allies give at most 6 gold, with at most twelve three-enemy summon batches. Armor breaking gives no bounty.

The five strategies in `tests/strategy.js` buy only from the 300 starting gold and real campaign earnings, at legal positions scored for path coverage. They buy varied early towers, then specialize; from wave 10 they prefer finishing an affordable evolution. Purchases happen between manually started waves. No free gold, invulnerability, damage edits, forced kills or forced victories are used in these simulations.

| Strategy                     | Result  | Lives | Total available gold | First ultimate |
| ---------------------------- | ------- | ----- | -------------------- | -------------- |
| Mixed                        | Victory | 20    | 20,391               | Wave 11        |
| Archer/Cannon-heavy          | Victory | 20    | 20,391               | Wave 11        |
| Magic with physical counters | Victory | 20    | 20,391               | Wave 11        |
| Armor breaking and control   | Victory | 20    | 20,374               | Wave 11        |
| Beginner tower mix           | Victory | 20    | 20,391               | Wave 11        |

All five retain 20 lives through waves 1–3. The early Cannon is affordable before wave 7. The first armor waves and the wave-10 Captain take longer to clear than ordinary early waves. Late formations overlap so shield carriers and healers actually protect the crowd. The final king has 18,000 health, a one-time 850-point armor pool at 66% health, 65% control resistance, four-second freeze immunity and a faster final phase. The five builds finish the final battle in approximately 24–31 simulation seconds.

The deliberately unprepared strategy buys only Arrowstorm Archers, spending genuine earned gold. It fails when Ironbound overwhelm it: swarms are its strength, but intact heavy armor requires another specialization or damage type. The negative control is saved alongside the successful campaigns.

`balance-results.json` contains wave-by-wave lives, earned and spent gold, accumulated gold, every tower and path, escaped classes, duration and outcome. Regenerate it with `node scripts/balance-report.js` after changing combat or economy. Regression tests require all five strategies to win, safe first waves, an evolution by wave 16 and total resources within 18,000–21,000.

These are reproducible algorithmic strategies with good placement, not proof that every novice will win. They all retain their lives, so the release remains forgiving with a well-planned build. Wave combinations and counter requirements provide the challenge; this is not an empirical difficulty study or exhaustive balance proof. Human play on physical phones/tablets remains useful for further tuning. Critical hits are predictable (every third Precision shot/every second Sniper shot) rather than random, keeping decisions and tests reproducible.

## Visual and browser validation

The Chromium suite covers the seven requested viewports, taps and coordinate mapping, drag preview/validation, purchases and refunds, path locks, target selection, rotation, all fifteen distinct evolution textures, busy combat and effect/particle limits. Screen-state tests and artwork fixtures intentionally set local development state; they do not establish earned-gold campaign viability. The independent simulations above provide that evidence.

Static map art is baked once into a texture. Effects are capped at 100, each tower emitter at 100 live particles, lava pools at 32, and boss summons at 36 lifetime entities. A reduced-effects control reduces particles, rain trails and camera shake. Phaser’s supported Canvas renderer avoids blank frames and very slow rendering observed with headless software WebGL. Static portrait frames measured about 17 ms, and the crowded-scene sample about 20 ms per frame in this cloud environment. Stress frame samples run on headless Chromium Canvas; they are diagnostic measurements and do not establish a 60 FPS guarantee on physical mobile hardware. No physical iOS Safari/Android hardware test is claimed.

Final local validation: 45 gameplay tests, 14 Chromium browser tests across all seven viewports, production build, and production-preview browser smoke passed. The production smoke test uses only visible controls and asserts the development API is absent. The GitHub Pages workflow repeats that smoke test against the actual deployed URL after its deployment job succeeds, saving a screenshot artifact.
