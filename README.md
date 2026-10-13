# Tiny Siege v2 — The Evolution Update

A complete, standalone fantasy tower defense game built with **Phaser 4.2.1**, JavaScript, and **Vite 8.3.4**. Defend the Emerald Trail with five distinct towers through twenty manually started waves and a final Thorn King encounter. No backend, accounts, external artwork, or paid services.

## Run locally

Use Node **22.12+** (Node 24 recommended).

```sh
npm install
npm run dev
```

Open the address printed by Vite, with the `/tiny-siege/` path. The repository's `.npmrc` uses an ignored, writable project-local `.npm` cache. Cloud setup can use `--cache /workspace/.npm-cache` to share downloaded packages.

```sh
npm ci --cache .npm  # reproducible install from package-lock.json
npm test           # combat, economy, lifecycle, and complete campaign simulation
npm run build      # output: dist/
npm run preview    # serve production output
```

## Play

Start with **300 gold and 20 lives**. Choose a tower and click the grass beside the trail. The placement radius turns green where building is allowed, red where blocked. Click a placed tower to upgrade or sell it for **70% of its total investment**. Start every wave yourself; nothing spawns until you are ready.

- **Archer (75):** Siege Ballista, Arrowstorm, Master Sniper.
- **Cannon (160):** Ironbreaker Cannon, Cluster Bombard, Grand Mortar.
- **Frost (130):** Absolute Zero, Shatterstorm, Winter Guardian.
- **Fire (150):** Inferno Spire, Wildfire Tower, Magma Forge.
- **Lightning (200):** Chain Tempest, Thunderlord, Stormcaller.

Each tower has three paths, each with three tiers. Choose one main path up to Tier 3 and a secondary path up to Tier 1. Purchasing two paths locks the third; purchasing Tier 2 commits the main path. Secondary bonuses remain useful after evolving. The panel explains each purchase, its price and any locking reason. FIRST, LAST, STRONG and WEAK targeting update immediately; Deadeye also unlocks SUPPORT targeting.

Heavy armor has its own gray health bar. Basic arrows bounce; Cannons destroy plates, piercing bolts bypass them, Frost makes armor brittle, Fire melts it and Lightning partly bypasses it. Broken armor never regrows except the Thorn King's explicitly announced phase transition. Wardens have separate blue shields and protect allies while those shields last. Healers restore living allies, Shardlings split once into three low-reward offspring, and Moon Wraiths resist magic. The final boss summons a bounded number of allies, gains thorn armor at 66% health and accelerates at 30%. Crowd-control resistance and freeze immunity prevent permanent boss locking.

**Touch:** tap a tower icon then tap grass, or drag the icon onto the battlefield. Drag previews sit above a finger and share the simulation's placement validator with tap and mouse input. Cancel exits placement without spending. Tap a built tower to inspect its range. Tap the same tower again or use the **Upgrades** button to open its paths. Tap outside or close the panel to keep viewing its range; tap empty terrain again to clear selection. Roofs and evolved weapons are selectable, and the panel retains its scroll position as combat earns gold. Portrait and landscape preserve the 960×640 map proportions. The game shell stays inside the viewport; upgrade sheets scroll internally while controls stay reachable. Landscape offers more legible mobile gameplay. All five requested phone/tablet orientations and both desktop sizes are covered by browser emulation.

**Keys:** 1–5 select towers; Esc cancels; Space starts a wave or pauses/resumes combat. Buttons control pause, 1×/2× speed, restart, and optional synthesized sound. All simulation clocks (movement, spawning, attacks, projectiles, status effects) stop when paused and scale together at 2×. Opening the field guide suspends gameplay. Leaving for the main menu freezes the current game; Play starts a fresh campaign.

## Project structure

- `src/data/`: tower path definitions, enemies, wave composition, and shared curved path.
- `src/systems/Game.js`: deterministic combat, placement, economy, and lifecycle, without browser dependencies.
- `src/scenes/`: Phaser rendering, procedural textures, effects, input, and animation.
- `src/ui.js`: accessible surrounding interface, menus, controls, and audio.
- `tests/game.test.js`: simulation regression tests.
- `tests/strategy.js`: five reproducible campaign strategies, using only earned gold.
- `tests/browser/`: Chromium interaction, rendering, resize, and lifecycle tests.

The production build does not expose the local development inspection API used by browser tests. All battlefield graphics and sound are generated locally; home-screen artwork is an original SVG with committed PNG exports. No network requests are needed after the static game assets load.

## Browser tests

Codex Cloud uses the existing `/usr/bin/chromium`:

```sh
npm run test:browser
```

For another machine, install Playwright's browser and use it instead:

```sh
npx playwright install --with-deps chromium
PLAYWRIGHT_USE_BUNDLED=true npm run test:browser
```

Tests capture all seven requested viewport sizes, drag placement, rotation, fifteen evolution silhouettes and a stress battle in ignored `test-results/`. Victory/defeat browser tests accelerate and manipulate simulation state to check the screens; the independent campaign test exercises every real wave and the boss using a funded strategy. These are separate checks, not a claim of exhaustive human playtesting or a measured 60 FPS guarantee.

## GitHub Pages

`.github/workflows/deploy.yml` runs logic tests, Chromium browser checks, and the production build. Pushes to `main` then deploy `dist/` through GitHub Pages; pull requests validate without deploying.

The existing repository uses **GitHub Actions** as its Pages source. Merge a validated pull request to `main` or run **Test and deploy Tiny Siege** manually. Vite's base is `/tiny-siege/`, including bundled assets.

Expected address after a successful deployment: `https://m87dv9yywz-oss.github.io/tiny-siege/`. A configured workflow alone does not establish that the site is deployed. Check the Actions deployment result and the public page.

## Home-screen app

Use the browser's **Add to Home Screen** option where supported. `public/manifest.webmanifest` declares standalone presentation and the Pages scope. Original source art, 180px Apple touch icon, 192px and 512px app icons, a maskable icon and favicon live under `public/icons/`. No service worker is installed, so updates use ordinary browser caching rather than a persistent offline cache. Standalone support depends on the browser; this is a web game, not a native App Store app.

To regenerate exports, install free CairoSVG (`python3 -m pip install cairosvg`) and run `python3 scripts/export-icons.py`. PNGs are committed; builds need neither Python nor an image service.

## Balance and recovery

`node scripts/balance-report.js` runs the five earned-gold strategies and a deliberately unprepared all-Arrowstorm defense, saving wave-by-wave lives, purchases, paths, earned/spent gold, escapes and durations to `docs/balance-results.json`. See `docs/BALANCE.md` for interpretation and practical testing limits.

The known-working v1 is preserved in the remote recovery tag `recovery/tiny-siege-v1-before-evolution-2026-10-13`. V2 was developed on `feature/tiny-siege-v2-evolution`. Revert the release merge and let the existing validation/deployment workflow run if a production rollback is needed.
