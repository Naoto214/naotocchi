# Face-relative mark placement QA — 2026-09-16

Baseline PR #278 HEAD: `06cae52580b1543b21543540de8bdfd9df029ea5`. All existing expression PNGs retained byte-for-byte; no CSS, color, outline, reaction, gameplay or save changes.

Implemented the latest user-approved face-relative policy across cat/dog/man/woman, eight stages each and ten expressions each. Observed face anchors live in `tools/expression-face-anchors.json`; `tools/place-expression-marks.cjs` emits the runtime placement table using silhouette collision checks and two logical pixels of clearance. Sweats bracket the head and account for their rotated shape and complete falling motion. Unsupported species retain the existing layout.

Validation:
- `npm test`: 824 passed, zero failed.
- `tools/check-expression-placement.cjs`: 320 mark cases and 192 sweat envelopes (32 stages × three sizes × two sides), zero issues; also checks sick lines against sweat.
- All eight overview sheets (320 composites) visually reviewed after final generation.
- Independent code review: no actionable findings.
- `git diff --check`: clean.

Regenerate with `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node tools/place-expression-marks.cjs`, then run the checker and tests. Generate comparison sheets with `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node tools/expression-review-gallery.cjs OUTPUT_DIR`.

The sheets combine production expression assets and mark SVG/CSS placement. They are static composites, not device screenshots; animated sweat is approximated. Device backgrounds, animation timing and browser scaling can still affect perception. Future changes should reuse the same placement and collision checks, with visual review focused on exceptions. PR remains Draft; no main merge.
