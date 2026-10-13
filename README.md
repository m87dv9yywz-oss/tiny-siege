# Tiny Siege

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

- **Archer (75):** quick arrows, level-three multishot.
- **Cannon (160):** slow, powerful splash damage.
- **Frost (130):** slows enemies; every third level-three shot freezes.
- **Fire (150):** lingering burn; level-three splash ignition.
- **Lightning (200):** instant bolts chaining across nearby enemies.

Each tower has three levels. Armor resists physical damage; magic bypasses armor. Combine slowing towers with area damage. Build near bends for more coverage. Enemies reward gold once, and cleared waves grant a modest bonus. Spend before later waves, which increase enemy health and density.

**Keys:** 1–5 select towers; Esc cancels; Space starts a wave or pauses/resumes combat. Buttons control pause, 1×/2× speed, restart, and optional synthesized sound. All simulation clocks (movement, spawning, attacks, projectiles, status effects) stop when paused and scale together at 2×. Opening the field guide suspends gameplay. Leaving for the main menu freezes the current game; Play starts a fresh campaign.

## Project structure

- `src/data/`: tower levels, enemies, wave composition, and shared curved path.
- `src/systems/Game.js`: deterministic combat, placement, economy, and lifecycle, without browser dependencies.
- `src/scenes/`: Phaser rendering, procedural textures, effects, input, and animation.
- `src/ui.js`: accessible surrounding interface, menus, controls, and audio.
- `tests/game.test.js`: simulation regression tests.
- `tests/strategy.js`: reproducible mixed-defense campaign strategy, using only earned gold.
- `tests/browser/`: Chromium interaction, rendering, resize, and lifecycle tests.

The production build does not expose the local development inspection API used by browser tests. All graphics and sound are generated locally. No network requests are needed after the static game assets load.

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

Tests capture desktop combat and narrow-screen screenshots in ignored `test-results/`. Victory/defeat browser tests accelerate and manipulate simulation state to check the screens; the independent campaign test exercises every real wave and the boss using a funded strategy. These are separate checks, not a claim of exhaustive human playtesting or a measured 60 FPS guarantee.

## GitHub Pages

`.github/workflows/deploy.yml` runs logic tests, Chromium browser checks, and the production build. Pushes to `main` then deploy `dist/` through GitHub Pages; pull requests validate without deploying.

Enable **Settings → Pages → Build and deployment → Source: GitHub Actions** in the existing repository. Then push to `main` or run **Test and deploy Tiny Siege** manually. Vite's base is `/tiny-siege/`, including bundled assets.

Expected address after a successful deployment: `https://m87dv9yywz-oss.github.io/tiny-siege/`. A configured workflow alone does not establish that the site is deployed. Check the Actions deployment result and the public page.
