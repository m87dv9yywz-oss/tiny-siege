# Tiny Siege Archer artwork — approved Tier 1 handoff

**Status:** The seven Tier 0/Tier 1 Archer variants are approved. No live-game integration is authorized by this document.

**Permanent ZIP:** [Tiny_Siege_Archer_Tier1_Codex_Ready.zip (Google Drive)](https://drive.google.com/file/d/1g_uMplT_X7FCw1TO0-GC7u3xt0bbENpp/view?usp=drivesdk)

**Drive folder:** `Tiny Siege / Artwork / Archer / Tier 1`. This file is currently owner-private; Codex may require access to Google Drive or a user-provided ZIP attachment. The images are **not** committed to this repository yet.

**ZIP SHA-256:** `8397a6caa5fec353bcf01575df38f0dc99364e1b1f3e54afff84e1118f8dc052`.

## All approved states
| Tier state | Upgrade configuration |
|---|---|
| `0-0-0` | Original |
| `1-0-0` | Reinforced Arrows |
| `0-1-0` | Quick Draw |
| `0-0-1` | Eagle Eye |
| `1-1-0` | Reinforced Arrows + Quick Draw |
| `1-0-1` | Reinforced Arrows + Eagle Eye |
| `0-1-1` | Quick Draw + Eagle Eye |

## Expected ZIP layout
- `states/archer_X-X-X.png`: 1254×1254 RGBA master art
- `exports/card_512/archer_X-X-X.png`: UI cards
- `exports/battlefield_256/archer_X-X-X.png`: Phaser battlefield
- `docs/ARCHER_ART_SPEC_V1.md`: art plan for 25 states
- `docs/ARCHER_STATES_V1.json`: upgrade state metadata
- `MANIFEST.json`: per-asset hashes and byte sizes
- `references/`: review-only sheets, not runtime textures

## Codex instructions
1. Do **not** scrape a concept/contact sheet as a game texture.
2. Download/unzip the real assets with owner authorization and check against hashes in `MANIFEST.json`.
3. Preserve exact state names. The upgrade path key order is Siege Ballista, Arrowstorm, Deadeye.
4. Use the same source artwork on cards and playing field, scaled from the provided exports.
5. Do not alter game balance, merge, or deploy based on this pointer file.
6. Tier 2 art remains **pending redesign and review**. Never substitute provisional concept sheets for finished transparent sprites.
