# Butterfly expression QA — 2026-09-17

## Scope

Added butterfly stages 01–08, ten original-referenced expressions each: 80 new portraits, 1,120 total across 14 lines. This is one batch, not completion of all character lines. PR #278 remains Draft and must not be merged.

## Artwork and preservation

- All eight original sprites were individually inspected with a real-coordinate grid; anchors are recorded in `tools/expression-face-anchors.json`.
- 80 separate original-reference imagegen calls; 80 unique sources. Final manifest: `butterfly-expressions-20260917-manifest.json` (`complete: true`, 80/80 records).
- 80 PNGs verified at 128×128 with alpha and exact original drawing bounds; all 240 SHA-256 values (original/source/final) matched actual files.
- Stage 06 targets the left butterfly; the empty chrysalis on the right has no added face.
- All 80 marked composites visually inspected. Generated artwork has small non-face shape/detail variation; it is not pixel-identical outside the face.
- Only butterfly placements were generated. No placement algorithm change was needed. Full checker: 1,120 marks, 672 sweat envelopes, zero issues.
- Branches and wings can push marks above the head or sweat outward. Zero detected overlap is distinct from ideal subjective placement. Gallery images are static PNG/SVG/CSS compositions, with approximate sweat, not device captures.
- Against local baseline `1452200bdb9242ef05d0e3555206cb2d8c1de7bc` / tree `da4bc83a05e9313328ed0c21c44dc25290c865d7`: all 1,040 prior PNGs, routes and SVG accents, all 104 placement entries (including prior 81 user adjustments), all 248 normal sprites, and 24 unaffected top-level runtime JavaScript files preserved. `pet-expression.css` unchanged; gameplay, romance conditions and save format untouched.
- Final code cache token: `pet-expression.js?v=20260917-4f5d97ee`.

## Verification commands

All use `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES"` where sharp is needed.

- `node /workspace/scratch/8774163cb668/check-butterfly-art.cjs`: PASS, 80 portraits / 240 hashes.
- `node /workspace/scratch/8774163cb668/check-butterfly-preservation.cjs`: PASS, 1,040 prior PNGs/routes/accents and 104 placements.
- `node tools/check-expression-placement.cjs`: PASS, 1,120 marks / 672 sweat envelopes / 0 issues.
- `node /workspace/scratch/8774163cb668/check-butterfly-site.cjs`: PASS, 14 lines / 1,120 records / 80 current-batch records, eight sheets, old 1,040 PNGs preserved.
- Focused implementation tests: 439 passed. Full new-version `npm test`: 1,211 passed, zero failed/cancelled/skipped/todo; 138,557 ms. Log: `/workspace/scratch/8774163cb668/butterfly-npm-test.log`. After correcting only the cache-token format with `npm run bump`, asset-version tests reran: 2/2 passed.
- Independent final spec/code review: PASS / PASS, no remaining blocking finding. See `butterfly-expressions-20260917-review.md`.

## Delivery

Same owner-private Site `appgprj_6aa908e9357c8191abb0f486be58697c` prepared with image identity `bf-08021b72`, default butterfly, current-batch filter containing 80 records. Tap/select, memo and copy implementation preserved and independently reviewed (source/state evaluation, not live device clicks). Published successfully as owner-private version 51. Source commit: `8c3382f2cc32388e78a3712a2f9845b7c2ebc52a`. Version ID: `appgprj_6aa908e9357c8191abb0f486be58697c~appgver_9fa3515126b081918ba143322b94179c`. Deployment ID: `appgdep_6aabc9923e2c8191adc686cb17a1d9bf`. URL: https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/mark-review/ . Archive gzip and required files checked after packaging completed.

GitHub save uses the existing feature branch and remote base_tree, preserving 241 historical skip-worktree entries and requiring remote/staged-local tree equality. Final saved SHA/tree and post-save Draft/main/CI checks are recorded in PR #278 after the save. Latest pre-save main observed: `5d39eea915d09be3900d92fa879a9e9f1ecf6091`; feature HEAD remained `909262e070308b065fdf8898d6807535ae944716`, Draft/open/unmerged with preexisting conflicts. Do not interpret GitHub CI with no runs and pending status as success.
