# Tiny Siege v4: Hero & Mobile Visual References

These images were requested by the game owner for the **Codex Cloud v4 implementation**. They are artwork and layout references, not production-optimized in-game assets. Keep them outside the runtime bundle until selectively converted, cropped and optimized.

## Animal hero visual concepts

| Hero | Concept sheet | v4 status |
|---|---|---|
| Fire Dragon | [View](heroes/fire-dragon.png) | Required playable hero |
| Thunder T-Rex | [View](heroes/thunder-t-rex.png) | Required playable hero |
| Tiger Scout | [View](heroes/tiger-scout.png) | Required playable hero |
| Frost Owl | [View](heroes/frost-owl.png) | Additional hero concept |
| Lightning Fox | [View](heroes/lightning-fox.png) | Additional hero concept |
| Guardian Bear | [View](heroes/guardian-bear.png) | Additional hero concept |

Full hero requirements: [Issue #6](https://github.com/m87dv9yywz-oss/tiny-siege/issues/6).

### Owner's requested implementation

- **Use the illustrated characters in the actual menus.** Build a rich, browsable hero gallery/selection collection using large, attractive portraits based on these concept sheets. Players should be able to open a hero and view its appearance, attacks, buffs, active ability, unlock/progression and playable status.
- **Stay visually faithful to the character concepts during gameplay.** Keep recognizable silhouettes, facial features, body proportions, palettes and distinctive accessories. The Fire Dragon is red/orange with gold horns, flame crest and wings; T-Rex is green/gold with blue royal armor; Tiger is orange/black with a red ranger scarf; Frost Owl is icy blue-white and crystal-feathered; Lightning Fox is orange/cream with purple-gold storm effects; Guardian Bear is brown with teal leaf/guardian armor.
- Create production-optimized menu portraits, thumbnails and gameplay sprites/animations from these references. The concept posters alone are too large/complex for direct use as tiny on-board characters. Preserve the same character identity in compact, readable sprites.
- Required initial playable trio: Dragon, T-Rex and Tiger, with one chosen per battle, automatic attacks, repositioning, active abilities and nearby tower buffs. Additional hero art can appear in a clearly designated preview/locked collection where appropriate, but **do not suggest heroes are playable before they actually work.**
- Keep bright, appealing fantasy visuals, original characters, kid-friendly expressions and responsive desktop/mobile menus. Show real art rather than emoji placeholders if possible.

## iPhone mobile UI screenshots

- [Landscape screen](mobile/iphone-landscape-clipping.jpg): canvas/cropping and layout wrong when rotating; correct browser chrome, safe areas, viewport scaling and accurate touch coordinates.
- [Portrait layout](mobile/iphone-portrait-empty-space.jpg): too much blank vertical space around the board, shrinking the play area unnecessarily.
- Owner's third supplied screenshot `IMG_3241.jpeg` (not stored here): tapping an existing Archer shows floating **Archer / Upgrades / X** actions. Eliminate this intermediate toolbar and **open the full LEFT-anchored upgrade panel immediately on the first tower tap**, preserving the battlefield and a clear range indicator; change selection in one tap.

Also see [Issue #9](https://github.com/m87dv9yywz-oss/tiny-siege/issues/9) and user-provided screenshots in conversation.

## v4 design constraints

- **Easy 20, Medium 40, Hard 100 waves**, fixed together; do **not** expose separate length and difficulty controls.
- Two additional towers: Windcaller and Runesmith, with three paths/tiers.
- Two new adventures: Crystal Caverns and Ember Coast. Route geometries must actually differ from each other and existing maps.
- Kingdom Relics, resumable battles and expandable cloud saves must preserve existing progression and profiles.
- Stay on existing Firebase Spark tier, no paid features.
- This reference branch must **not be independently merged or published as a game release**. The v4 implementation branch should import and transform assets as appropriate, then validate UX/performance first.
