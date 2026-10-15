# Follow-up to the owner's iPhone playtest

The original audit missed real label collisions and a short-lived combat image
scale bug. The owner's Safari screenshots and seven-second recording made those
defects clear. This follow-up supersedes the earlier visual assessment for the
areas below. Production remains unchanged; fixes are in the PR and isolated preview.

## Corrections

- Enemy death ghosts now shrink relative to their displayed size. Previously the
  animation called `setScale(.75–1)` on a 256px PNG after sizing it down, causing a
  large full-source image to flash on a kill. Ordinary tower/hero attack effects
  remain and the attack-size regression covers all eight tower classes.
- Hero-specific legacy image heights no longer spill into the labels. Shop locks are positioned relative to their own card, rather than piling up at
  the shop's upper-right corner. Icons, names and prices occupy separate grid rows.
  Short landscape viewports with a hero are included, not just Classic without one.
- Life and enemy counters no longer compete for the same half-width HUD cell.
- Illustrated button borders reserve real layout space for their ornaments;
  labels occupy the center. Profile buttons use the available width. Difficulty
  choices have one centered label instead of a competing second description.
- Short landscape collection/hero screens retain their actions without scrolling, and collection progress pips share one compact row with their tier label.
- Map names and stars are anchored to their painted ribbon/star slots with an
  explicit line height, including the smaller preparation thumbnail.
- Preparation text uses the selected wave count instead of the old fourteen-wave
  beginner description. No wave composition, economy, saves or balance changed.

## Actual rendered captures

- [Create profile](profile-375x680.png)
- [Preparation](preparation-375x680.png)
- [Hero-equipped landscape gameplay](battle-844x390.png)
- [Short landscape with browser-toolbar headroom](battle-844x330.png)
- [Small landscape phone](battle-667x320.png)
- [Portrait gameplay](battle-390x730.png)

These are real Phaser/HTML captures, with no artwork redrawn. The user's original
recording is not republished. Preview cloud access remains disabled and its
browser saves remain separate from production.

- [Short landscape tower collection](collection-844x330.png)
- [Small landscape tower collection](collection-667x320.png)
- [Short landscape hero collection](heroes-844x330.png)

## Regression coverage

`tests/browser/v5-phone-feedback.spec.js` adds ten checks: nine representative
viewports and one frame-by-frame effect case. It measures actual text ranges
against button content areas (excluding ornamental borders), checks each shop
label/price/lock against its own card, verifies HUD cells do not overlap, and
checks all fourteen death pictures plus eight attack animations stay at intended
sizes. The initial ten checks passed locally; the strengthened icon and short-menu checks also pass alongside the existing collection/full-tree regressions. Existing menu, touch, rotation, cloud, balance and
build checks run again in the PR's full CI; the final tested commit/run are recorded
in the PR description. Public Chromium/WebKit verification runs separately on
`preview/pr17-isolated-hosting`. Emulation does not replace physical Safari review.
