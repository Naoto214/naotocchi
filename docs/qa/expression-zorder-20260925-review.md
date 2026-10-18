# Independent review: expression mark z-order

Result: no material issues found in the proposed minimal change. Read-only review of the repository working diff; no browser rendering was performed.

## Scope

The tracked diff changes exactly three files: `pet-expression.css:4` changes z-index 1 to 4; `index.html:16` changes only that stylesheet cache token; `tests/pet-expression-test.cjs:509–522` adds one regression test. No JavaScript, asset, positioning, dimensions, colors, shape, animation, expression resolution, or excluded character work changes.

## Paint-order analysis

`script.js:11241–11245` renders body image, emoji fallback, and the one supplied accent inside `.character-visual`. `script.js:11271–11282` resolves one expression, obtains one accent, and supplies it to that renderer; this code is unchanged. `pet-expression.js:374–389` emits a single accent wrapper for a supported selected expression.

The wrapper has `position:relative` but no z-index or other stacking-context trigger (`style.css:3639–3646`). The applicable home override only sets dimensions/font size (`ui.css:80`). The body is positioned with automatic z-index (`ui.css:83`). Both illness pseudo-elements share positioned z-index 3 (`care-attention.css:37–45`). The accent is positioned at z-index 4 (`pet-expression.css:1–9`). Consequently, the accent participates in the same ancestor stacking context as the sweat rather than being trapped inside a lower wrapper context: body, sweat, selected accent is the resulting relative order.

The shared cast transform/isolation (`ui.css:68–70`) contains all these layers together. Filters applied to `#petSprite` during reactions (`ui.css:93–97`) likewise contain both its sweat and accent together. They do not reverse their internal order. Egg warming transforms the inner wrapper, but `accentFor` excludes egg assets; the newborn animation transforms the body/fallback rather than the accent wrapper (`egg-hatching.css:3–20`). Movie wrapper effects target movie actors, not the home protagonist.

The selector is shared, but the actual accent is supplied in the home protagonist rendering path. No additional applicable layer with z-index 2–4 was found that would introduce an unintended relative-order change. Existing geometry and pointer-events remain unchanged.

## Regression test

The new test verifies positive sweat order, mark greater than sweat, and absence of three common stacking-context triggers in the current base visual-wrapper rule. The focused command `node --test --test-name-pattern='selected expression mark paints' tests/pet-expression-test.cjs` passed.

This is a source-level regression guard, not a computed-style or pixel test. Its regex reads only the first matching declaration block and checks only some possible stacking-context properties; it would not detect every future cascade override, opacity/filter/contain change, or render-tree change. Independent inspection of the current full applicable styles and renderer resolves those limitations for this narrowly scoped patch. No additional test is necessary for the present change. Keep any completion claim explicit that browser visual verification was not performed by this reviewer.

## Final QA/source consistency review

Reviewed the adoption QA, verification JSON, runtime JSON, canon addendum, historical-QA pointer, and implementation plan after the evidence update. No material contradiction or scope-clearance issue found. Production change remains the same CSS value/cache reference/test addition; added QA artifacts are evidence only.

The JSON contains 346 unique numbered key/state cases, all with `equal:true`; 346 × 3 sizes × 5 sampled conditions = 5,190 pairs. All 17 listed old-borderline IDs map exactly to the character/stage names in the QA, all `strained`. The runtime JSON contains 35 rows, maximum one mark, and explicitly identifies a state/DOM/clock harness without browser CSS or screenshot validation. The QA and canon explicitly describe offline composites, sampled-phase limitations, representative-expression semantics (not a medical severity ranking), and retention of unrelated character/mark work and total-completion holds.

The QA appropriately leaves the full test result pending. Replace `docs/qa/expression-zorder-20260925.md:56` and update plan checkboxes only once that run and final diff verification actually finish. No tests were rerun in this final documentation review. This review checks evidence-file/source consistency; it does not independently reproduce the root agent’s layer hashes, raw-pixel comparisons, or visual classifications.

Minor wording precision only: `docs/superpowers/plans/2026-09-25-expression-zorder.md:30` describes rejecting a visual-wrapper stacking context generally; the implementation specifically guards z-index, isolation, and transform in the first base wrapper block. The detailed QA and this report already state the source-test limitation. Wording such as “guards three common stacking-context declarations in the base wrapper rule” would be more exact but does not block the patch.
