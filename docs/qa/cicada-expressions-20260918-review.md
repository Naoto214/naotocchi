# Independent final cicada assembly review — 2026-09-18

## Verdict at review time

**Production integration/specification: PASS. Code quality: APPROVE. All eighty sprite/mark compositions and corrected gallery sheets: PASS. No blocking findings remain.**

No production code or sprite defect was found. The gallery font issue was immediately reported to root and has been corrected and independently re-reviewed. The initial full npm run had one Quick-mode failure, its unchanged targeted recheck passed, and the full rerun passed all 1,337 tests; publication and final remote saving/verification remain pending. This review does not establish a delivered Site revision or GitHub state. PR 278 must remain Draft and main must not be merged.

## Gallery font correction verified

The first review found missing Japanese glyphs in the gallery raster labels. Root regenerated the sheets using the repository's existing M PLUS Rounded 1c font via a scratch Fontconfig setup, without production code changes. This reviewer reopened all eight final files `cicada-gallery/cicada01.png` through `cicada08.png`, inspecting all eighty cells again. All canonical Japanese headings, expression labels, and footer text now render correctly; no missing-glyph boxes remain. Art and mark compositions still pass. The gallery blocker is cleared.

## Scope and independently verified evidence

Reviewed against baseline `3708ecace51fb05b5c57296fca27fe3de387a354`, including the original nine-file integration patch, current production placement/anchor/cache diff, canonical stage master, tests, planning/checkpoint documents, all eighty marked composites, and all eight originals in `cicada-anchor-grid.png`.

- `node /workspace/scratch/daf8d241531b/check-cicada-art.cjs`: PASS, eighty distinct stage/state records with unique generated source paths, all 240 original/source/final SHA-256 hashes, complete manifest, 128×128 alpha PNGs.
- `node /workspace/scratch/daf8d241531b/check-cicada-preservation.cjs`: PASS, unchanged 1,280 prior PNGs, 1,280 routes, 1,280 emitted SVG accent strings, and 128 prior placement values. Independently confirmed the helper's baseline JavaScript copy exactly equals the Git baseline.
- Direct Sharp/raw-alpha inspection: all eighty final nontransparent bounds exactly equal their stage's original bounds.
- Direct structure/baseline checks: 136 placement rows total, eight new face centers exactly match the original-observed cicada anchors, and all 81 selected corrections remain unchanged byte-for-byte in their JSON.
- Diff inspection shows normal character assets and shared expression CSS unchanged. Runtime production changes are limited to cicada allowlisting, eight new placement rows, and the expression script cache reference. Integration additions cover preview, gallery, labels, geometry enumeration, and tests; gameplay, romance, and save implementations are not changed.
- Root reports the completed independent geometry run checked 1,360 marks and 816 sweat envelopes with zero issues. This reviewer did not duplicate that run. Visual examination independently found no mark/sprite collision.

## Visual assessment of all eighty composites

The three orange underground nymph stages retain distinct size/pose/segment progression. Stage 04 retains its emergence pose and surrounding dirt. Stage 05 keeps the living green cicada above the brown shed shell; expressions are on the upper living face, while the lower shell remains recognizable and visually intact. Stages 06–08 preserve green, olive/gold, and aged gray/brown identities with veined wings and visible leg structures.

Happy, strained, hungry, sick, tired, sulky, weak, critical, wantsPlay, and sleeping combinations remain distinguishable. Open eager eyes/mouths, lowered tired/weak lids, critical distress, and relaxed closed sleeping faces remain associated with the original head positions. Marks retain the established shared semantic artwork and colors, including the shared yellow fish hunger mark. No mark obscures a face, antenna, wing, or visible body pixel in the reviewed composites. Sick indicators remain clear of the sprites, with the more elevated arrangements around tall nymph antennae reflected in the generated placements.

These are static two-times contact sheets, not device screenshots. Visual review does not independently establish browser viewport clipping or every animation frame; the separately reported envelope check complements the static assessment. No live Site/browser behavior is claimed here.

## Integration and code quality

The implementation follows the existing staged routing/preview architecture. All eight stages route all ten expressions; normal/unknown requests retain their base portrait. Canonical names match character-world-master.v1.js. Existing unsupported fixtures were moved to canonical antlion, which remains outside expression routing. Runtime tests cover all eighty combinations, reaction rendering, critical priority over happy, and rendering without state mutation. Asset gates cover distinctness, alpha and original bounds.

The earlier independent integration review inspected 26 targeted green passes and 338 expression-unit passes following the 26-test red phase. Root's full npm runs have not been duplicated or interrupted by this reviewer. The initial final-assembly run finished with 1,337 tests: 1,336 passes, one failure, zero cancellations/skips/todos, 511464.281737 ms. The inspected failure is `tests/quick-mode-test.cjs:57`, `solving dodge counts` (actual 0/20, expected 1/20). The unchanged Quick test file then passed all ten tests, zero failures/cancellations/skips/todos, 1615.687604 ms. The full rerun log was then independently inspected: all 1,337 tests passed, zero failures/cancellations/skips/todos, 507497.37217 ms. Both the initial failure and successful unchanged reruns remain recorded; no game/test/seed change is claimed as a fix.

The production cache dependency found in the Site-preparation review is now resolved in source: index.html references `pet-expression.js?v=20260917-5a78c2c5`, replacing the old stagbeetle token. Root reports the prepared Site now consumes that source. No additional production revision is requested.

## Documentation and delivery status

The updated `docs/qa/cicada-expressions-20260918.md` now records all eighty portraits, the corrected gallery fonts, preservation evidence, the initial full-test failure and targeted recheck, and remote preparation distinctly from publication. Root reports Site version 54 saved but not deployed; version 53 remains published. Final publication and completion saving are not independently established by this review.

Branch identity must remain precise: root reports branches/main, git/ref/heads/main, commits/main and git ls-remote all identify actual main as `f23398e43eed952d49d5a2b805789a4c87b2b1bd`. PR base metadata instead returns `3f4bfda0b8c0d30098ebb68c4313abd370a8576a`; that metadata is not the actual live main ref. This reviewer did not perform remote calls, and neither main nor PR state was changed by this review.

Outstanding at this review snapshot:

The final full-regression gate is now satisfied by the successful 1,337-test rerun. Root reports independent single-art review passed all eighty portraits across four twenty-image reviews; this reviewer independently inspected the eighty marked composites.

1. Publish and verify the prepared same owner-private Site, then finish GitHub saving/verification while retaining Draft PR 278 and leaving main unmerged.
2. Ensure all new files and provenance intended for remote retention are saved; successful local hashes do not prove remote persistence.

Only this review document was written. No art/code edits, commits, pushes, Site/GitHub mutations, subagents, or duplicate full npm tests were performed by this reviewer.
