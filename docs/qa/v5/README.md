# Tiny Siege V5 illustrated overhaul — pre-release audit

PR: [#17](https://github.com/m87dv9yywz-oss/tiny-siege/pull/17). **Review only; not merged or deployed.**
Production remains `6afec046d53bb8207c60312f04dd27d403ea4d40` (the previous Archer/mobile release).

This report distinguishes earned-resource campaign simulations from development
fixtures used to inspect individual pictures, end screens and crowded combat.
Nothing was tested with a real player's account. Firebase rules, configuration,
billing, save schemas, tower/enemy statistics and enemy routes are unchanged.

## Status

**READY TO MERGE AND DEPLOY after owner authorization and the final head's green
required checks.** The audit itself does not authorize production publication.
The exact final commit/run are recorded in the PR description and completion
report; [PR head checks](https://github.com/m87dv9yywz-oss/tiny-siege/pull/17/checks)
are authoritative if further commits are added.

| Area | Grade | Basis |
|---|---|---|
| Visual appearance | B | Real captures inspected; fixed collisions and distorted headers; some decorative frame polish remains. |
| iPhone usability | B | Large board, real touch/drag/rotation and fitted menus; no physical Safari coverage. |
| Gameplay functionality | A | Original mechanics retained; 44 funded wins and regression coverage. |
| Map alignment | A | All seven full routes traversed and painted-road overlays inspected. |
| Artwork integration | A | 200 distinct states, matching cards, 14 enemies and nine supported hero forms. |
| Performance | C | Bounded caches/heap and much smaller startup; heavy software-rendered stress is variable and below 60 FPS. |
| Save/cloud reliability | B | Legacy/offline/local and real emulator coverage; real-parent Google consent is untested. |
| Overall release readiness | B | No known functional blocker after final checks; owner review and the limitations below remain. |

## Validation results

- **89 logic checks** and **14 rules-publisher checks** passed locally. The final CI
  reruns them, the real **12 Auth/Firestore tests** and the separate cloud browser
  scenario (two sessions, migration, offline/reconnect, account isolation).
- The full final browser suite includes the 200-state paid touch/purchase matrix,
  all seven routes, startup/retry, enemies/bosses, nine hero forms, eight menu-fit
  viewports, restart/checkpoint safety, rotation and Gentle-effects limits. Its
  cloud-only case is separately gated and runs in the emulator job, not silently
  substituted with a mock. See final head CI for the final totals.
- Focused post-fix checks passed for hero attack sizing, all eight menu viewports
  (including the final small-phone recheck), true illustrated ultimate uniqueness,
  Gentle-effects reward preservation and loading failures.
- **44 funded campaign victories**: 15 V3 strategies, 24 V4 cases (12 Easy,
  six Medium, six Hard, across all six progression maps), five Classic strategies.
  The no-armor-counter Classic negative control loses as expected. Reports retain
  wave-by-wave lives, gold, upgrades, escapes and timings. These demonstrate
  regression viability, not a physical-device playthrough or a guarantee that
  every beginner wins Hard. No difficulty/economy tuning was used to pass them.
- All **498 runtime PNGs** inspected; no inventory/transparency/dimension issues.
  All 25 battlefield images per tower have distinct hashes. The 400 tower exports
  match the resolver's expected filenames. Original artwork is unchanged.
- **50 final screen captures/measurements at five representative devices** have
  zero menu/panel overflow and no page errors. Twenty-five live viewport changes
  retain the 3:2 canvas. Additional browser tests cover 390×844, 667×375, 932×430,
  1280×720 and other sizes with actual tap/drag interactions after rotation.
- Production build and shipped-UI preview smoke passed: artwork, paid upgrades,
  adaptive sides, Start/Pause/Speed, Menu-only confirmed Restart/Cancel, icons,
  hero, earned XP and checkpoint restoration. Production hooks remain absent.
  Existing live baseline was separately verified by the read-only
  [live-check job](https://github.com/m87dv9yywz-oss/tiny-siege/actions/runs/38664348839/job/116373942248).

## Battlefield and performance measurements

At **844×390**, the real 960×640 canvas is displayed at **552×368**: **61.7% of
screen area**, preserving the enlarged PR #15 battlefield and the current
production baseline. Opening either upgrade panel does not resize that canvas.
The original pre-overhaul small board is historical evidence in the PR #15 docs;
this audit does not claim to have enlarged the already-improved production board.

- Cold, empty-cache shipped build: **8,275,910 observed resource body bytes**, 54
  requests, battle-entry ready at **3,751 ms** on this runner. No page errors or
  bad responses. This is a local network/Chromium measurement, not an iPhone
  cellular loading prediction. The static catalog is about **108 MiB**, fetched
  on demand, not a single initial download.
- Initial battlefield tower PNGs: **17,634,587 → 593,036 bytes** (200 → eight
  base states), a **96.6% reduction**. No 512px tower portraits are fetched before
  selection. Menu map thumbnails total 192,134 bytes for seven exports.
- Six repeated battle setup/ultimate-upgrade/reset cycles: JS heap after forced
  GC **31.25–31.44 MB**; two painted-map textures, 16 illustrated tower textures,
  eight tower sprites and 19 scene children per case. This is a short cleanup
  stress test, not six completed campaigns or a multi-hour physical-device soak.
  Native/decoded image memory is not included in JS heap figures.
- Extreme fixture: 24 ultimates, up to 101 enemies, upgrade panel open, 180 frames.
  V5 Full-mode runs measured **27–39 ms median / 54–96 ms p95**. A same-runner
  export of production `6afec04` measured **34 ms / 61 ms**, with an 881 ms worst
  frame. These variable software-Canvas samples do not prove a stable regression
  or 60 FPS. The initial background sample had an **8.45-second timing spike**;
  it is retained in `performance-stress-initial.json`, not hidden. A profiled run
  and the comparison baseline are also retained. JS profiling was dominated by
  native/program/Canvas work, not a new simulation hot loop.
- Full mode remains bounded at 100 cosmetic effects and 100 live particles per
  emitter. **Gentle** now enforces 36 / 30, with unchanged simulation/rewards.
  Its noisy headless frame sample is retained too; it is not presented as a
  measured FPS improvement. No physical iPhone 60-FPS claim is made.


## Important fixes

- Replaced eager loading of all 200 tower textures with eight base textures plus
  on-demand upgrades. Selected towers prefetch only their legal next appearances.
  Existing art remains visible while replacement art downloads. Repeated requests
  share one promise, failed requests back off, and event listeners are cleaned up.
- Small shop/collection icons use the existing 256px exports. Larger portraits
  retain matching 512px images. Adventure menus use new small WebP thumbnails,
  preserving the original approved map paintings.
- Painted maps now replace, rather than sit underneath, procedural scenery.
  Late map downloads cannot overwrite a newer adventure. The map texture cache
  keeps at most two paintings; upgraded tower textures are cleared between runs.
- Corrected boss/elite display sizing: illustrated sprites no longer expand to
  their full 256px source width when a scale multiplier is applied. Hero attack
  squash/stretch now uses the intended 72px display size instead of absolute
  source-image scale, including repeated active-ability attacks. Boss labels
  use their actual names. Unarmored enemies no longer get a broken-armor tint.
- Hero growth is cosmetic and follows existing levels: baby 1–3, teen 4–6,
  adult 7–10. Cards, battle art and HUD agree. Owl/Fox/Bear stay decorative and
  cannot become playable heroes. Restart clears hero movement mode.
- Placement hints no longer intercept valid battlefield taps. Cancel placement
  remains interactive. Corrected cramped HUD numbers and narrow portrait sheets.
- Fixed hero/relic card text collisions, restored their supplied illustrated
  frames, added full relic information on tapping its artwork, and kept all
  primary menus within representative viewports. Pre-battle thumbnails, small-phone
  footer actions, battle-menu grids and rewarded end screens now fit as well.
  Section headers use nine-slice framing rather than squashing ornaments.
  Fonts are self-hosted with OFL
  licenses, avoiding external font failures and inconsistent fallback metrics.
- The primary Play adventure button now opens adventure setup. Classic remains
  a clearly labeled, fully unlocked, separate practice option.
- A failed startup image keeps battle entry disabled and offers Retry pictures.
  The original Phaser-input-ready loading guard is preserved.

## Fun codes — intentionally retained

Five taps must fit within three seconds; ordinary isolated taps cannot reveal
codes. Gold/wave codes are disabled outside an active battle. Choosing one opens
an additional confirmation with **Cancel focused by default**. No resource or
wave change occurs on reveal, selection, or Cancel.

Confirmed adventure cheats become a clearly labeled **just-for-fun run**. It
cannot grant Crowns, XP, relics, achievements or campaign rewards, and cannot
replace or delete the normal checkpoint. Refreshing/Continue restores the normal
checkpoint. Starting a new normal run restores normal progression. Classic has
no permanent rewards as before. Jackson/Luke sky-writing remains available,
works without disrupting navigation, has bounded simultaneous overlays and
cleans itself up. These are playful hidden controls, not an anti-tampering or
competitive-security system; the existing client-authoritative game has no
competitive leaderboard.

## Evidence and reproducibility

- [Screenshot gallery](gallery.html) and [GitHub-viewable screenshot index](screenshots.md).
- [Asset inventory](asset-audit.json): dimensions, alpha bounds, file sizes and
  SHA-256 hashes for all approved runtime PNGs. Run
  `python scripts/v5-audit-assets.py` with Pillow installed.
- [Map overlay contact sheet](maps/all-maps-contact.jpg), [exact interpolated
  geometry](maps/geometry.json). Run `python scripts/v5-map-overlays.py`.
  Cyan = actual centerline, pink = nominal 44px path, red = original obstacle
  and outer tower-center clearance. Current map source is unchanged from main
  and the geometry used by PR #14; no path or placement exceptions were added.
- [Menu/layout measurements](layout/measurements.json). Run
  `node scripts/v5-capture-layouts.js` against the task-owned dev server.
- Funded wave-by-wave reports: [V3 strategies](balance/v3.json),
  [V4 modes/maps/heroes](balance/v4.json), [Classic strategies](balance/classic.json).
- Cold shipped-build, crowded development fixture, and repeated-session memory
  measurements are separate JSON files in this directory. They measure headless
  Chromium on the runner, not physical iPhone performance.

Full validation commands:

```sh
npm test
node --test tests/rules-deployment.test.js
npm run test:cloud
PLAYWRIGHT_USE_BUNDLED= npm run test:browser
node scripts/v3-balance-report.js
node scripts/v4-balance-report.js
node scripts/balance-report.js
npm run build
npm run preview -- --port 4173 --strictPort
node scripts/production-smoke.js http://127.0.0.1:4173/tiny-siege/
node scripts/v5-cold-preview.js
node scripts/v5-layout-performance.js
node scripts/v5-session-memory.js
```

The cloud suite runs against `demo-tiny-siege` Auth/Firestore emulators, including
migration, malicious-write rejection, two-browser restoration, offline/reconnect
and account isolation. The local official emulator JAR download is blocked by
this environment; the existing GitHub Actions emulator job supplies that evidence.
The normal browser suite gates its cloud-only test separately; it is not a
substitute for that emulator job.

## Remaining issues

**Release blockers:** none identified after the final required checks pass. If
that final head is not green, this recommendation does not apply.

**Important but non-blocking:** physical iOS/PWA and real Google-consent behavior
are unverified; heavy headless performance is variable and is not 60 FPS; cold
transfer is still about 8.3 MB. These deserve owner/device review before broad
rollout. Normal saves are covered by emulators and local browser tests, not real
player-account writes.

**Cosmetic/polish:** some decorative dialog headers and very compact labels could
use further owner-directed polish. Fine Tier 1 details can be subtle at real
phone size; the contact sheets deliberately show actual rendered pixels. No
approved art was redrawn to conceal these tradeoffs.

## Limits and owner review

- No physical iPhone/iPad Safari, standalone iOS PWA, real Google consent popup,
  or real-parent cross-device account was used. Browser/emulator checks do not
  establish those device/account behaviors.
- Muse's original design mockups referenced by the V5 plan are absent from this
  checkout. The audit compares the actual supplied artwork and running V4/V5
  baseline, rather than claiming a pixel comparison with unavailable concepts.
- Painted scenery contains decorative trees/rocks beyond the original simulation
  obstacle list. The existing geometry remains authoritative. No silent new
  placement restrictions or balance changes were introduced.
- Hero PNGs are stage illustrations with existing movement/effects, not complete
  frame-by-frame walk/attack animation sheets. The decorative three extra hero
  families are not playable. Classic still has 20 waves; the six progression
  adventures support Easy20/Medium40/Hard100.
- All asset exports are available in the static build. On-demand loading limits
  the initial transfer; offline completion is not promised without a service
  worker. No service worker or paid hosting was introduced.
- The PR remains draft for the owner's visual review and explicit authorization.

## Playable review build

The PR-only `v5-illustrated-audit-preview` Actions artifact contains the shipped
build and this gallery (seven-day retention). It is downloadable, not a hosted
production site. The committed screenshots remain available after artifact
expiry. Check out this branch and use the existing Vite dev/preview commands
for a playable local review; the base remains `/tiny-siege/`. No public preview,
production deployment, Firebase rule publication or billing change was made.
