# Archer artwork integration prototype — review only

Branch: `feature/v5-archer-art-prototype`. Based on production V4, with no merge or deployment authorized. This is the Archer integration test, not the full V5 layout redesign.

## Rendered iPhone landscape comparisons

All captures are actual Phaser Canvas + HTML UI renders at **844 × 390**, not mockups. The after screenshots use an isolated development gold fixture to exercise upgrades; they are not campaign-balance results. The existing V4 layout is deliberately retained.

| View | Screenshot |
| --- | --- |
| Before: original V4 Archer | [V4 baseline](before-v4-landscape.png) |
| Approved illustrated base | [0-0-0](after-0-0-0-landscape.png) |
| First upgrade: Reinforced Arrows | [1-0-0](after-1-0-0-landscape.png) |
| Two different Tier 1 upgrades | [1-1-0](after-1-1-0-landscape.png) |
| Armor-Piercing Bolts | [2-0-0](after-2-0-0-landscape.png) |
| Tier 2 + Quick Draw | [2-1-0](after-2-1-0-landscape.png) |
| Multishot + Eagle Eye | [0-2-1](after-0-2-1-landscape.png) |

All 16 supplied states have screenshots in this directory, including their matching selected-tower card.

## Integration

`src/towerArtwork.js` is the single state resolver for battlefield textures and HTML portraits. Shop/collection show the base of a new tower; the selected card and battlefield use that instance's full `paths` combination. All 16 PNGs are preloaded at 256px; 512px portraits load through ordinary image URLs. Nine missing Tier 3 states use the matching Tier 2 combination, while all actual Tier 3 statistics, names, targeting, projectiles and abilities remain in force.

Imported masters are byte-identical to the approved files on `docs/v5-master-artwork-handoff-20261014`, source commit `8e9e209ec70945ee324d04671a3d193d20153f15`. They remain in `artwork/towers/archer/states/`, outside the public runtime directory. Only the five requested handoff documents were copied; no unrelated feature branch code was merged.

`scripts/export-archer-art.py` derives transparent PNGs in `public/assets/v5/towers/archer/{card_512,battlefield_256}/`, preserving filenames and the complete original canvas. It requires Pillow only when regenerating exports; normal builds need no new dependency. The runtime manifest records original and derivative checksums. These generated derivatives are not claimed to be the earlier uncommitted exports referenced by the original handoff manifest.

An 80×80 world-unit display and common `(0.5, 0.96)` ground pivot keep towers at their placement coordinates without trimming artwork or stretching proportions. Hit testing now accounts for that origin and scale, including the first render frame; recoil is relative to the image's scale. Procedural Archer path ornaments are suppressed so they do not overwrite the approved illustration. Other towers retain their existing rendering. No layout, game statistics, prices, abilities, save schema, Firebase rules or billing change.

## Visual observations and limits

- Transparent backgrounds render directly over the existing grass; no white rectangles were observed.
- Tower foundations remain centered, and the native roof/artwork hit target opens the panel. Range and upgrade controls remain available.
- The new silhouettes/materials are richer. At the current small V4 iPhone landscape battlefield, fine bows, scopes and secondary accessories are still difficult to distinguish. The future V5 battlefield enlargement is intentionally out of scope; passing interaction tests is not approval of final art readability.
- Existing compact landscape cards also limit how much 512px detail is visible. The prototype does not enlarge/rebuild that interface.
- Source illustrations have small differences in edge/ground coverage. The prototype keeps a common pivot and does not independently crop, repaint or re-register approved masters. Further registration adjustments require visual review.
- Nine final evolution illustrations remain missing by design. Their gameplay works, but they share Tier 2 artwork temporarily.
- Chromium touch emulation is not physical iOS Safari verification.

## Asset and performance budget

| Assets | Total bytes |
| --- | ---: |
| Original 16 masters (not shipped to browsers) | 23,397,585 |
| 16 battlefield PNGs, 256×256 | 1,574,132 |
| 16 card PNGs, 512×512, loaded as needed | 5,045,004 |

Battlefield textures add approximately **4 MiB of decoded RGBA pixels**, independent of how many Archer instances reuse them. If every card is retained decoded, those 16 images account for up to another 16 MiB; this is an image-memory estimate, not a measurement of total browser heap. PNG resizing uses premultiplied alpha and Lanczos filtering. Existing bounded combat/effects stress checks remain applicable; no physical-device FPS guarantee is made.

## Tests and preview

`npm test` includes focused tests for all 25 legal combinations, nine fallbacks, malformed states, PNG dimensions/alpha format and unchanged other-tower textures. `tests/browser/archer-art.spec.js` purchases all 16 real states, checks immediate texture/portrait updates and usable roof taps, tests nine Tier 3 combinations, checks relative recoil and records network/page errors. The existing busy-scene test now inspects the Archer's actual illustrated texture.

PR CI runs the full existing gameplay/browser/cloud-emulator/balance/build checks. A PR-only **archer-art-prototype-preview** artifact contains the production build and these screenshots; it does not deploy anything or publish Firebase rules. No hosted preview is created by this change. The checked-out branch is playable using the existing Vite development/preview commands from AGENTS.md.

For future towers, extend the shared artwork resolver with that tower's available state pack and register its preload/display size/pivot in GameScene. Shop, collection and selected-card consumers already use the shared portrait interface. Completing Archer's Tier 3 pack also requires registering its exact states before the temporary Tier 2 fallback; no upgrade or save-system rewrite is required.
