# Expression z-order implementation plan

> **For agentic workers:** Use superpowers:executing-plans for this single minimal task. The user has explicitly approved implementation, verification and GitHub saving; no further design approval is required.

**Goal:** Adopt body → illness sweat → resolver-selected state mark.
**Architecture:** Change only the accent layer's z-index from 1 to 4; preserve sweat at 3. Refresh only that stylesheet's cache token. No resolver, image or placement changes.
**Tech Stack:** Static CSS, existing Node test runner and runtime harness.
**Spec:** User approval on 2026-09-25; `docs/qa/emotion-visual-approved-baseline-20260915.md` adoption addendum.

## Constraints and review focus

- Only the existing 346 overlap candidates; no full image re-audit or regeneration.
- All positions, sizes, colors, SVG paths, animation, images and resolver priorities stay unchanged.
- Wrapper stacking context: inspect production ancestry and guard relative layer order in the existing expression test file.
- Illness plus sleep/life/transient reactions: rerun the saved 35-observation runtime probe; require at most one mark and identical output.
- Old17 boundaries and one-sided sweat masking: require all5190 sampled composites to equal approved B and re-view the17 and representative controls.
- Cached stylesheet: update only `pet-expression.css` token and run asset reference tests.
- Unrelated changes: compare all baseline blobs; run related/full tests and diff checks.

## Single task

- [x] Verify PR278 head, actual main and a clean isolated baseline tree.
- [x] Add relative layer test to `tests/pet-expression-test.cjs`; confirm failure because mark1 < sweat3.
- [x] Set `pet-expression.css` accent z-index4. Update only its `index.html` cache token.
- [x] Rerun the regression and targeted runtime/related checks.
- [x] Finish full `npm test`, approved-B composite equality and independent review.
- [x] Update adoption canon and QA, verify preservation and `git diff --check`.
- Save one scoped GitHub commit and synchronize PR body; the post-save receipt in PR278 records HEAD/tree/CI and Draft/open/unmerged (cannot self-record this commit SHA before creation).

The node test reads production accent/sweat rules and asserts sweat > body and mark > sweat. It also guards three common visual-wrapper stacking-context declarations; this is not exhaustive CSS cascade analysis. Independent review checks the current applicable ancestry and rules. The required regression command is `node --test --test-name-pattern='selected expression mark paints' tests/pet-expression-test.cjs`.
