# Reusable Tiny Siege map-art specification

These are read-only art references, not proposed gameplay changes. Start from the guide for the exact **map ID**, not from an adventure screenshot or an approximation. All seven current IDs have their own exports: `classic`, `emerald`, `amber`, `moon`, `garden`, `crystal`, `coast`. Classic and Emerald intentionally share route geometry; do not invent a seventh unique route.

## Coordinates and file contract

- Logical canvas: **960 × 640**, origin `(0,0)` at the top left; x increases right and y increases down. No stretching, rotation, crop, extra border or repositioned route.
- Artwork-production canvas: **1920 × 1280**, precisely twice the logical coordinates, stroke widths and obstacle radii. Draw/export at this resolution rather than enlarging a low-resolution bitmap. The guide generator does the same.
- Each map supplies `ID-guide-WxH.png` (annotated guide), `ID-painted-path-WxH.png` (transparent exact painted-route layer), and `ID-valid-centers-WxH.png` (binary grayscale mask: 255 valid / 0 invalid). Both resolutions are included. Only the last two are unannotated masks suitable for exact registration; grid/text in the annotated guide are reference annotations, never gameplay art.
- `geometry.json` contains the original sampled route, segment lengths, off-canvas spawn/end points, obstacles and placement constants; `manifest.json` records source hashes, dimensions, byte sizes and PNG SHA-256. Keep these with the art handoff.

## Route fidelity

The game samples its Catmull–Rom curve **12 times per knot interval**, then both enemy motion and placement use straight segments between those sampled points. Follow those exact exported points, not a newly smoothed spline, hand-drawn centerline, or line joining just the original knots. Direction arrows derive from the existing `onPath()` function. Route starts/ends can lie beyond the canvas; keep their positions in geometry even though PNGs clip at the world boundary. Entry/exit must meet the same visible boundary locations.

The painted path is rendered by the actual installed Phaser Canvas Graphics implementation using the same commands as `src/scenes/art.js`:

| Layer | Width, world units | Vertical offset |
| --- | ---: | ---: |
| Outer shoulder/shadow | 56 | +4 |
| Main outer trail | 51 | 0 |
| Inner trail | 43 | 0 |
| Highlight | 33 | 0 |

The transparent painted-path layer preserves the real renderer's strokes, joins, antialiasing and clipping. The cyan centerline and arrows in the annotated guide are added annotations. Do not mistake the shadow offset for an offset enemy route. Visually occupied path edges are **not** identical to the nominal placement corridor.

## Exact geometric tower-center rules

These guides represent an empty, unpaused battlefield with sufficient gold, an unlocked Archer, no placed towers, no defeat and capacity available. Green is terrain-based permission for a **tower center**, not the physical tower footprint, an economic promise, or permission for its entire sprite to fill the green area.

1. Center bounds are inclusive: `30 ≤ x ≤ 930`, `60 ≤ y ≤ 610`.
2. Minimum distance to the sampled route is `44 / 2 + 23 = 45` world units. A distance **less than 45** is rejected; equality is permitted.
3. For every collision obstacle, distance to its center must be at least `obstacle.r + 23`. Equality is permitted. The red disc shows `r`; its peach ring shows the padded limit.
4. Once towers exist, new centers less than **52** units from any existing tower are rejected. This dynamic restriction is not included in a static empty-map mask.

The binary mask samples each pixel center at `((column+0.5)/scale, (row+0.5)/scale)`. Thus the 1920 version samples quarter/three-quarter world coordinates and has more precise edge coverage; it is not simply a scaled 960 mask. The underlying continuous rules, including exact-equality boundaries, remain authoritative. No raster claims subpixel precision beyond its own sampling resolution.

Only Crystal Caverns and Ember Coast currently have `OBSTACLES` collision circles. Their exact coordinates/radii are in JSON. Woodland ponds, trees, scenery rocks, flowers, decorative crystals, flags and castle art are **not extra collision regions**. Do not turn a currently green placement area into visually impassable cliffs, deep water or a bridge without a separately approved geometry change. Existing decorative scenery may occupy otherwise valid areas; the guides deliberately do not invent collisions to match it.

## Art delivery and review

- Preserve route centers, entry/exit, occupied route edges, obstacle centers/radii, and all usable defensive zones. New terrain may add detail, lighting and biome identity but must preserve the geometry's meaning.
- Keep tower placement areas readable, relatively low contrast and free of large foreground occluders. Maintain clear silhouettes for enemies, tower foundations, ranges and projectiles.
- Match the bright, friendly fantasy style. Guides are engineering colors, not a finished map palette. Use original or licensed art; do not copy reference-game assets.
- Deliver a clean background at 960×640 and a master at 1920×1280, without guide grid, masks, labels or direction arrows. Preserve the guide package and provide the map ID and source hashes alongside artwork.
- Before integration, overlay the registered painted-path and center masks on the proposed art. Inspect route clipping, narrow bends, obstruction boundaries and representative legal placements on phones/tablets. Test actual movement and placement before requesting any production merge.
- Map changes require a separate gameplay/design approval. These reference files are under `docs/`, never loaded by the game or included in its public runtime assets.

## Regeneration and validation

Run `node scripts/export-map-art-guides.js` from the repository root with the pinned npm dependencies, Chromium and Python Pillow/NumPy installed. The generator reads `TRAILS` and invokes the real `Game.canPlace()` to produce validation samples; it extracts the four painted stroke recipes from the actual renderer and refuses unreviewed width/offset changes. It then uses Phaser to rasterize path layers and NumPy's same segment-projection formula for binary masks. All seven maps and both scales are checked against roughly 68,000 real validator samples.

Source files are read, not rewritten. Regenerate after an approved geometry change and review new provenance/checksums; do not silently substitute guides from another commit. The HTML gallery works locally without a server or network connection once this directory is downloaded. GitHub's Markdown index also previews all seven maps directly.
