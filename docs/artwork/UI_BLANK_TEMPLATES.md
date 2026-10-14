# Tiny Siege — reusable blank UI templates v1

**Permanent asset folder:** [Google Drive: Tiny Siege / Artwork / UI Templates](https://drive.google.com/drive/folders/1126YA2-XuNPNNHt4hsQ0-s3WIC9om9hV)

The folder contains **15 original transparent PNGs**, individually organized into subfolders, plus:
- `Tiny_Siege_UI_Blank_Templates_v1.zip` — full Codex-ready package
- `README_FOR_CODEX.md` — exact filenames, screen use, and implementation cautions
- `MANIFEST.json` — intended role, visual state, dimensions, and SHA-256 per PNG
- `UI_Asset_Preview.png` — reference sheet only, **not** a runtime asset

## Individual template files and purposes
| File | Purpose |
|---|---|
| `cards/hero_card_unselected.png` | Neutral hero selection card frame |
| `cards/hero_card_selected.png` | Highlighted hero selection card frame |
| `cards/tower_card_unselected.png` | Neutral tower shop card frame |
| `cards/tower_card_selected.png` | Highlighted tower shop card frame |
| `badges/cost_badge_crown.png` | Cost/price badge |
| `badges/level_badge_emerald.png` | Level number badge |
| `bars/xp_bar_frame.png` | Hero XP/progress bar frame |
| `buttons/primary_button_selected_green.png` | Primary action button background |
| `buttons/secondary_button_neutral.png` | Secondary action button background |
| `tabs/tab_selected_green.png` | Active navigation tab background |
| `tabs/tab_unselected_cream.png` | Inactive navigation tab background |
| `panels/section_header_banner.png` | Section/title banner background |
| `panels/stat_chip_hud_bar.png` | Small HUD information chip background |
| `slots/upgrade_panel_triple.png` | Three-slot upgrade selection frame |
| `slots/icon_socket_round.png` | Round icon / ability socket frame |

## Integration guidelines
- These files have **no fixed text**. Overlay runtime text, upgrade values and character/tower sprites in Phaser/HTML UI.
- Keep buttons and tabs interactive in actual DOM/game code; an image alone is not an interactive button.
- When designing for mobile, **do not force giant ornamental frames into narrow interfaces**; verify readability.
- These are reusable blank components, not the Archer tower's upgrade states.
- Original source PNGs have alpha transparency; no adjustments to their pixels were made when saving.
- Current Drive folder is owner-private; access or attachment is needed before a separate Codex environment can read bytes.
- Do not deploy/merge any part of this reference solely by virtue of this file.
