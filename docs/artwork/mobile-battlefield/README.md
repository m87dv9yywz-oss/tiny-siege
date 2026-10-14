# V5 mobile battlefield prototype — owner review required

Stacked on PR #13 (`feature/v5-archer-art-prototype`), with the approved 16 Archer appearances intact. Neither prototype is merged or deployed. No Firebase rules, credentials, save formats, prices, damage, maps, enemy paths or campaign settings change.

## Actual rendered comparison

Measured at **844 × 390 CSS pixels**, Chromium with touch enabled, DPR 1, normal browser viewport, zero emulated notch insets. The full 960 × 640 Phaser Canvas remains visible, uniformly scaled at 3:2.

| Board | Canvas size | Canvas area / viewport | Scale |
| --- | --- | --- | --- |
| Running Archer prototype / V4 layout | 306 × 204 | 19.0% | 0.31875 |
| New layout, no selection | 552 × 368 | 61.7% | 0.575 |
| New layout, either upgrade panel open | 552 × 368 | 61.7% | 0.575 |

This is **3.25× the battlefield area** and **1.80× the on-screen tower dimensions**. Borders are excluded. The 552px width is a result of the available width/height, not a fixed phone-size constant. Physical Safari toolbar/notch measurements are not claimed.

| Actual Phaser + HTML capture | Image |
| --- | --- |
| Original V4 artwork/layout, retained from the Archer audit | [V4](before-v4-landscape.png) |
| Fresh Archer-branch baseline, before layout edits | [Before](before-prototype-landscape.png) |
| Enlarged map, no selection | [After](after-landscape.png) |
| Left Archer → right upgrade panel | [Right panel](panel-right.png) |
| Right Archer → left upgrade panel | [Left panel](panel-left.png) |
| Paid Reinforced Arrows, matching upgraded battlefield/card artwork | [Upgraded](upgraded-panel-left.png) |
| Active combat with the upgrade panel still open | [Combat](active-wave-panel.png) |
| All eight towers available, placement/cancel UI | [Placement](placement-landscape.png) |
| Adventure hero, ability controls and upgrades | [Hero](hero-wave-panel.png) |
| Larger phone | [932 × 430](selected-932x430.png) |
| Smaller phone | [667 × 375](selected-667x375.png) |
| Portrait phone fallback | [390 × 844](selected-390x844.png) |
| iPad portrait | [768 × 1024](selected-768x1024.png) |
| iPad landscape | [1024 × 768](selected-1024x768.png) |
| Desktop | [1440 × 900](selected-1440x900.png) |

[Open the local screenshot gallery](gallery.html). These are real development renders; the layout tests buy towers/upgrades with the normal costs. Existing stress/art coverage uses isolated development fixtures and is not evidence of campaign balance.

## Layout and interaction

Short landscape screens have two compact rails: resources/menu/settings and wave/pause/speed on the left; eight illustrated shop entries on the right. Adventure hero controls occupy the bottom of the shop rail. The battlefield fits the space between them. Secondary sound, effects, restart and help actions live in an accessible Settings drawer. Essential controls remain outside the upgrade overlay.

The selected tower's world x coordinate chooses the opposite upgrade side. At the exact midpoint the previous side remains. The overlay does not change the battlefield's grid column or fitting budget. Gold-only updates retain native upgrade/targeting controls. Wave, pause, speed, settings and hero ability taps preserve the panel. Closing it retains the range; selecting another visible tower updates its contents and side. Hero relocation deliberately dismisses upgrades, as before.

Portrait phones/tablets retain the largest full-width 3:2 board. With no selection, controls sit immediately beneath it instead of leaving a large gap. A selected tower opens a compact left-anchored sheet below the board, with a small overlap. The shop remains available in two rows. Desktop/tablet landscape keep their larger established HUD and shop with an opposite-side overlay.

`src/viewport.js` measures visual viewport and safe-area-adjusted DOM space, uses integer 3:2 dimensions and refreshes Phaser's parent bounds. `UI.worldPoint` still reads the current canvas rectangle for every gesture. No alternate world, camera crop, orientation-lock API or gameplay coordinates were introduced.

## Validation and limits

Validation results and CI link are recorded in the pull request. Focused tests exercise panel sides, unchanged canvas dimensions, immediate paid artwork changes, live combat, 44px main/shop targets, no page overflow, real repeated viewport transitions, native touch placement after rotation, and hero controls. The full existing suite covers all 16 Archer states/nine visual fallbacks, drag placement, upgrades/selling, eight towers, heroes, progression/checkpoints and cloud synchronization. Earned-gold V3/V4 reports are rerun without balance changes. Production build and shipped UI are checked separately.

The original reference plan's `screenshots/` directory is absent from the Archer prototype checkout. The preserved V4 capture and freshly measured running baseline supply the comparisons; no missing reference images were invented.

Known tradeoffs: overlays cover some of the opposite map edge; a tower underneath an overlay requires closing it before tapping. Narrow portrait uses a sheet, since a full-height side panel would cover most of the board. Long blueprints still use the existing paused reading interface. Fine Archer details improve with scale but the nine Tier 3 artwork states remain the prototype's approved Tier 2 fallbacks. No physical iPhone/iPad Safari or home-screen PWA test has been performed.

## Playable review build

The PR-only `mobile-battlefield-prototype-preview` Actions artifact includes `dist/` and this screenshot gallery. It is a downloadable production build, not a hosted site. The checked-out branch is playable with the existing `npm run dev` or `npm run build` / `npm run preview` commands. No production deployment or public preview hosting is created by this PR.
