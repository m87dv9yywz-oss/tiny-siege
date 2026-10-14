# Tiny Siege V5 — Codex access, asset import and integration

## One canonical starting point

Repository: `m87dv9yywz-oss/tiny-siege`.

**Every new Codex session, cloud or local:**
1. Check out the default `main` branch and read `AGENTS.md`.
2. Read `docs/V5_MASTER_PLAN.md` (visual/UX product specification).
3. Read `docs/artwork/ARTWORK_INDEX.md` and `docs/artwork/ASSET_MANIFEST.json` (actual artwork names, SHA-256, status and upgrade keys).
4. Inspect the existing game and V4 documentation before code edits. Don't rewrite game rules based solely on art references.
5. Keep game code unchanged and leave production undeployed until the owner specifically requests implementation.

## Permanent binary artwork location

The original full-resolution images, exported sizes, and reference screenshots are preserved in the owner's **Google Drive**, under `Tiny Siege / Artwork` and `Tiny Siege / Project Hub`. A full portable package is maintained at `Tiny Siege / Project Hub / Tiny_Siege_V5_Canonical_Artwork_and_Plan_2026-10-14.zip`. The stored original assets and their checksums are indexed in `docs/artwork/ASSET_MANIFEST.json`.

**IMPORTANT LIMITATION:** the Drive folder is private. A Codex session without access to this Google account cannot download image bytes simply by reading this document; the owner can attach/download the single canonical ZIP and tell Codex to import it. Once binary assets are committed to the repository, all Codex checkouts will get them automatically. Never claim a pointer file means the PNG bytes are already in GitHub. The repository document remains readable independently of Drive.

## How to make all image files automatically available to every Codex (one-time import)

On a trusted machine or Codex environment with Drive ZIP access, download the canonical ZIP from Google Drive and extract it outside the repository. On a new feature branch, copy the nested `artwork/` folder from the extracted package into `public/assets/v5/`. Preserve filenames and relative subfolders; *do not* copy `references/` into public deployed assets. (If storing references, use `docs/artwork/references/` instead.)

```bash
# Example: run inside a local checkout of tiny-siege after extracting the canonical ZIP
# Source path shown below should be replaced with your actual unzipped directory.
git switch -c assets/v5-artwork-library
mkdir -p public/assets/v5
cp -R "/path/to/Tiny_Siege_Permanent_Art_and_Plan_2026-10-14/artwork/." public/assets/v5/
# In the project root, inspect image count before staging.
find public/assets/v5 -type f -name '*.png' | wc -l
git add public/assets/v5
git commit -m "assets: add approved Tiny Siege V5 artwork source and exports"
git push -u origin assets/v5-artwork-library
```

Open and merge a review PR into `main` to make image bytes accessible in every local/cloud Codex checkout. **This setup step has not been completed yet** until the repository actually contains the binary images. If long-term Git size is a concern, migrate approved masters to a GitHub release/LFS with a guaranteed authenticated fetch; runtime exports still need stable accessible hosting.

## Canonical Archer mapping

Upgrade state key digits: Siege Ballista, Arrowstorm, Deadeye.

`archer_2-1-0.png` = Armor-Piercing Bolts + Quick Draw; `archer_0-2-1.png` = Multishot + Eagle Eye. Every approved state has three exports: `states/` (1254 master), `exports/card_512/`, and `exports/battlefield_256/`. Use the same art for cards and battlefield and preserve the base visual alignment.

## Phased implementation contract

- First prototype Archer states in Phaser; do not merge V5 UI/gameplay without user inspection.
- Target iPhone landscape viewport use and opposite-side selected-tower upgrades.
- Child-friendly illustrated menus, readable large card art and minimal text.
- Keep Phaser 4/Vite and all current game mechanics, campaign modes, Firebase boundaries and history intact.
- Avoid expensive/paid services, new Firebase billing and unnecessary infrastructure.
- Treat the V5 mockup screenshots as visual direction, never a copy/paste runtime texture.
- Preserve source-art transparency and confirm card/battlefield readability on actual device sizes.

## Saving more artwork going forward

Every new approved image must be saved to the **persistent project source** and indexed there, not only produced as an ephemeral conversation attachment. Filename by game object, path, state, and usage. Update `ASSET_MANIFEST.json` and `ARTWORK_INDEX.md`, including status of pending assets, and sync to the GitHub artifact library once it's enabled. Ask before overwriting previous approved images.
