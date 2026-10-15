# Tiny Siege V5 — Illustrated UI & Full Artwork Integration (DRAFT — do not merge)

Integrates the complete approved artwork package and the V5 illustrated UI.

## Artwork imported

- **Towers:** all 8 towers (Archer, Cannon, Frost, Fire, Lightning, Grove, Windcaller, Runesmith) × 25 A-B-C states = 200 states, as `battlefield_256` + `card_512` exports under `public/assets/v5/towers/`. The real Archer Tier-3 art replaces the PR #13 Tier-2 stand-ins — Tier 3 no longer falls back.
- **Enemies:** all 14 illustrated sprites wired into GameScene (radius-based sizing, tint for armor states, no rotation on path turns).
- **Maps:** all 7 hand-painted maps as battlefield backgrounds (painted mode skips the procedural background/road; route geometry verified).
- **Heroes:** 18 sprites (6 families × 3 stages) under `public/assets/v5/heroes/`.
- **UI kit:** 41 assets under `public/assets/v5/ui/` (optimized runtime copies only; the 42 MB master kit stays out of the repo and off startup).

## UI

All 9 screens per `UI_V5_SCREEN_LAYOUTS.md`: main menu, adventure select, pre-battle, hero collection, tower collection, relics, in-game menu, victory/defeat, gameplay HUD. All text is real HTML over illustrated shells (no baked text). Baloo 2 + Nunito.

Fixes the reported overlaps: the upgrade panel docks without covering the right-rail shop, and hero ability controls no longer overlap the bottom shop cards.

## Easter eggs (hidden)

- Tap the main-menu logo 5× (or the gold counter 5× in battle) → cheat panel: **+10,000 gold**, **+10 waves** (jumps to the final wave when fewer than 10 remain).
- **Jackson** and **Luke** sky-writing: golden firework letters across the sky, temporary, no gameplay effect.

## Preserved

All mechanics, progression, saves, Firebase schema/rules, difficulty coupling, and the enlarged mobile battlefield. Restart stays in the in-game menu behind confirmation.

## Testing

- Logic suite: 86/86 pass.
- Browser suite: run at 844×390, 932×430, 390×844, iPad, and desktop sizes; screenshot gallery attached in PR comments.
- No merge/deploy without owner approval.
