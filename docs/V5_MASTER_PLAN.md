# TINY SIEGE V5 — VISUAL & UX MASTER PLAN FOR CODEX

**Priority:** iPhone landscape-first, then iPad and desktop. **Repo:** `m87dv9yywz-oss/tiny-siege`. **Production:** `https://m87dv9yywz-oss.github.io/tiny-siege/`.

## Mission

V4 has substantial content; V5 must make it feel like a *polished, visually rich, child-friendly 2D tower defense game* rather than a small game embedded in an oversized website. Build a coherent, responsive, visually appealing, touch-first experience; preserve all V4 mechanics, progress, saves, levels, towers, heroes, achievements, unlocks, wave modes, balance, and existing regression tests unless expressly approved to change them. **Do not directly imitate/copy Bloons character artwork, logos, specific UI assets, or proprietary visuals.** Borrow only high-level UX patterns, using original Tiny Siege visuals.

## ESSENTIAL: LOOK AT THE ACTUAL IMAGES FIRST

The `screenshots/` directory contains 11 original screenshots supplied by the game owner. Read all images visually, at full size, **before coding**. The `REFERENCE_CONTACT_SHEET.jpg` gives an overview but is not a substitute for the original screenshots. Create an explicit before/after checklist keyed to each reference.

**UX reference screenshots (Bloons TD 6 — UX inspiration, not artwork to copy):**
- `01_bloons_shop_fullscreen.jpeg` — battlefield uses nearly full available horizontal/vertical space, shop fixed on right, playable content visually dominant, large actionable controls.
- `02_bloons_upgrade_left.jpeg` — selected tower on right of field; information and upgrades on LEFT, allowing significant battlefield view and easy access to play.
- `03_bloons_map_fullscreen.jpeg` — art and gameplay fill the center and beyond with little dead space.
- `04_bloons_upgrade_left_dart.jpeg` — inspect left-side panel structure, tower portrait, three upgrade paths, sell, clear targeting.
- `05_bloons_upgrade_right_dart.jpeg` — selected tower on left; the very same upgrade panel moves to RIGHT.
- `06_bloons_upgrade_right_playing.jpeg` — while panel is open and wave running, level remains visible and controls functional.

**Tiny Siege existing problems (must compare against references):**
- `07_tiny_siege_small_battlefield.jpeg` — landscape battlefield occupies only a small central fraction of the screen, enormous empty margins, small unreadable towers and enemies, text-heavy horizontal UI.
- `08_tiny_siege_hero_art.png` — simplistic flat hero icons (Ember/Rex/Stripe), excessively wordy cards, lack of appealing 2D character artwork, poor visual hierarchy.
- `09_tiny_siege_hero_move.jpeg` — battlefield tiny, hero moving instruction covering play area, information spread all over screen.
- `10_tiny_siege_cannon_placement_overlay.jpeg` — difficult/unresponsive-feeling cannon placement, guidance overlays bottom-left controls, tiny preview/map; must investigate pointer events and placement state, not assume a cosmetic-only issue.
- `11_tiny_siege_main_menu.jpeg` — crowded modal of generic text boxes and level names, unclear primary start action and child-friendly navigation; needs attractive graphical campaign selection.

## Current architecture: inspect rather than guess

The repository currently uses Phaser 4.2.1 + Vite 8.3.4. `src/main.js` constructs `new Phaser.Game` using `Phaser.CANVAS`, a 960×640 logical game and Scale.FIT. `src/scenes/GameScene.js` uses Phaser sprites/graphics/particles, SVG loaders, canvas DOM pointer listeners, procedural battlefield imagery. `src/ui.js` produces HTML overlays/shop/controls. Inspect `src/scenes/art.js`, `src/viewport.js`, `src/style.css`, `src/progression/KingdomUI.js`, art folders, and related input tests before designing changes. The engine IS being used, but current art pipeline and DOM layout produce an unpolished result. Preserve decoupled simulation. Compare Canvas and WebGL practically (feature/visual parity and devices); do not blindly switch rendering mode or risk performance.

## Phase 0 — Audit, UX spec, and concrete mockups (approval gate)

1. Inspect repo and all 11 screenshots and capture production/preview on real iPhone landscape dimensions, narrow and wide iPhones, iPad landscape/portrait, and desktop; log screen dimensions and device-pixel ratios. Inspect existing touch event coordinates including browser zoom, safe area/notch, drag, placement, menu overlays, 2x speed and canvas resize.
2. Produce realistic *before/after UI mockups* for (a) gameplay no tower selected; (b) selected tower in left/right half with panel on opposite side; (c) dragging/placing a cannon; (d) main adventure selection; (e) hero selection with improved original art. Do not count CSS wireframes as finished art.
3. Document viewport space allocation and touch-size rules with prioritized iPhone constraints. Preserve visible start-wave/pause/speed/abilities. A target of ~75–85% of landscape width for battlefield is a **design aspiration**, not a hard mandate if safe-area controls require an adjustment. Main measure is maximal useful map area with large readable units.
4. Present an initial screenshot comparison to owner for sign-off BEFORE spending major effort rebuilding menu/game artwork. Codex may implement a non-production preview branch while awaiting approval. Do not merge merely because functional tests pass.

## Phase 1 — Gameplay viewport and input reliability

- Make the battlefield the primary surface; avoid giant decorative margins. Treat the 960×640 world as world coordinates, not a compulsory on-screen DOM-size box. Preserve camera/world geometry and placement paths; provide appropriate viewport mapping and scaling to screen. Avoid cropping actual route endpoints or reducing hit area of towers/enemies.
- Place minimal HUD for gold, lives, wave and settings; accessible start/play and speed controls and a compact scrollable/collapsible tower picker. Distinguish active, affordable, unavailable/locked states. Prices/titles never overlap cards. Maintain 44pt-ish minimum practical touch targets where feasible; use safe-area inset handling.
- **Adaptive upgrade panel**: selected tower on LEFT of battlefield => dock panel on RIGHT; selected tower on RIGHT => LEFT. Prefer unobstructed selected tower/critical path; if near center choose side with more free room. Changing selection updates side seamlessly. Panel overlays/docks without crushing the world to tiny size. Show attractive portrait, target mode, path details, upgrade prices/eligibility, sell, close. Long upgrade descriptions can scroll *within* panel; wave start and other crucial controls remain usable. Use animation sparingly and respect reduced motion settings.
- **Cannon/tower placement correctness**: reproduce user flow (choose cannon then attempt to place on green ground) on touch. Diagnose if freezing due to DOM overlay intercept, pointerdown vs pointerup, stale `worldPoint` canvas bounds, transform/scaling, drag suppression, overlay prompt, or game state. For tap-to-place and drag-to-place, show responsive ghost with proper finger offset, full-size green/red validity cue, on-canvas error reason for invalid placement, clear cancel, and no unintended spending. Ensure modal/tooltips never cover target and prevent placement. Placement interaction must be robust even as battlefield/sidebars reflow.
- Keep tutorial messages short, anchored to available space; never obscure controls and never extend beyond screen/card bounds. If a tip is longer, use dismissible overlay/coach mark or compact accessible help, not a giant bottom-left speech bubble.
- Handle device rotation, narrow/wide landscape phones, iPhone notches, portrait fallback gracefully. Make it usable on tablet/desktop, not just a zoomed phone. Consider full-screen/PWA behavior, scrolling, browser address-bar changes.

## Phase 2 — Original art direction and proper 2D assets

- Establish a **unified Tiny Siege art bible** before mass-producing assets: friendly vibrant fantasy, appealing and expressive to kids, cohesive outlines, painterly/cel shading, readable at tiny on-map dimensions, consistent perspective, lighting, colors and silhouettes. Do not reproduce Bloons assets or characters.
- The existing simple SVG/procedural heroes in screenshot `08` are NOT target quality. Create new original hero **character portraits** for Ember (fire dragon), Rex (T-rex/dinosaur), Stripe (tiger), with distinct expressions, poses and abilities; match hero concepts already approved by owner where available. Do not silently invent/reference inaccessible older art: request those files if needed. Build **gameplay sprites** and corresponding animations for idle, travel, attack, ability, damage/celebration where relevant. Character artwork must be consistent between menu and battlefield.
- Redesign all eight towers and major evolution appearances (and enemies/bosses as needed) with original 2D artwork consistent across levels. At least distinct high-level silhouette and clear progression per upgrade. Prioritize early accessible towers and all three heroes, then remaining towers/evolutions. Improve weapon projectiles, hit feedback, explosions, elemental effects, shadows and subtle movement while preserving ability/readability to play at x1/x2 speed.
- Use transparent, optimized sprite sheets/texture atlases (PNG/WebP as appropriate), layered assets and simple in-engine animation. Use Phaser's actual sprite/animation capabilities rather than programmatically drawing each character as basic geometry. AI images are useful for concepts/portraits, but must be cleaned/cropped/registered into consistent sprites; do not pass off one large image as a full animation. Use licensing-cleared tools/assets, no paid services without approval. Keep image dimensions/texture memory appropriate for iPhone and older devices; preloading should not cause huge latency.
- Improve battlefield artwork and readability: richer route/terrain, level-specific shapes, foliage, water, rocks, weather/biome ambience with unobstructed play space. Keep enemies visually distinguishable from scenery; remain clear where building is valid. Make different campaign levels visually differentiated.

## Phase 3 — Menu/navigation transformation for children

- Replace generic word-heavy rectangular homepage with an appealing adventure/level select experience. Clear hierarchy: profile, large **Play/Continue**, graphical map/level selection with thumbnails and recognizably different biomes, completion/progress badges, meaningful locked/unlocked states. Do not make selecting 20/40/100 waves a confusing separate difficulty picker; preserve established Easy=20, Medium=40, Hard=100 coupling unless mechanics dictate otherwise.
- Remove clutter from first-run flow. Use visual tower/hero cards with appealing art, understandable affordability/lock cues, unobtrusive secondary details. Expand/collapse advanced text, place explanatory text in the help/guide not as small dense body paragraphs. A child should know how to start a level within seconds without reading paragraphs.
- Group secondary actions (cloud saves, manage profile, settings, guide, relics, statistics, etc.) logically, preserving accessibility. Avoid giant modal blocking all gameplay for every simple action.
- Fix all card overflow and uneven text baselines/spacing. Never put prices across neighboring cards. Use internal scrolling for long informational cards or menus where beneficial; scrolling is acceptable when alternative is microscopic typography.

## Phase 4 — QA, acceptance and rollout

**Visual acceptance tests** (automated screenshot assertions + manual review; DOM overflow alone is insufficient):
- iPhone landscape (small and large sizes, with notch safe areas): battlefield dominates; key HUD/side shop readable; no clipped interactive elements; hero/tower sizes readable; no sideways page scrolling.
- iPad landscape/portrait and desktop: responsive density and panel positioning rather than excessive whitespace or weird stretched artwork.
- Selection near extreme left/right: upgrade panel changes sides; selected unit and wave controls unobstructed; other play continues.
- Tower placement by tap AND drag under reflow/rotation: valid spot succeeds exactly once, invalid has clear immediate feedback, cancel works, no freezes, overlay never steals input.
- Full menus including hero cards, 8 tower shop entries, evolutions, upgrade paths, locked cards, 20/40/100 wave campaign selection and long descriptions: no text/price/images crossing boundaries; scroll where necessary.
- Playback during active wave with panel open; restart/pause, x2 speed, 0 currency; click/tap outside; cloud save/restore; cross-browser/mobile. Test at least two actual touch-capable browsers/devices if possible; otherwise clearly label emulation and request real-device confirmation.
- Automated visual captures side by side with source reference filenames and V4 baseline; include screenshot links in PR and an itemized resolved/issues list. Functional tests must still pass including cloud/Firestore auth test suite and long campaign simulations. Monitor frame rate, input lag, draw calls/memory, load time and sprite asset payload for old iPhones. Keep accessibility/reduced-motion and sound preferences.

**Rollout:** Branch `feature/v5-visual-ux-overhaul` or use several linked preview PRs: (1) layouts/placement, (2) art/animations, (3) menus, (4) integration/QA. Supply real previews and screenshots for each. No production merge until the owner signs off on visual experience and regression gates pass. Avoid migrations or changing live Firestore rules unless absolutely necessary; never publish rules or alter auth/billing without explicit approval. No unnecessary backend work or paid tool subscriptions.

## Reporting back

Each checkpoint should answer: what screenshot reference changed; exactly what was implemented; show BEFORE/AFTER rendered screenshots at same device size; which manual touch flows passed; tests and performance; blockers; next tasks. A successful automated CI run **is not** proof that it looks good. Aim for art polish and joyful moment-to-moment feel, not just technically valid rectangles.


---

## October 14, 2026 — Art-production checkpoint and repository handoff

**Authoritative current asset state is in `docs/artwork/ARTWORK_INDEX.md`.** The current approved Archer tower set contains 16 of 25 legal states: original (1), single Tier 1 (3), two-Tier-1 combinations (3), single Tier 2 (3), and Tier 2 + Tier 1 combinations (6). The final 9 Tier 3 states are **not yet created**.

There are 15 blank UI templates (cards, badges, tabs, buttons, panels, slots, XP frame), 6 character illustrations for Ember/Rex/Stripe, initial Archer/Cannon/Frost tower shop art, and 4 V5 original layout/menu mockups. Preserve the approved tower proportions, perspective, transparent cutouts, and exactly matched battlefield/card visuals. The new Tier 3 appearances will be visually distinct for Siege Ballista, Arrowstorm, and Master Sniper plus optional Tier 1 crosspaths.

**Persistence and scope:** The master plan and manifest live in this GitHub repository; raw binaries are in the persistent Drive archive until copied into the Git repository. User requests to 'save' artwork always refer to a persistent Codex-accessible project location, never to conversation-only files. Instructions for the one-time direct Git import are in `docs/CODEX_ACCESS_AND_INTEGRATION.md`. Never imply a private Drive link is automatically accessible to every Codex; verify binary availability on any new checkout.

The images are user-approved source art, **not yet validated in actual Phaser or deployed**. The mobile preview remains an approval gate. Do not overwrite the existing game's V4/V5 work or merge/deploy art work without explicit user approval.
