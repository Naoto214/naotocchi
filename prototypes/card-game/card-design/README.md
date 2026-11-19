# V13 formal-game card design candidate

Presentation-only port of approved V11 card internals (V10 renderer/fit and V8 face/labels/styles), self-contained within the formal game. No comparison routes, candidate catalog, name proposals, or extra seven cards are imported. The shared `cardMarkup` supplies the formal projected card's text/stats, approved colors/symbols, formal married effects and existing art map to the renderer. Existing controls, commands, host geometry, orientation, clock and persistence are unchanged.

Normal faces have one-line names, large art, main-card auxiliary names and numeric stats; effects appear inside detail faces. Eggs share the card frame with the V11 printed effect in detail only. The duplicate external egg explanation is removed in game detail and collection detail. Fist/brain SVG materials remain in the existing module but are omitted within card stats.

The egg image is byte-copied from the approved V8 `assets/egg-art.png`. Starfish stages 1–3 use byte-preserved originals from commit `9b3f730e`, recorded in `../art-pilot/approved-starfish-20261119/manifest.json`. Only these three art mappings change. Delivery uses the existing sharp profiles (384/86 and 1152/90, effort 5); the delivery builder applies the approved source overrides. Stages 4–8, other 449 mappings, main-game sprites and original historical art are unchanged.

## Verification

`node --test prototypes/card-game/tests/card-design-v13.test.mjs prototypes/card-game/tests/art-cpu-integration.test.mjs` passes eight tests: all 452 normal/detail render outputs; formal text and rarity; hidden identity; egg copy; exact original/delivery hashes; frozen catalog/colors/symbols; unchanged other art mappings; CPU orientation and hidden-state restore.

Existing presentation tests have been updated to the authorized single-line names, new face selectors, normal/detail effect separation and printed egg text. Semantic protections remain: all 452 exact names/effects, colors/marks, distinct art hashes, cost values, escaping, rarity-only changes, hidden identity, old save effects and CPU restore. A regression assertion ensures inherited outer host pseudo frames are suppressed while the approved inner frame remains. The existing image-error fallback test passes.

The initial broad run was 641/658: fifteen old presentation expectations (including a subsequently corrected egg image class), plus two sparse asset failures. Restoring the missing clock provenance images and documentation gzip/QA files from the baseline makes the unchanged catalog (4/4) and clock (10/10) suites pass. No frozen provenance or home test guards were changed.

Static Pages reference traversal reports no unpublished references. The exact allowlist includes eight runtime modules/styles, the egg image, and six new delivery WebPs; approved originals/tests/this README remain repository-only. Full package assembly must hydrate the existing sparse binary assets. A focused rerun of the thirteen affected suites passed 72/72 tests. The final full command `node --test prototypes/card-game/tests/*.test.mjs` passed 664/664 with no failures, skips or cancellations. The isolated baseline comparison passed all 65 non-catalog tests and, after its fixture dependencies were hydrated, catalog 4/4; the initial failures were classified against the original tests rather than waived. No browser/WebKit/iPhone visual verification was possible in this environment; layout/overflow and glyph centering need review in the private candidate preview.

### VERSION 14 typography (2026-11-19)

Before: `76df0f1581aa4fb5f6e443e1dbfae7beadaedce9` (retained in history).
Normal cards use 10.5cqw/700 cost digits (circle unchanged), 8.5cqw one-line
name maximum with existing fit-to-width, and 4.6cqw/700 classification text.
Normal stats remain 16cqw/600. Narrow 40–70px cards gain stat-strip room and
fractional inset strokes without shrinking digits. Detail stats use 11.5cqw/500;
detail cost/name/classification remain unchanged. Auxiliary name placement follows
the actual title position, instead of assuming one shared top offset.

Chromium 156 real rendering: 320/375/390/430 x 844 portrait and 844 x each width
landscape; all 452 cards plus representative costs 0–8 and stats 1/5/10.
Touch-emulated collection opening, three columns, detail, flip, hand selection;
deck catalog and zoom also checked at all four portrait widths. 33 focused Node
tests passed. Browser screenshots/measurements and exact before CSS/fit modules
are retained only in the owner-private Site, not in the production Pages files:
https://naotocchi-card-integration-v13-20261119.kerzion214.chatgpt.site/v14-qa/report.html

WebKit is unavailable (missing executable); physical iPhone Safari is untested.
The existing BGM byte-protection failure for the earlier index.html integration
is not bypassed. No names, IDs, values, images, host UI, or gameplay changed.

### VERSION 15 cost digits (2026-11-19)

Baseline V14: `ae522ea99dcbc5396537024623d1d0b3d11243c1`.
Only cost typography changes: normal 10.5 → 11.7cqw (+11.43%), detail
8.5 → 9.1cqw (+7.06%); weights remain 700/600. Circle geometry and all
power/wisdom styles stay unchanged. Cost-only ink fitting preserves inner
padding at tiny sizes and fits future two-digit values; it never fits stats.
The indicated enlargement is the base size, with circle-fit limits where needed.

Chromium 156: costs 0–99 in normal/detail, 320/375/390/430 × 844 and the
corresponding landscape viewports, plus 32/40/48/64/80px card widths. No
measured cost overflow/centering failures. Before/after circle dimensions and
stat glyph sizes/weights match in all eight viewport conditions. 19 focused
Node tests pass. Physical iPhone Safari/WebKit remain unverified.

Owner-private before/after screenshots, candidate magnifications, measurements:
https://naotocchi-card-integration-v13-20261119.kerzion214.chatgpt.site/v15-qa/report.html
V14 comparison styling/fit modules are pinned to the baseline in that Site;
its historical screenshot evidence is retained. No QA artifacts enter Pages.
