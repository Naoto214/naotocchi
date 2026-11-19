# V13 formal-game card design candidate

Presentation-only port of approved V11 card internals (V10 renderer/fit and V8 face/labels/styles), self-contained within the formal game. No comparison routes, candidate catalog, name proposals, or extra seven cards are imported. The shared `cardMarkup` supplies the formal projected card's text/stats, approved colors/symbols, formal married effects and existing art map to the renderer. Existing controls, commands, host geometry, orientation, clock and persistence are unchanged.

Normal faces have one-line names, large art, main-card auxiliary names and numeric stats; effects appear inside detail faces. Eggs share the card frame with the V11 printed effect in detail only. The duplicate external egg explanation is removed in game detail and collection detail. Fist/brain SVG materials remain in the existing module but are omitted within card stats.

The egg image is byte-copied from the approved V8 `assets/egg-art.png`. Starfish stages 1–3 use byte-preserved originals from commit `9b3f730e`, recorded in `../art-pilot/approved-starfish-20261119/manifest.json`. Only these three art mappings change. Delivery uses the existing sharp profiles (384/86 and 1152/90, effort 5); the delivery builder applies the approved source overrides. Stages 4–8, other 449 mappings, main-game sprites and original historical art are unchanged.

## Verification

`node --test prototypes/card-game/tests/card-design-v13.test.mjs prototypes/card-game/tests/art-cpu-integration.test.mjs` passes seven tests: all 452 normal/detail render outputs; formal text and rarity; hidden identity; egg copy; exact original/delivery hashes; frozen catalog/colors/symbols; unchanged other art mappings; CPU orientation and hidden-state restore.

Existing `collection.test.mjs` passes five tests. Existing presentation suites still contain assertions for the previous DOM (`card-title`, `card-copy`, `card-rarity`, `botanical`), normal-face effect text, two-line names, and the old long external egg explanation. These expectations intentionally conflict with this candidate and have not been weakened or rewritten. The broad card-game run also reports provenance/design-data guards (not yet classified against baseline); do not treat that suite as passing.

Static Pages reference traversal reports no unpublished references. The exact allowlist includes eight runtime modules/styles, the egg image, and six new delivery WebPs; approved originals/tests/this README remain repository-only. Full package assembly must hydrate the existing sparse binary assets. No browser/WebKit/iPhone visual verification was possible in this environment; layout/overflow and glyph centering need review in the private candidate preview.
