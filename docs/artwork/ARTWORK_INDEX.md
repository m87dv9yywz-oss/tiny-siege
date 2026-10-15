# Tiny Siege — Artwork Index (2026-10-14)

## Read me first

- V5 project plan: `docs/V5_MASTER_PLAN.md`
- Codex procedure: `docs/CODEX_ACCESS_AND_INTEGRATION.md`
- Exact filenames / checksums / dimensions: `docs/artwork/ASSET_MANIFEST.json`
- Production game source lives in `m87dv9yywz-oss/tiny-siege` (GitHub).
- **Image assets are not automatically deployed**: only integrate when asked; no changed gameplay mechanics/balance or live-site deployment.
- The same `archer_A-B-C.png` artwork must be used on battlefield and cards; use provided 256 and 512 exports, not different redraws.

## Archer upgrade state key

Numbers are ordered: **Siege Ballista – Arrowstorm – Deadeye**. The game permits Tier 3 on one path and Tier 1 on a second; at most two paths.

| Status | Archer combinations |
|---|---|
| **16 ready** | `0-0-0`, `1-0-0`, `0-1-0`, `0-0-1`, `1-1-0`, `1-0-1`, `0-1-1`, `2-0-0`, `0-2-0`, `0-0-2`, `2-1-0`, `2-0-1`, `1-2-0`, `0-2-1`, `1-0-2`, `0-1-2` |
| **9 missing (Tier 3)** | `3-0-0`, `0-3-0`, `0-0-3`, `3-1-0`, `3-0-1`, `1-3-0`, `0-3-1`, `1-0-3`, `0-1-3` |

All 16 states have corresponding `states/` 1254×1254 master PNGs, `exports/card_512/` and `exports/battlefield_256/` versions.

## File groups

- `artwork/towers/archer/states/`: source masters for Archer upgrade appearances.
- `artwork/towers/archer/exports/card_512/`: UI card inserts.
- `artwork/towers/archer/exports/battlefield_256/`: in-game map sprites.
- `artwork/ui/`: **15 blank** UI components: card frames, buttons, tabs, badges, progress bar, banners, and slots.
- `artwork/heroes/`: Ember, Rex and Stripe, two forms each (portraits and static battlefield illustrations).
- `artwork/towers/shop_icons/`: initial Archer, Cannon and Frost shop illustrations (not corresponding to all evolution states).
- `references/mockups/`: V5 appearance concepts; **never** load these as playable sprites.
- `references/screenshots/`: old game/Bloons UX references; **never** reproduce Bloons IP.

## Important caveats

- Master exports from earlier generations should be judged on a real iPhone-size preview; passing PNG validation does not prove ideal in-game rendering.
- Tier 2 and paired states are saved as previously user-accepted illustrations, but have **not** passed the integrated Phaser preview or user-device size test.
- Do not invent the missing nine Tier 3 sprites. Separate from mainline code; no automatic merge.
- For all images: alpha-channel/PNG verified where metadata says transparent, but Codex should check alpha and edge artifacts during implementation.

## Future tasks

1. Finish nine Tier 3 Archer images one at a time, matching base, lighting, perspective.
2. Verify all 25 states in actual tower menu and battlefield at phone size.
3. Improve hero sprite animation and fill missing five tower card artworks.
4. Complete remaining tower upgrade states after Archer workflow is approved.
