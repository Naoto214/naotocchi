# World / guardian polish v6 — 2026-10-21

## Baseline and scope

PR #412 / feat/naopoyo-rescue-20261021. Baseline HEAD `6e260ff4e8c6f4810127ba074429fd9299bb0b72`, tree `3a6657552e39fdbb5009a0f002c6ba893f98569a`. Start remote main `79d59aece7c91d52387345da737354927df7dc8f`. PR remained Draft/Open. Initial CI: Pages runtime package success; Runtime smoke/Home layout/World visual quality in progress. No merge, no production Pages update.

Only prototypes/naopoyo-rescue changes. Engine, stage layout, saved solutions, input, store, original character assets, old games and main are unchanged.

## Worlds

- 01–04 prison: blue-grey flagstones, barred wall windows, lanterns, warm exit light.
- 05–08 cavern: teal stone floor, water reflections, moss, rock fractures and luminous minerals on obstacles.
- 09–12 castle: old stone floor, masonry columns, arched wall backdrop, lanterns.
- Every stage has a themed backdrop outside the playable grid. Background decorations cannot be mistaken for new collision cells. Raised blocks only occur at existing walls; all floor cells remain legible.
- Presentation mapping in themes.mjs, backdrop styles in world.css. No 3D engine or game-state theme fields.

## Owl assets and behavior

Normal: `assets/characters/companions/owl.png` (official ものしりふくろう, character-world-master.v1.js).
Smile: `assets/characters/relationship/owl/positive.png` (official relationship-expression.js SUPPORTED companion owl / positive).
`lonely.png` was inspected but rejected for refusal: its raised inner brows look sad. The companion pool has normal/positive/lonely; it does not have a sulky variant.
New mild sulky trial: `prototypes/naopoyo-rescue/assets/owl-sulky-v1.png`, built-in Imagegen edit of the official normal reference, isolated from official originals. Full provenance, source/output hashes and prompt are in evidence/world-v6/owl-assets.json. The large generated source is rendered with alpha crop bounds, preserving transparency. It is a prototype expression, not an overwrite or replacement of the official pool.

Priority: active adjacent actor (Chebyshev distance <=1; all 8 directions), otherwise gate occupant, otherwise neutral. Idle bystanders do not compete. Current subject conditions are reevaluated every frame; no stale event-count smile is retained. Smile nod and sulky head shake are short, display-only, reduced-motion aware, and never block movement. Releasing/leaving returns to neutral unless a character remains in the passage.

Split-child regression: Stage07/10 can leave a level1 child inside a >=2 gate. That child may leave under existing engine rules. The passage stays physically open while occupied; its occupant receives the permissive expression. A different invalid active neighbour still gets a sulky reaction while the occupant finishes leaving. Once vacant, mismatch closes the gate. Entry rules are unchanged.

## Gate and labels

Stone jambs and a deep central arch with sliding iron leaves; owl on a separate side pedestal, redrawn in foreground when occupied. The owl remains visible during passage. Star exits retain their design.

Conditions form one centered group. Cropped icon aspect ratio determines actual width. Glyph ink bounds, advance and ascent/descent determine text placement. Measurement and text rendering use a real 42px cell reference, scaled into board units: measuring fractional-pixel fonts directly was found to quantize browser bounds. No white label background or forced text-width compression. Numeric and ALL conditions share the implementation.

## Drag comparison

A stays default, unchanged: 1.4x at logical cell with bright outline. B is a static, same-scale 10px-up display comparison in world-qa.html, including an optional 36px simulated fingertip. B exposes more face but can look like the adjacent row and can cross the top boundary. No convincing real-device advantage established; no B gameplay switch or replacement introduced. Real finger comparison remains unverified.

## Verification

- Baseline 146/146 scoped tests passed after required asset/manifest sparse paths were checked out.
- Final `node --test prototypes/naopoyo-rescue/tests/*.test.mjs`: **152 passed, 0 failed**, including saved-solution replay for all 12 levels, 8-direction/species/level guardian-condition combinations, fast subject switching, state immutability, measured layout, and split-child cases.
- All 32 official playable PNG SHA256 checks match prior manifest; official owl assets unchanged in Git.
- Browser Chrome: 390px iframe, stage10 merge -> gate -> split -> all rescued in 3 drags; Undo restores one remaining actor / 2 drags; reload preserves that state; retry resets.
- 07/08/10/12 inspected at phone width; condition/gate/exit samples at 42px. All 12 boards in shared-renderer comparison. Normal/positive/sulky rendered; interactive comparison confirmed smile/open, sulky/closed, and neutral return.
- Independent read-only code review confirmed asset paths and protection of engine/stages/store/input. One important occupied-gate edge case was reproduced and fixed with two regression tests.
- Full repository `npm test` attempted but cannot start because sparse checkout omits tests/social-expression-integration-test.cjs, relationship-free-life-test.cjs and relationship-free-life-runtime-test.cjs. This is NOT a full-repository passing result.
- Browser screenshots and scoped test output are under evidence/world-v6. Browser verification is Chrome, not iPhone Safari.

## Remaining before formal release

Owner iPhone Safari QA: actual fingertip visibility, owl facial readability, 07/08/10/12 label alignment, fast diagonals and board edges, rotation/background/restore, frame rate and battery impact. Review new sulky art at actual size. Existing legacy-save layout and image-load-error notice limitations from v5 remain; no unrelated rule work performed. No main merge or production release authorized.
