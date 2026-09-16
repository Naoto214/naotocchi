# Cat and dog mark review — 2026-09-16

## Scope and findings

User authorized an independent review of all8 cat and8 dog stages, ten states each, to reduce individual live-page checks. Starting remote PR HEAD: d4dc384f01c0e2b4f25c0681b07425252bffe2e4. Both GitHub workflows successful; fetched main3f4bfda0b8c0d30098ebb68c4313abd370a8576a. Local baseline tree191f795503a30c6da4a5c4e9cfa77b0459e5a257 matches remote.

Reviewed all160 production PNGs with their marks before and after changes. Clouds, critical arrows and Zzz crowded the forehead/right ear particularly on dogs; some small cat stages also needed clearance. Portrait expression artwork remains the previously approved set; this task adjusts composition, not artwork or care semantics.

- Added per-state deltas in104px SVG coordinates, composed with the existing stage anchor.83 marks across14 stages adjusted; cat03 andcat06 need no changes under the face-clearance criterion.
- Preserved every silver and orange mark exactly, including recent baby-dog silver placement, to retain user-approved distance preferences. Small ear contact in those approved marks is deliberately retained; eyes/mouth remain visible.
- Adjusted large clouds/arrows/Zzz and selected food/fatigue/joy/sick marks upward and slightly outward. The delta table in pet-expression.js is the authoritative numeric record.
- All160 image paths/bytes, state colors/outlines, normal portraits, reactions, game parameters, companions and saved state are unchanged.

## Comparison artifacts

`tools/expression-contact-sheet.cjs` writes one SVG sheet with all10 states:

```sh
node tools/expression-contact-sheet.cjs cat 01 あかちゃんねこ /tmp/cat01.svg
```

It embeds the actual routed PNG and accent markup and reads production CSS. It preserves the painted-floor shift from cast bounds at a104px logical canvas, displayed2x. A Japanese font and an SVG rasterizer (such as sharp) are needed for PNG export. Delivered16 stage PNGs plus four40-cell overview PNGs in a ZIP.

These are static composites, not browser/device captures. Background, viewport-dependent layout and animation are omitted; illness sweat is an explicitly labeled stationary approximation. No claim of iPhone acceptance or full companion/equipment visual clearance. User checks any final device-specific differences.

## Validation

- Focused resolver/assets/runtime:83 passed,0 failed.
- Full suite: npm test756 passed,0 failed/cancelled/skipped, exit0.
- All160 final composites visually reviewed; no eye/mouth obstruction from the adjusted marks.
- Runtime cache token updated only for pet-expression.js.
- All160 routed image paths unchanged, all32 silver/orange SVG strings byte-identical, and every generated SVG group balanced; changed-mark count83 across14 stages confirmed.
- git diff --check succeeded.
- PR remains Draft, no main merge.
