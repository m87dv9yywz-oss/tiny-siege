# Tiny Siege — Archer Artwork Specification v1

**Status:** Approved planning direction, **not yet generated or integrated**. Review each staged output before mass production. Source of truth for Archer art work; do not guess from screenshots alone. This is for `m87dv9yywz-oss/tiny-siege`, Phaser 4.2.1.

## Core goal
A tower upgraded in Tiny Siege should **visually evolve gradually**, like in Bloons' upgrade philosophy, while retaining its identity. A tower's **card preview and its battlefield appearance MUST derive from the same finished state artwork**, not separately-generated versions. The three upgrade trees are independent mechanical choices; one may reach Tier 3, another at most Tier 1, and the third remains 0. Only up to two paths can be purchased.

## Path identifiers and names (from current `src/data/towers.js`)
- A / index 0 / Siege Ballista: 1 Reinforced Arrows; 2 Armor-Piercing Bolts; 3 Siege Ballista.
- B / index 1 / Arrowstorm: 1 Quick Draw; 2 Multishot; 3 Arrowstorm.
- C / index 2 / Deadeye: 1 Eagle Eye; 2 Precision Strikes; 3 Master Sniper.

**State IDs:** `A-B-C`, 3 integers each from 0 to 3; use `archer_0-0-0.png` through `archer_3-0-1.png` as appropriate. Exactly **25 valid states**; do not generate illegal 2-2-0, 3-2-0, or 1-1-1. State map accompanying this document lists all 25.

## Base character design
Use existing `towers/archer/archer_shop_icon.png` as the APPROVED BASE VISUAL REFERENCE, not as a flat in-game animation frame without checking perspective. Stone foundation; wood lookout platform; green canvas canopy; paired green leaf banners; mounted wood bow. Friendly illustrative art, polished painted 2D with clean outlines. Hold fixed the foundation, ground-contact point, recognizable silhouette, dominant camera angle, color direction, approximate proportions. Work in a single master canvas coordinate space; upgrades must not shift the ground anchor or apparent tower center. Do not add text, pricing, card borders, labels, scenery, shadows baked into the sky, or ground patches beyond an optional separate contact shadow. Export RGBA with genuine transparency.

## Color language
- A Reinforced/Siege: steel and restrained crimson detail; heavier bolts/crossbows; defensive reinforcement.
- B Quick Draw/Arrowstorm: emerald greens; pulley/quivers; more firing stations.
- C Eagle Eye/Deadeye: warm brass/gold; telescope, eye emblems, long-range precision scope.
Path cues should remain identifiable at gameplay size, but secondary Tier 1 modifications should never overwhelm a primary Tier 2/3 tower.

## Per-state visual recipe
| State | Finished appearance |
|---|---|
| 0-0-0 | Base stone-and-wood watchtower; green canopy and banners; one wood bow. |
| 1-0-0 | Base + iron bands on bow, thick steel-tipped arrows, small crimson cue. |
| 0-1-0 | Base + light quick-draw pulley, extra quiver, green streamer. |
| 0-0-1 | Base + small brass telescope, gold eye emblem, slightly raised railing. |
| 1-1-0 | Base + iron bands/steel arrows AND quick-draw pulley/green streamer. |
| 1-0-1 | Base + iron bands/steel arrows AND brass telescope/gold eye. |
| 0-1-1 | Base + pulley/extra quiver AND telescope/gold eye. |
| 2-0-0 | Heavier armor-piercing ballista/crossbow, iron platform support, bolt racks, crimson banner. |
| 0-2-0 | Wide wooden platform, three bow stations, extra quivers, emerald fabric. |
| 0-0-2 | Slightly taller lookout with long elegant precision crossbow, gold scope, eye ornament. |
| 2-1-0 | A Tier 2 ballista + B quick-draw pulley and green streamer. |
| 2-0-1 | A Tier 2 ballista + C brass targeting scope and gold eye. |
| 1-2-0 | B Tier 2 multishot + A iron bow reinforcement, steel-tipped ammunition. |
| 0-2-1 | B Tier 2 multishot + C telescope and gold eye. |
| 1-0-2 | C Tier 2 precision + A reinforced bow limbs, heavier bolts. |
| 0-1-2 | C Tier 2 precision + B quick-draw pulley and green streamer. |
| 3-0-0 | Siege Ballista evolution: fortified mini siege tower; enormous bolt weapon; stone/iron reinforcing, crimson heraldry, trace original green. |
| 0-3-0 | Arrowstorm evolution: strong green canopy, circular platform with five coordinated bow stations, oversized quivers, emerald standards. |
| 0-0-3 | Master Sniper evolution: elegant taller gold-accented lookout, advanced precision crossbow, large telescope and golden eye crest. |
| 3-1-0 | Siege Ballista evolution + conspicuous but subordinate rapid-loading pulley and green streamer. |
| 3-0-1 | Siege Ballista evolution + brass targeting scope, eye emblem. |
| 1-3-0 | Arrowstorm evolution + steel reinforced limbs/heavy arrows, small crimson banner. |
| 0-3-1 | Arrowstorm evolution + gold telescope and eye emblem. |
| 1-0-3 | Master Sniper evolution + sturdy steel bolt racks/strengthened limbs/crimson cue. |
| 0-1-3 | Master Sniper evolution + fast loading pulley/green speed accents. |

## Approved change scale
- Tier 1: small clearly visible detail, roughly 5–15% visual change; same building silhouette.
- Tier 2: meaningful visual specialization, roughly 25–40% concentrated in weapons/platform.
- Tier 3: impressive but recognizable evolution, major silhouette change above same original foundation.
- Secondary Tier 1: modest detachable cue, not a second full evolution.
These are art direction ranges, not numeric pass/fail metrics.

## Deliverable structure
```
towers/archer/
  sources/approved_base_reference.png
  masters/                 # editable original/layered art or repeatable compositing instructions
  components/              # tightly aligned clean art layers if they pass visual QA
  states/archer_0-0-0.png   # exactly 25 complete transparent RGBA state images
  states/archer_...png
  cards/                   # exports derived from states, never separately redrawn
  battlefield/             # optimized exports derived from states
  manifest.json            # asset paths, A-B-C state keys, pixel dimensions, pivots, hashes
```

## Build and quality process
1. Review base Archer (0-0-0) and the three solitary Tier 1 variants (1-0-0, 0-1-0, 0-0-1) side-by-side at game size. Obtain user approval before extending.
2. Make three dual Tier 1 composite states; visually ensure accessories do not collide.
3. For each path, build Tier 2 and Tier 3 masters from the same locked base perspective, plus secondary modifiers. Produce and inspect all 25 complete images. Prefer using layers / controlled manual drawing / compositing; pure independent text-to-image regeneration risks perspective and silhouette drift.
4. Export one original RGBA source per valid state, then **derive** optimized menu and battlefield renditions from that source; do not regenerate the same state at different scales.
5. Register all with a shared ground contact/pivot; validate canvas dimensions, alpha channel, non-clipped weapons/banners, and stable alignment. Inspect composites on light and dark map surfaces, scaled to true iPhone battlefield size and menu-card size.
6. Generate `manifest.json` with state => filenames, anchor/pivot, path names, checksum and whether human QA approved. Only mark files ready once verified.
7. Codex should select art from `tower.paths.join('-')` in Phaser GameScene rendering and in HTML menu/cards via the same mapping. Fallback to base sprite for missing states while development-only warnings report any gaps; do not fail silently at release. Preserve gameplay logic, tower pricing, upgrades, cloud saves and old progression formats.
8. Prefer texture atlases/compressed WebP where beneficial after RGBA masters are approved; protect mobile memory/performance. Avoid distortion and no cropping critical ornamentation.

## Current status caveat
`archer_shop_icon.png` EXISTS already. The 25 final upgrade-state sprites DO NOT yet exist. The current hero/tower UI card art and most game art are still separate from the running app. Existing Phaser art uses generic Tier 1 appearance; Codex must extend `towerTexture`/renderer and portrait selection to support exact states. A visual preview and regression tests are mandatory before production merge.
