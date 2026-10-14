# Tiny Siege v4 — Hero character artwork and mobile UX references

These are **original generated concept sheets** supplied by the game owner for Codex Cloud to use in Tiny Siege v4. This is a reference-only branch: **no game code or deployed assets were changed**.

## Hero artwork — original full-resolution concept sheets

| Character | File | Role |
| --- | --- | --- |
| Fire Dragon | [fire-dragon.png](./heroes/fire-dragon.png) | Dragonfire cone/burst; boosts Fire towers |
| Thunder T-Rex | [thunder-t-rex.png](./heroes/thunder-t-rex.png) | Thunder Stomp; boosts Cannons |
| Tiger Scout | [tiger-scout.png](./heroes/tiger-scout.png) | Pounce Rush; boosts Archers |
| Frost Owl | [frost-owl.png](./heroes/frost-owl.png) | Blizzard Gaze; slowing/scouting |
| Lightning Fox | [lightning-fox.png](./heroes/lightning-fox.png) | Chain Spark; storm attacks |
| Guardian Bear | [guardian-bear.png](./heroes/guardian-bear.png) | Protective Roar; allied defense |

All six are visual reference designs; **Fire Dragon, Thunder T-Rex, and Tiger Scout are the three required initial playable heroes** documented in [Issue #6](https://github.com/m87dv9yywz-oss/tiny-siege/issues/6). The Owl, Fox and Bear are additional proposed unlockable heroes or future content, not authorization to replace the first three or to claim they are already implemented.

## Use in game menus and gameplay

**User request:** "Would be nice to see the nice pictures in the menus to see and mess around with. Also keeping the actual characters close to that is cool if possible."

- Create an interactive **Hero Collection / hero selection** menu with beautiful, clear, large hero illustrations based on these sheets. Hero cards can be tapped for **large character artwork**, hero lore/abilities, support aura details, preview animations, unlock progress and selection (one hero per battle).
- Support kid-friendly inspect interactions; artwork should feel like collectible storybook fantasy characters rather than generic icons. Keep art visible at generous size, especially on iPad / desktop; adapt for portrait phones.
- **Keep the actual playable heroes visually close** to the references: preserve species, face/eyes, silhouette, palette, distinctive cape/armor/medallion details, and magical effect colors (Dragon red/gold, Rex green/blue/gold, Tiger orange/black/red; Owl white/ice blue; Fox orange/purple/gold; Bear brown/teal).
- Convert artwork into **mobile-efficient portraits, icons and gameplay sprites/illustrations**. Crop/clean original concept sheets appropriately; do not shrink an entire dense concept poster into a tiny combat sprite or force multi-megabyte full-resolution sheets into every battlefield load.
- Re-create or adapt artwork for character movement/attacks as needed. Avoid pretending a static poster itself provides animated sprites or interchangeable transparent layers; make simplified in-game art consistent with the originals.
- Any logos/words printed inside generated reference artwork may differ from the actual game UI; use actual Tiny Siege branding and programmatic UI text rather than treating baked-in text as live interface controls.
- Do not implement extra heroes as fully playable unless chosen as part of the v4 scope; a visually rich collection with locked/future placeholders can show additional concept characters without misleading players about availability.
- Avoid copying other games' protected artwork. These six are original generated concepts.

## Phone screenshots — actual product bugs

- [landscape-clipped.jpeg](./mobile/landscape-clipped.jpeg): landscape doesn't allocate enough accessible area to the entire battlefield. Respect real Safari/browser and home-screen PWA chrome/safe areas; responsive HUD/shop placements; keep canvas hit coordinates accurate.
- [portrait-space.jpeg](./mobile/portrait-space.jpeg): excessive unused vertical space in portrait. Reclaim space for playable board and controls.
- [tap-upgrades.jpeg](./mobile/tap-upgrades.jpeg): tapping a placed tower opens "Archer / Upgrades / X" toolbar, requiring another tap. **One tap should open the full upgrade panel from the left** immediately; tapping another tower switches panel, tapping outside dismisses.

Also see [Issue #9](https://github.com/m87dv9yywz-oss/tiny-siege/issues/9). Test real orientation changes, portrait and landscape. Preserve main gameplay UI and existing profiles.

## v4 game-design invariants

- Exactly one hero per battle and movable heroes with active abilities and passive nearby tower buffs.
- Fixed paired modes: Easy = 20 waves, Medium = 40 waves, Hard = 100 waves. **No independent duration and difficulty selectors**.
- Windcaller and Runesmith towers with branching paths; two new maps Crystal Caverns and Ember Coast with **genuinely different paths**.
- Kingdom Relics, resume long battles, scalable free-tier Firebase saves with lossless migration.
- The source artwork lives under `docs/reference/` so it **does not ship as unoptimized runtime assets automatically**.
