# Tiny Siege

Work only in this repository. Do not touch HospitalOS, PowerPark, Stormlight, or unrelated projects. Keep the existing Phaser/Vite static architecture and GitHub Pages hosting. Firebase Auth and Firestore are authorized for v3 in the existing `tiny-siege-game` Spark project. Do not create a project, enable billing, Functions, Storage, Analytics or Firebase Hosting. Never commit private credentials; the web client config is public.

## Project and environment

- `src/main.js`: Phaser bootstrap; `src/ui.js` and `src/style.css`: surrounding UI, menus, controls, and synthesized audio.
- `src/data/`: configurable towers, enemies, twenty waves, and the shared curved path.
- `src/systems/Game.js`: browser-independent combat simulation, placement, economy, and lifecycle.
- `src/scenes/`: Phaser rendering, procedural artwork, input, animation, and effects.
- `tests/game.test.js`: simulation regression suite; `tests/strategy.js`: funded campaign strategy; `tests/browser/`: actual Chromium interactions and rendering.
- Cloud checkout: `/workspace/tiny-siege`. Tasks are already isolated: use the existing checkout and do not create a worktree unless explicitly requested. Inspect `git status` and preserve existing work.
- Require Node **>=22.12**, preferably **Node 24** (also used by CI), npm, and `/usr/bin/chromium` for cloud browser tests. Dependencies are pinned in `package-lock.json` (Phaser 4.2.1, Vite 8.3.4, Playwright 1.64.0). Do not upgrade them just to perform setup.

## Install and run

From `/workspace/tiny-siege`:

```sh
npm ci --cache /workspace/.npm-cache --no-fund
npm run dev -- --port 5173 --strictPort
```

Keep the server in a managed background session and record its session/PID. Internally request `http://127.0.0.1:5173/tiny-siege/`, confirm the title and main module, then check actual browser behavior. Do not offer localhost preview links in the onboarding UI. Published snapshots retain files and dependencies, not live server processes.

Stop only servers started for your task before `npm ci`; restart Vite afterward to avoid stale dependency-optimizer responses. Inspect an occupied port before choosing to reuse its server. The repository's `.npmrc` also supports an ignored project-local `.npm` cache. Never change source, manifests, or lockfiles merely to make environment setup pass.

## Meaningful validation

```sh
npm test
CI=true PLAYWRIGHT_USE_BUNDLED= npm run test:browser
npm run build
npm run preview -- --port 4173 --strictPort
```

- `npm test`: 68 checks covering economy, placement, armor/status effects, attacks, pause/speed, lifecycle, and all twenty waves including the boss, using earned gold.
- Browser suite: 32 tests plus a separately gated cloud emulator test covering menu, placement, combat, upgrades, selling, pause, speed, sound controls, restart, end screens, and narrow-screen touch. The `CI=true` command starts its own server, so port 5173 must be free; plain `npm run test:browser` can reuse a task-owned development server. Clearing `PLAYWRIGHT_USE_BUNDLED` selects system Chromium. Screenshots/results are ignored under `test-results/`.
- Victory/defeat browser tests manipulate local development state to check screens; the independent campaign simulation checks real wave progression. Keep these claims distinct.
- Production output is `dist/`. Validate preview at `http://127.0.0.1:4173/tiny-siege/`: assets must load, campaign must open, and buying/placing a tower must deduct gold. The production bundle must not expose `window.__tinySiege`.
- For changes affecting gameplay or rendering, run the relevant logic/browser checks and production build; investigate failures rather than weakening tests. Documentation-only edits need no new gameplay tests.

## Network and deployment

- Dependency installation uses `registry.npmjs.org`; Git uses `github.com` via the platform's existing HTTPS authentication. Reuse the configured package-manager preset and Git proxy; do not request tokens just because a token variable or CLI login is absent.
- `api.github.com` is needed for GitHub API/Actions operations, and `m87dv9yywz-oss.github.io` for live-site verification. Local development, tests using system Chromium, builds, and previews need no further outbound services. Do not add secrets or broad network rules.
- `.github/workflows/deploy.yml` runs logic tests, bundled Chromium tests, and build. Pushes to `main` then deploy `dist/`; PRs only validate. CI installs its own Playwright browser; cloud tasks should use the already available system Chromium.
- Pages is configured to use **GitHub Actions**. Preserve Vite's **`/tiny-siege/`** base and relative asset paths.
- Live game: **https://m87dv9yywz-oss.github.io/tiny-siege/**.
- Verify Actions completion and the live page before claiming a new deployment succeeded. Cloud configuration draft saves, environment publication, and fresh-task validation are separate operations; report each only with evidence.

## Evolution release

V2 uses Phaser's Canvas renderer with a baked static battlefield. Preserve that choice unless a measured renderer comparison justifies a change. `towerStats`, `upgradeState`, `towerName` and `towerTexture` are the shared data helpers; towers store three independent path tiers. Damage packets specify damage type, armor damage and penetration/bypass. Do not reintroduce the old linear-level rules or percent-only armor.

`node scripts/balance-report.js` writes detailed funded campaign results to `docs/balance-results.json`. `node scripts/production-smoke.js <url>` validates the production UI without development hooks. The Pages workflow now runs the latter against the real live URL after deployment. Icon sources and committed exports are in `public/icons/`; ordinary builds do not need CairoSVG.

Tower selection and the upgrade sheet are independent: `selected` drives the visible range, while `upgradeOpen` drives the sheet. Closing upgrades preserves selection. Resolve canvas taps from the current DOM rectangle, and hit the visible tower artwork rather than only its ground anchor. Do not rebuild upgrade controls on gold-only updates; preserve scroll and expanded details across real upgrades.

## V3 Kingdom Adventure

Read `docs/V3.md` for schema, progression, sync and release constraints. `src/progression/` owns local profiles, Crown/XP operations and profile UI; `src/cloud/firebase.js` owns lazy SDK integration and transaction replay. The simulation takes a campaign/profile in `Game.configure` and a per-map shared trail. Keep Classic fully unlocked and preserve v2 tags. Never add permanent progress to Classic.

Run `npm test`, `npm run test:browser`, `npm run test:cloud`, `node scripts/v3-balance-report.js`, and `npm run build` for a release. Cloud emulator tests require Java 21 and the official emulator download; use CI if local destination policy denies it. Emulator mode is dev-only and uses `demo-tiny-siege`, never production. Rules must validate the same schema on create and update; no public reads or writes. No real Google account or physical Safari test is implied by emulator coverage. Hardened rules must be deployed by an authenticated Firebase administrator before v3 release.

## V3.1 polish and Grove

Read `docs/V3.1.md`. Six towers and 18 ultimates now share the same data-driven paths. `attackVisual` controls path/tier shot recipes and tower ornaments; `upgradeGuide.js` computes exact legal path previews. The panel must stay open when using wave/pause/speed controls. Only empty battlefield/background taps dismiss it. An explicit Menu button confirms abandoning the run and saves earned progress first. Use per-map first appearances for enemy introductions, never an unconditional popup each wave.

Profile schema 2 adds Grove XP/paths and Sunflower Gardens; legacy schema 1 reads migrate losslessly. Rules accept both versions but reject schema downgrades. New rules must be deployed and read-back verified before merging this feature release; the existing schema-1-only deployed rules cannot accept new saves. Keep Spark, the existing project and Pages. Balance covers 15 earned progression campaigns, including all three Grove ultimates. Core menus, upgrade panels, collection tabs and every full-tree path are checked for no scrolling on representative phones/tablets/desktops.
